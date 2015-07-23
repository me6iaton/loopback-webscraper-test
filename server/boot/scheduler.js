var CronJob = require('cron').CronJob;

module.exports = function(app) {

  var jobs = [];

  // get all connectors, create cron jobs, save then in array and start if active.
  app.models.Connector.find(function(err, connectors){
    if(err) return console.error(err);
    for (var connector of connectors){
      if (connector.schedule){
        var job = new CronJob({
          cronTime: connector.schedule,
          onTick: function() {
            this.scrapeAndCreateRecords(function(err, results){
              console.log('sheduler tick!');
              console.log(results);
            });
          },
          context: connector,
          start: false
        });
        jobs[connector.id] = job;
        if (connector.active === true){
          job.start();
          console.log('Start scraper scheduler with connector id '+ connector.id);
        }
      }
    }
  });

  // Connector after save hook - stop or start cron jobs after active property change
  app.models.Connector.observe('after save', function(ctx, next) {
    if(ctx.instance.active === true){
      jobs[ctx.instance.id].start();
      console.log('Start scraper scheduler with connector id ' + ctx.instance.id);
    } else if (ctx.instance.active === false){
      jobs[ctx.instance.id].stop();
      console.log('Stop scraper scheduler with connector id ' + ctx.instance.id);
    }
    next();
  });



};

