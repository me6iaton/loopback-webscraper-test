var osmosis = require('osmosis');

module.exports = function(Connector) {

  Connector.fetch = function (connectorId, cb){
    Connector.findById( connectorId, function (err, instance) {
      var response = [];
      var scraper = osmosis.get(instance.url);

      for (var item of instance.chainScraping){
        var action = Object.keys(item)[0];
        scraper = scraper[action](item[action]);
      }

      scraper
        .error(function(msg){
          throw msg
        })
        .data(function(data) {
          response.push(data);
        })
        .done(function(){
          cb(null, response)
        });

    });
  };

  Connector.remoteMethod (
  'fetch',
  {
    http: {path: '/fetch', verb: 'get'},
    accepts: {arg: 'id', type: 'number', required: true, http: { source: 'query' } },
    returns: {arg: 'response', type: 'array', root: true}
  });
};

