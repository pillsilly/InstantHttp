console.log('usage: ./httpoutofthebox.exe --port=9092 --dir=theAbsolutePathWhereYourHtmlIs');
const process = require('process');
const param = argsToParam();
console.log(`args: ${JSON.stringify(param)}`);
require('./run')(param);

function argsToParam() {
    return process.argv.slice(2).reduce((obj, str) => {
        const [key, value] = str.replace('--', '').split('=');
        obj[key] = value;
        return obj;
    }, {})
}

