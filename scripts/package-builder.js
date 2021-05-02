var fs = require('fs');
var networks = require('../networks');
var rouletteJSON = JSON.parse(fs.readFileSync('./build/contracts/Roulette.json', 'utf8'));

if(!fs.existsSync('dist')) fs.mkdirSync('dist');
fs.writeFileSync('./dist/index.js', `
  module.exports = {
    'abi': ${JSON.stringify(rouletteJSON.abi)},
    'compiler': ${JSON.stringify(rouletteJSON.compiler)},
    'networks': ${JSON.stringify(networks)},
  };
`);