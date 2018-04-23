const log = require('../logger');
const Release = artifacts.require('Release');
const ZepToken = artifacts.require('ZepToken');
const ContractDirectory = artifacts.require('ContractDirectory');

export default class KernelWrapper {
  constructor(kernel, owner) {
    this.kernel = kernel;
    this.owner = owner;
  }

  async zepToken() {
    return ZepToken.at(await this.kernel.token());
  }

  async mintZepTokens(to, amount) {
    log("Minting ZEP tokens for the developer...");
    const zepToken = await this.zepToken();
    log("ZepToken: ", zepToken.address);
    const mintTx = await zepToken.mint(to, amount, { from: this.owner });
    log("Tokens minted: ", mintTx.tx)
    return mintTx;
  }

  async registerRelease(contracts, developer) {
    log("Deploying a new release...");
    const release = await Release.new({ from: developer });
    log(`Deployed at ${release.address}`);
    log("Adding contracts to release")
    await Promise.all(contracts.map(async function ([contractName, contractKlazz]) {
      const implementation = await contractKlazz.new();
      await release.setImplementation(contractName, implementation.address, { from: developer });
      log(`${contractName} implementation: `, implementation.address);
    }));
    log("Freezing release")
    await release.freeze({ from: developer });
    log("Registering the new release...");
    const zepToken = await this.zepToken();
    const newVersionCost = await this.kernel.newVersionCost()
    await zepToken.approve(this.kernel.address, newVersionCost, { from: developer });
    const registrationTx = await this.kernel.register(release.address, { from: developer });
    log("Release registered: ", registrationTx.tx)
    return release;
  }
}
