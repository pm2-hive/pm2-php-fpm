import { Socket } from 'net';
import fastcgi, { writer as Writer, parser as Parser } from 'fastcgi-parser';
import { merge } from 'ramda';

const FCGI_BEGIN = fastcgi.constants.record.FCGI_BEGIN;
const FCGI_STDOUT = fastcgi.constants.record.FCGI_STDOUT;
const FCGI_PARAMS = fastcgi.constants.record.FCGI_PARAMS;

export default class Stats {
  constructor(options = {}) {
    this.options = {
      fcgi: {
        path: options.fcgi_path || '/var/run/php5-fpm.sock',
        host: options.fcgi_host,
        port: options.fcgi_port,
      },
      endpoint: options.endpoint || '/status',
      interval: options.interval || 1000,
    };
    this.getBody = this.getBody.bind(this);
    this.headerGenerator = this.headerGenerator.bind(this);
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);

    return {
      start: this.start,
      stop: this.stop,
    };
  }

  * headerGenerator(options) {
    const header = {
      version: fastcgi.constants.version,
      type: FCGI_BEGIN,
      recordId: 0,
      contentLength: 0,
      paddingLength: 0,
    };

    yield merge(header, {
      type: FCGI_BEGIN,
      contentLength: 8,
    });

    yield merge(header, {
      type: FCGI_PARAMS,
      contentLength: fastcgi.getParamLength(options.params),
    });

    yield merge(header, {
      type: FCGI_STDOUT,
    });
  }

  start(cb) {
    if (typeof cb !== 'function') {
      throw new Error('No callback given');
    }

    const FCGI_RESPONDER = fastcgi.constants.role.FCGI_RESPONDER;

    const params = [
      ['SCRIPT_NAME', this.options.endpoint],
      ['SCRIPT_FILENAME', this.options.endpoint],
      ['QUERY_STRING', 'json&full'],
      ['REQUEST_METHOD', 'GET'],
    ];

    this.fpm = new Socket();
    this.fpm.writer = new Writer();
    this.fpm.parser = new Parser();

    this.fpm.on('connect', () => {
      const header = this.headerGenerator({ params });

      this.fpm.writer.writeHeader(header.next().value);
      this.fpm.writer.writeBegin({ role: FCGI_RESPONDER, flags: 0 });
      this.fpm.write(this.fpm.writer.tobuffer());

      this.fpm.writer.writeHeader(header.next().value);
      this.fpm.writer.writeParams(params);
      this.fpm.write(this.fpm.writer.tobuffer());

      this.fpm.writer.writeHeader(header.next().value);
      this.fpm.end(this.fpm.writer.tobuffer());
    });

    this.fpm.on('data', data => {
      this.fpm.parser.execute(data);
    });

    this.fpm.on('error', err => {
      if (err.code === 'ECONNREFUSED') {
        return cb(new Error('Cannot connect to PHP-FPM'));
      }
      if (err.code === 'EACCES') {
        return cb(new Error('Access to PHP-FPM denied'));
      }
      cb(err);
    });

    this.fpm.parser.onRecord = record => {
      if (record.header.type === FCGI_STDOUT) {
        const body = this.getBody(record.body);

        try {
          const output = JSON.parse(body);
          cb(null, output);
        } catch (err) {
          if (body && body.trim() === 'File not found.') {
            const err = new Error('PHP-FPM status endpoint not found');
            return cb(err);
          }

          // Normally we don’t show the body as an error message
          // This would be some unknown and not user-friendly error
          // Feel free to report an issue:
          // https://github.com/pm2-hive/pm2-php-fpm/issues/new
          cb(body);
        }
      }
    };

    this.intervalId = setInterval(() =>
      this.fpm.connect(this.options.fcgi), this.options.interval);
  }

  stop() {
    if (!this.intervalId) {
      return;
    }
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  getBody(input) {
    const body = input.split('\r\n\r\n')[1];
    try {
      JSON.parse(body);
    } catch (err) {
      return body;
    }
    // "some key name" → "someKeyName"
    return body.replace(/\s(.)/g, (match, group) =>
      group.toUpperCase());
  }
}
