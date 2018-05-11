require('babel-register');
require('babel-polyfill');

module.exports = {
  networks: {
    local: {
      host: 'localhost',
      network_id: '*', // eslint-disable-line camelcase
      port: 9545,
      gas: 6000000,
      gasPrice: 1,
    },
    coverage: {
      host: 'localhost',
      network_id: '*', // eslint-disable-line camelcase
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },
    ropsten: {
      name: 'ropsten',
      host: 'localhost',
      port: 8565,
      network_id: '3',
      gas: 6000000,
      gasPrice: 500000000,
    }
  }
}
