module.exports = function(app) {

  // store data after fetch and scraper url.
  app.models.Connector.afterRemote('prototype.fetch', function(ctx, results, next){
    if (!results) return next();
    var records = [];
    for (var item of results){
      records.push({
        connector: ctx.instance.id,
        url: item.url,
        created: item.created,
        data: item
      })
    }
    app.models.Record.upsert(records, function(err){
      if (err){
        console.error(err);
        next(err);
      }
      next();
    });
  });

};
