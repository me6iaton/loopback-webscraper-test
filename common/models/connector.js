var osmosis = require('osmosis');

module.exports = function(Connector) {

  // fetch data from url, scraper and follow to link recursive
  // see https://github.com/rc0x03/node-osmosis
  Connector.prototype.fetch = function (cb){
    var self = this;
    // first get last record date for already stored check
    Connector.app.models.Record.findOne({order: 'created DESC', where: {connector: self.id}}, function(err, record){
      if(err) return console.error(err);
      var results = [],
      scraper = osmosis.get(self.url);
      // build promise chain from chainScraping property in Connector instance
      // see https://github.com/rc0x03/node-osmosis
      for (var item of self.chainScraping){
        var action = Object.keys(item)[0];
        scraper = scraper[action](item[action]);
        // do not fetch already stored data
        scraper = skipAlreadyScrapedData(self, record, scraper, action)
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
    });

    // filter scraped data
    var skipAlreadyScrapedData = (function(){
      var firstSetFlag = false,
      skipDataFlag = false,
      created = Date.now();
      return function(connector, record, scraper, action){
        // for first time
        if(!record) record = {url: null};

        // waiting first set command in chain, and filter func only this level
        if(action == 'set' && !firstSetFlag){
          firstSetFlag = true;
          scraper = scraper.then(function(context, data, next) {
            // set created date for sorting
            created = created - 1;
            data.created = new Date(created);
            // find first data already stored
            if(data.url === record.url){
              skipDataFlag = true;
            }
            if(!skipDataFlag){
              next(context, data);
            }else{
              next(null);
            }
          })
        }
        return scraper
      };
    })();

  };

  Connector.remoteMethod (
  'fetch',
  {
    isStatic: false,
    http: {path:'/fetch', verb: 'get'},
    returns: {arg: 'results', type: 'array', root: true}
  });
};

