// Deploy the zeppelin OS kernel with a sample release
// Run as: `npx truffle exec scripts/deploy.js --network NETWORK`

global.web3 = web3;
global.artifacts = artifacts;

module.exports = require('../deploy/deploy');
