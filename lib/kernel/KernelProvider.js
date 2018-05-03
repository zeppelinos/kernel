'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _KernelWrapper = require('./KernelWrapper');

var _KernelWrapper2 = _interopRequireDefault(_KernelWrapper);

var _ContractsProvider = require('../utils/ContractsProvider');

var _ContractsProvider2 = _interopRequireDefault(_ContractsProvider);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
  async fromAddress(address, txParams = {}) {
    this._fetchKernel(address);
    await this._fetchZepToken();
    await this._fetchVouching();
    return new _KernelWrapper2.default(this.kernel, this.zepToken, this.vouching, txParams);
  },

  _fetchKernel(address) {
    const Kernel = _ContractsProvider2.default.getFromKernel('Kernel')();
    this.kernel = new Kernel(address);
  },

  async _fetchZepToken() {
    const ZepToken = _ContractsProvider2.default.getFromKernel('ZepToken');
    const zepTokenAddress = await this.kernel.token();
    this.zepToken = new ZepToken(zepTokenAddress);
  },

  async _fetchVouching() {
    const Vouching = _ContractsProvider2.default.getFromKernel('Vouching');
    const vouchingAddress = await this.kernel.vouches();
    this.vouching = new Vouching(vouchingAddress);
  }
};