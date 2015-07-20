var osmosis = require('osmosis');

module.exports = function(Connector) {

  // fetch data from url, scraper and follow to link recursive
  // see https://github.com/rc0x03/node-osmosis
  Connector.fetch = function (connectorId, cb){
    Connector.findById( connectorId, function (err, instance) {
      if (err){
        console.error(err);
        return
      }

      var results = [],
      // build promise chain from chainScraping prop in Connector inst
      // see https://github.com/rc0x03/node-osmosis
      scraper = osmosis.get(instance.url);
      for (var item of instance.chainScraping){
        var action = Object.keys(item)[0];
        scraper = scraper[action](item[action]);
        scraper = skipAlreadyScrapedData(instance, scraper, action)
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
          cb(null, results)
        });
    });

    // do not fetch already stored data
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
  };

  Connector.remoteMethod (
  'fetch',
  {
    http: {path: '/fetch', verb: 'get'},
    accepts: {arg: 'id', type: 'number', required: true, http: { source: 'query' } },
    returns: {arg: 'response', type: 'array', root: true}
  });
};

