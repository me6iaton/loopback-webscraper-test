var CronJob = require('cron').CronJob;

module.exports = function(app) {
  var jobMap = new WeakMap();
  app.models.Connector.find({}, function(err, connectors){
    if(err) console.error(err);
    for (var connector of connectors){
      if (connector.schedule){
        var job = new CronJob({
          cronTime: connector.schedule,
          onTick: function() {
            this.fetch(function(err, results){
              console.log('shedule tick!');
              console.log(results);
            });

          },
          context: connector,
          start: true
        });
        jobMap.set(connector,job);
      }
    }
  })
};
