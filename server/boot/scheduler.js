var CronJob = require('cron').CronJob;

module.exports = function(app) {

  var jobs = [];

  // get all connectors, create fetching cron jobs, save then in array and start if active.
  app.models.Connector.find(function(err, connectors){
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
          start: false
        });
        jobs[connector.id] = job;
        if (connector.active === true){
          job.start();
          console.log('fetching job with id '+connector.id+' start');
        }
      }
    }
  });

  // scheduler after save hook - stop or start fetching jobs after active property change
  app.models.Connector.observe('after save', function(ctx, next) {
    if(ctx.instance.active === true){
      jobs[ctx.instance.id].start();
      console.log('fetching job with id '+ctx.instance.id+' start');
    } else if (ctx.instance.active === false){
      jobs[ctx.instance.id].stop();
      console.log('fetching job with id '+ctx.instance.id+' stop');
    }
    next();
  });



};

