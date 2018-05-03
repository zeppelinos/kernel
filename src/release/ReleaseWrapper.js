import { Logger } from 'zos-lib'

const log = new Logger('Release')

export default class ReleaseWrapper {
  constructor(release, txParams = {}) {
    this.release = release
    this.txParams = txParams
  }

  address() {
    return this.release.address
  }

  async freeze() {
    log.info("Freezing release...")
    await this.release.freeze(this.txParams)
  }
}
