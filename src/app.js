import 'babel/polyfill';
import pmx from 'pmx';
import Monitor from './monitor';
import Reporter from './reporter';

pmx.initModule({
  pid: pmx.resolvePidPaths(['/var/run/php5-fpm.pid']),
  widget: {
    logo: 'https://cloud.githubusercontent.com/assets/1751980/10219857/3915e4b4-684b-11e5-8f5f-43ba320b21b8.png',
    theme: ['#18212F', '#0E131C', '#6082BB', '#48618C'],
    el: {
      probes: true,
      actions: true,
    },
    block: {
      actions: false,
      issues: true,
      meta: true,
      main_probes: [
        'Uptime',
        'Avg Req Duration',
        'Avg Req CPU',
        'Avg Req Memory',
        'Active Processes',
        'Idle Processes',
      ],
    },
  },
}, (err, conf) => {
  if (err) {
    pmx.notify(err);
  }

  const monitor = new Monitor(conf);
  const reporter = new Reporter(conf);

  // Init metrics refresh loop
  monitor.start((err, data) => {
    if (err) {
      pmx.notify(err);
    }

    reporter.refresh(data);
  });
});
