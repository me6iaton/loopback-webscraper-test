module.exports = function(app) {

  // store data after fetch and scraper url.
  app.models.Connector.afterRemote('prototype.fetch', function(ctx, results, next){
    if (!results) return next();
    var records = [];
    var date =  new Date();
    for (var item of results){
      records.push({
        connector: ctx.instance.id,
        created: date,
        data: item
      })
    }
    app.models.Record.create(records, function(err){
      if (err)
        next(err);
      next();
    });
  });

};
