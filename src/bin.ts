#!/usr/bin/env node

import { MODE, run } from './run';
import { Command } from 'commander';

import pkgJson from '../package.json';

export function getOptions (): any {
  const program = new Command();
  program
    .name('instant_http ')
    .version(pkgJson.version)
    .allowUnknownOption()
    .allowExcessArguments(true)
    .usage('[global options]')
    .option(
      '-p, --port [port]',
      'To point which port to use as the server address.',
      '9090'
    )
    .option('-d, --dir [dir]', 'Dir to serve', process.cwd())
    .option(
      '-t, --proxyTarget [proxyTarget]',
      'Where the delegated communication targets to'
    )
    .option(
      '-P, --proxyPattern [proxyPattern]',
      'URL matcher to be used to identify which url to proxy'
    )
    .option('-m, --mode [mode]', 'Which mode to use', MODE.NORMAL)
    .option(
      '-i, --indexFile [indexFile]',
      'Index File location (relative to --dir)',
      'index.html'
    )
    .option(
      '-q, --quiet [quiet]',
      'Set it to false to see more debug outputs',
      false
    );

  // Parse only args from node onwards, skip jest-specific args
  program.parse(process.argv, { from: 'user' });
  const opts = program.opts();
  console.info(opts);
  return opts;
}

run(getOptions());
