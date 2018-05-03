// Create an app manager for your project on top of zOS
// Deploys sample zOS along with a sample Kernel (see deploy)
// Run as: `npx truffle exec scripts/createapp.js --network NETWORK`

global.web3 = web3;
global.artifacts = artifacts;

module.exports = require('../deploy/createapp');
