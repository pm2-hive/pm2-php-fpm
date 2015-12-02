# pm2-php-fpm

PHP-FPM module for [Keymetrics][keymetrics]

![pm2-php-fpm screenshot](https://raw.githubusercontent.com/pm2-hive/pm2-php-fpm/master/screenshot.png)

## Description

This module monitors following PHP-FPM metrics:
  - uptime;
  - number of connections since start;
  - average request:
    - duration;
    - CPU usage;
    - memory consumption.
  - active and idle proccesses count;
  - connection queue size;
  - child processes limit hits;
  - slow processes count.


## Requirements

This module reqires PHP-FPM and [PM2][pm2] to be installed. Also it may require you to edit PHP-FPM configs to enable status page. Make sure your user has privileges to access PHP-FPM socket.


## Installation

```bash
pm2 install pm2-php-fpm
```


## Configuration

Default settings:
  - `fcgi_path` is `/var/run/php5-fpm.sock`;
  - `endpoint` is `/status`;
  - `interval` is `1000` milliseconds.

To modify the config values you can use [Keymetrics][keymetrics] dashboard or the following commands:

```bash
pm2 set pm2-php-fpm:fcgi_path /var/run/custom-php-socket.sock
pm2 set pm2-php-fpm:endpoint /health
pm2 set pm2-php-fpm:interval 5000
```

You may use TCP port instead of UNIX socket:

```bash
pm2 set pm2-php-fpm:fcgi_host 127.0.0.1
pm2 set pm2-php-fpm:fcgi_port 9000
```


## Troubleshooting

### `Cannot connect to PHP-FPM` error

Check module configuration. Make sure that path or host and port are the ones you have in PHP-FPM config. Also this error may appear when your PHP-FPM instance is overloaded or stopped unexpectedly.


### `PHP-FPM status endpoint not found` error

You’ve entered wrong endpoint. Or changed its name in PHP-FPM configuration recently and didn’t update module settings.


### `Access to PHP-FPM denied` error

User running PM2 daemon has no rights to access PHP-FPM socket. You need to add your user to group owning socket. Find out its name in PHP-FPM pool config or use `stat -c %G /path/to/php5-fpm.sock`

Add your user (e.g. `myuser`) to target group (e.g. `www-data`): `sudo usermod -a -G www-data myuser`

Reconnect to your server and restart PM2 daemon: `pm2 update`


### Other

Look through [Issues][issues]. You may find someone with the same problem. If your problem is unique, feel free to create a [new issue][new-issue].


## Uninstallation

```bash
pm2 uninstall pm2-php-fpm
```


## License

MIT


[issues]: https://github.com/pm2-hive/pm2-php-fpm/issues
[keymetrics]: https://keymetrics.io/
[new-issue]: https://github.com/pm2-hive/pm2-php-fpm/issues/new
[pm2]: https://github.com/Unitech/pm2
