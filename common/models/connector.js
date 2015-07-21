var osmosis = require('osmosis');

module.exports = function(Connector) {

  // fetch data from url, scraper and follow to link recursive
  // see https://github.com/rc0x03/node-osmosis
  Connector.prototype.fetch = function (cb){

    // filter scraped data function
    var skipAlreadyScrapedData = (function(){
      var firstSetFlag = false,
      firstRecordFlag = true,
      skipDataFlag = false,
      scrapCheckpoint = null;
      return function(connector, scraper, action){
        if(!scrapCheckpoint) scrapCheckpoint = connector.scrapCheckpoint;
        // waiting first set command in chain, and filter func only this level
        if(action == 'set' && !firstSetFlag){
          firstSetFlag = true;
          scraper = scraper.then(function(context, data, next) {
            // choice first scraped for сheckpoint
            if(JSON.stringify(data) === JSON.stringify(scrapCheckpoint)){
              skipDataFlag = true;
            }
            // update scrapCheckpoint prop in Connector instance
            if (firstRecordFlag && !skipDataFlag){
              connector.updateAttribute('scrapCheckpoint', data, function(err){
                if(err) console.error(err);
              });
              firstRecordFlag = false;
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

    var results = [],
    scraper = osmosis.get(this.url);
    // build promise chain from chainScraping property in Connector instance
    // see https://github.com/rc0x03/node-osmosis
    for (var item of this.chainScraping){
      var action = Object.keys(item)[0];
      scraper = scraper[action](item[action]);
      // do not fetch already stored data
      scraper = skipAlreadyScrapedData(this, scraper, action)
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
        if(results[0] && results[0].published){
          results.sort(function(a,b){
            return new Date(b.published) - new Date(a.published);
          });
        }
        if (cb) cb(null, results);
      });
  };

  Connector.remoteMethod (
  'fetch',
  {
    isStatic: false,
    http: {path:'/fetch', verb: 'get'},
    returns: {arg: 'results', type: 'array', root: true}
  });
};

