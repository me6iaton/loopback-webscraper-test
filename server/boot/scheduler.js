var CronJob = require('cron').CronJob;

module.exports = function(app) {

  // array for store all jobs in memory
  var jobs = [];

  /**
   * add new job for periodic ScrapeAndCreateRecords
   * @param {Object} connector
   */
  var addScrapeAndCreateRecordsJob = function(connector) {
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
  };

  // at the startup app
  // get all connectors, create cron jobs, save then in array and start if active.
  app.models.Connector.find(function(err, connectors){
    if(err) return console.error(err);
    for (var connector of connectors){
      addScrapeAndCreateRecordsJob(connector)
    }
  });

  // Connector after save hook - stop or start cron jobs after active property change
  app.models.Connector.observe('after save', function(ctx, next) {
    if (jobs[ctx.instance.id]) {
      if(ctx.instance.active === true){
        jobs[ctx.instance.id].start();
        console.log('Start scraper scheduler with connector id ' + ctx.instance.id);
      } else if (ctx.instance.active === false){
        jobs[ctx.instance.id].stop();
        console.log('Stop scraper scheduler with connector id ' + ctx.instance.id);
      }
    } else {
      // start new job after create new Connector
      addScrapeAndCreateRecordsJob(ctx.instance)
    }
    next();
  });

  // Connector before delete hook - delete schedule job before delete Connector instance
  app.models.Connector.observe('before delete', function(ctx, next) {
    if (!ctx.where.id){
      next(new Error('Bulk delete is not supported, see http://docs.strongloop.com/display/public/LB/Operation+hooks/#Operationhooks-beforedelete'));
    }
    jobs[ctx.where.id].stop();
    delete jobs[ctx.where.id];
    console.log('delete scraper scheduler with connector id ' + ctx.where.id);
    next();
  });

};

