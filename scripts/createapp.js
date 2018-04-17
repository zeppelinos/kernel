// Create an app manager for your project on top of zOS
// Deploys sample zOS along with a sample Kernel (see deploy)
// Run as: `npx truffle exec scripts/createapp.js --network NETWORK`

global.artifacts = artifacts;
global.web3 = web3;
global.log = true;

module.exports = require('../deploy/scripts/createapp');
