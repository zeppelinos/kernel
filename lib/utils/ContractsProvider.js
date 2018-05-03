'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _zosLib = require('zos-lib');

_zosLib.ContractsProvider.getFromKernel = contractName => _zosLib.ContractsProvider.getByName(contractName);
exports.default = _zosLib.ContractsProvider;