// Deploy the zeppelin OS kernel with a sample release
// Run as: `npx truffle exec scripts/deploy.js --network NETWORK`

global.artifacts = artifacts;
global.web3 = web3;
global.log = true;

module.exports = require('../deploy/scripts/deploy');
