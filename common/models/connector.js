var osmosis = require('osmosis');

/**
 * build promise chain for scraping from chainScraping property in Connector instance
 * see https://github.com/rc0x03/node-osmosis
 * fetch data from url, scraped and follow to links
 * @param ctx context
 * @param {Object} ctx.connector Connector instance
 * @param {Object} [ctx.record] Record instance
 * @param cb callback
 */
var scrape = function(ctx, cb){
  var connector = ctx.connector;
  var results = [],
  handleScrapData = handleScrapDataConstructor(ctx),
  scraper = osmosis.get(connector.url);
  // build promise chain from chainScraping property in Connector instance
  // see https://github.com/rc0x03/node-osmosis
  for (var item of connector.chainScraping){
    var action = Object.keys(item)[0];
    scraper = scraper[action](item[action]);
    scraper = handleScrapData(scraper, action)
  }
  scraper
  .error(function(msg){
    console.error(msg)
  })
  .data(function(data) {
    results.push(data);
  })
  .done(function(){
    // sort results by published field, because follow command performed concurrency
    // set scraper.config('concurrency', 1) for disable this
    results.sort(function(a,b){
      return new Date(b.created) - new Date(a.created);
    });
    if (cb) cb(null, results);
  });
};

/**
 * Constructor handleScrapData, run before fetch crawl links
 * created date for sorting after concurrency crawl and prevent crawl already stored links
 * @param ctx
 * @param {Object} [ctx.record] first Record instance {order: 'created DESC', where: {connector: connector.id}
 * @returns {Function}
 */
var handleScrapDataConstructor = function(ctx){
  var firstSetFlag = false,
  skipDataFlag = false,
  created = Date.now(),
  record;

  if(ctx.record)
    // skip fetching already stored data, filter by last stored record
    record = ctx.record;
  else
    // don't skip fetching for all data if scrape run first time or update stored data
    record = {url: null};

  /**
   * @param {Object} scraper
   * @param {string} action
   */
  return function(scraper, action){

    // waiting first "set" command in chain, and run filter function only this level in chain
    if(action == 'set' && !firstSetFlag){
      firstSetFlag = true;
      scraper = scraper.then(function(context, data, next) {

        // set created date for sorting and find last stored record
        created = created - 1;
        data.created = new Date(created);

        // not fetch already stored data
        if(data.url === record.url){
          skipDataFlag = true
        }
        if(skipDataFlag){
          next(null)
        }else{
          next(context, data)
        }

      })
    }
    return scraper
  };
};

module.exports = function(Connector) {

  /**
   * scrapeAndCreateRecords
   * @param cb
   */
  Connector.prototype.scrapeAndCreateRecords = function (cb){
    var connector = this;
    // first get last record, not fetch already stored data check
    Connector.app.models.Record.findOne({order: 'created DESC', where: {connector: connector.id}}, function(err, record){
      if(err) return console.error(err);
      scrape({connector: connector, record: record}, cb);
    });
  };

  /**
   *  scrapeAndUpdateOrCreateRecords
   * @param cb callback
   */
  Connector.prototype.scrapeAndUpdateOrCreateRecords = function (cb){
    scrape({connector: this}, cb);
  };

  Connector.remoteMethod (
  'scrapeAndCreateRecords',
  {
    isStatic: false,
    http: {path:'/scrape', verb: 'post'},
    returns: {arg: 'results', type: 'array', root: true}
  });

  Connector.remoteMethod (
  'scrapeAndUpdateOrCreateRecords',
  {
    isStatic: false,
    http: {path:'/scrape', verb: 'put'},
    returns: {arg: 'results', type: 'array', root: true}
  });
};

