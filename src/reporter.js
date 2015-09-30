import pmx from 'pmx';
import moment from 'moment';

const NOT_AVAILABLE = 'N/A';

export default class Reporter {
  constructor() {
    this.init = this.init.bind(this);
    this.refresh = this.refresh.bind(this);
    this.setMetric = this.setMetric.bind(this);

    this.metrics = {};
    this.probe = pmx.probe();

    this.init();

    return {
      refresh: this.refresh,
    };
  }

  init() {
    this.metrics.slowProcs = this.probe.metric({
      name: 'Slow Processes',
      value: 'N/A',
      alert: {
        mode: 'threshold',
        value: 0,
        cmp: '=',
        msg: 'Non-zero number of slow processes. Check your logs for details.',
      },
    });

    this.metrics.maxChildren = this.probe.metric({
      name: 'Children Limit',
      value: 'N/A',
      alert: {
        mode: 'threshold',
        value: 0,
        cmp: '=',
        msg: 'Non-zero number of child processes limit hits. Consider increasing number of processes FPM can spawn.',
      },
    });

    this.metrics.connQueue = this.probe.metric({
      name: 'Conn Queue',
      value: 'N/A',
      alert: {
        mode: 'threshold',
        value: 0,
        cmp: '=',
        msg: 'Non-zero number of requests in the queue of pending connections. Consider increasing number of processes FPM can spawn.',
      },
    });

    this.metrics.requestMem = this.probe.metric({
      name: 'Avg Req Memory',
    });

    this.metrics.requestCpu = this.probe.metric({
      name: 'Avg Req CPU',
    });

    this.metrics.requestDuration = this.probe.metric({
      name: 'Avg Req Duration',
    });

    this.metrics.idleProcesses = this.probe.metric({
      name: 'Idle Processes',
      value: 'N/A',
    });

    this.metrics.activeProcesses = this.probe.metric({
      name: 'Active Processes',
      value: 'N/A',
    });

    this.metrics.acceptedConn = this.probe.metric({
      name: 'Σ Connections',
      value: 'N/A',
    });

    this.metrics.startSince = this.probe.metric({
      name: 'Uptime',
      value: 'N/A',
    });
  }

  refresh(data) {
    this.metrics.startSince.set((uptime => {
      const value = parseFloat(String(uptime));
      if (Number.isNaN(value)) return NOT_AVAILABLE;
      return moment().second(value).toNow(true);
    })(data.startSince));
    this.setMetric({
      type: 'metric',
      name: 'acceptedConn',
      data: data.acceptedConn,
    });
    this.setMetric({
      type: 'metric',
      name: 'activeProcesses',
      data: data.activeProcesses,
    });
    this.setMetric({
      type: 'metric',
      name: 'idleProcesses',
      data: data.idleProcesses,
    });
    this.setMetric({
      type: 'metric',
      name: 'requestDuration',
      data: data.processes.reduce((sum, process) => {
        return sum + parseFloat(process.requestDuration);
      }, 0) / data.processes.length,
    });
    this.setMetric({
      type: 'metric',
      name: 'requestCpu',
      skipZero: true,
      data: (() => {
        const load = data.processes.reduce((sum, process) =>
          sum + parseFloat(process.lastRequestCpu), 0);
        const processes = data.processes.reduce((sum, process) =>
          sum + Number(Boolean(parseFloat(process.lastRequestCpu))), 0);
        return load / (processes || 1);
      })(),
    });
    this.setMetric({
      type: 'metric',
      name: 'requestMem',
      skipZero: true,
      data: (() => {
        const load = data.processes.reduce((sum, process) =>
        	sum + parseFloat(process.lastRequestMemory) / 1024, 0);
        const processes = data.processes.reduce((sum, process) =>
          sum + Number(Boolean(parseFloat(process.lastRequestMemory))), 0);
        return load / (processes || 1);
      })(),
    });
    this.setMetric({
      type: 'metric',
      name: 'connQueue',
      data: data.listenQueue,
    });
    this.setMetric({
      type: 'metric',
      name: 'maxChildren',
      data: data.maxChildrenReached,
    });
    this.setMetric({
      type: 'metric',
      name: 'slowProcs',
      data: data.slowRequests,
    });
  }

  setMetric({ type, name, unit, data, skipZero }) {
    const types = {
      histogram: 'update',
      metric: 'set',
    };
    const value = (data) => {
      const value = parseInt(String(data), 10);
      if (Number.isNaN(value)) return NOT_AVAILABLE;
      return unit ? value + unit : value;
    };
    if (skipZero && value === 0) return false;
    this.metrics[name][types[type]](value(data));
  }
}

