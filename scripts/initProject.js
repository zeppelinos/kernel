// Create a project controller for your project on top of zOS
// Run as: `npx truffle exec scripts/init_project.js --network NETWORK`

global.artifacts = artifacts;
global.web3 = web3;
global.log = true;

module.exports = require('../deploy/initProject');
