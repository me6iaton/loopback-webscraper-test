module.exports = function(app) {

  // store data after fetch and scraper url.
  app.models.Connector.afterRemote('fetch', function(ctx, responce, next){
    var records = [];
    var date =  new Date();
    for (var item of responce){
      records.push({
        connector: ctx.args.id,
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
