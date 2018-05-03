'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _zosLib = require('zos-lib');

const log = new _zosLib.Logger('Release');

class ReleaseWrapper {
  constructor(release, txParams = {}) {
    this.release = release;
    this.txParams = txParams;
  }

  address() {
    return this.release.address;
  }

  async freeze() {
    log.info("Freezing release...");
    await this.release.freeze(this.txParams);
  }
}
exports.default = ReleaseWrapper;