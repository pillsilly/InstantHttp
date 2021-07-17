#!/usr/bin/env node
console.log('\x1b[36m', 'Usage: ./instantHttp.exe --port=9092' +
  ' --dir=theAbsolutePathWhereYourHtmlIs \n', '\x1b[0m');
const param = argsToParam();
console.log(`args: ${JSON.stringify(param)}`);
require('./run')(param);

/**
 *
 * @return {{}}
 */
function argsToParam() {
  return process.argv.slice(2).reduce((obj, str) => {
    const [key, value] = str.replace('--', '').split('=');
    obj[key] = value;
    return obj;
  }, {});
}

