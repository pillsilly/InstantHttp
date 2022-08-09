#!/usr/bin/env node

import {MODE, run} from './run';
import {program} from 'commander';

const pkgJson = require('../package.json');

export function getOptions() {
  program
    .name('instant_http ')
    .version(pkgJson.version)
    .allowUnknownOption()
    .usage('[global options]')
    .option(
      '-p --port [port]',
      'To point which port to use as the server address.',
      '9090'
    )
    .option('-d --dir [dir]', 'Dir to serve', process.cwd())
    .option(
      '-pt --proxyTarget [proxyTarget]',
      'Where the delegated communication targets to'
    )
    .option(
      '-pp --proxyPattern [proxyPattern]',
      'URL matcher to be used to identify which url to proxy'
    )
    .option('-o --open [open]', 'Whether to open chrome automatically', false)
    .option('-m --mode [mode]', 'Which mode to use', MODE.NORMAL)
    .option(
      '-i --indexFile [indexFile]',
      'Index File location(relative to --dir)',
      'index.html'
    )
    .option(
      '-q --quiet [quiet]',
      'Set it to false to see more debug outputs',
      false
    )

    .parse(process.argv);
  const opts = program.opts() as Parameters<typeof run>[0];
  console.info(opts);
  return opts;
}

run(getOptions());
