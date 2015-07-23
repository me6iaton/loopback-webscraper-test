var _ = require('lodash');

/**
 * handle Record before create
 * @param {Object} ctx
 * @param {Object} ctx.instance
 * @param {Object} record
 * @returns {{connector: *, url: *, created: (*|Date), data: *}}
 */
var handleRecordBeforeCreate = function(ctx, record){
  return {
    connector: ctx.instance.id,
    url: record.url,
    created: record.created,
    data: record
  }
};

module.exports = function(app) {

  // Connector hook create Records after fetch and scrape url.
  app.models.Connector.afterRemote('prototype.scrapeAndCreateRecords', function(ctx, results, next){
    if (!results) return next();
    results.forEach(function(record, index, results){
      results[index] = handleRecordBeforeCreate(ctx, record)
    });
    app.models.Record.create(results, function(err){
      if (err){
        console.error(err);
        next(err);
      }
      next();
    });
  });

  // Connector hook update or create Records after fetch and scrape url.
  app.models.Connector.afterRemote('prototype.scrapeAndUpdateOrCreateRecords', function(ctx, results, next){
    var records,
    jobs = [];
    app.models.Record.find({where: {connector: ctx.instance.id}})
    .then(function(instances){
      records = instances;
    })
    .then(function(){
      for (var result of results) {
        var record = _.find(records, 'url', result.url);
        if(record){
          delete result.created;
          jobs.push(record.updateAttributes({data: _.assign(record.__data.data, result)}));
        }else{
          jobs.push(app.models.Record.create(handleRecordBeforeCreate(ctx, result)))
        }
      }
      return Promise.all(jobs);
    })
    .then(function(){
      next()
    })
    .catch(function(err){
      next(err);
      console.error(err)
    })
  });

};
