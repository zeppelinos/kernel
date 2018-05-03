// Deploy the zeppelin OS kernel with a sample release
// Run as: `npx truffle exec scripts/deploy.js --network NETWORK`

global.web3 = web3;
global.ContractsProvider = require('../src/utils/ContractsProvider');

module.exports = require('../deploy/deploy');
