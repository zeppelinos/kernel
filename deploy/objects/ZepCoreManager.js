const ZepToken = artifacts.require('ZepToken');
const KernelInstance = artifacts.require('KernelInstance');

const log = require('../logger');

export default class ZepCoreManager {
  constructor(zepCore, owner) {
    this.zepCore = zepCore;
    this.owner = owner;
  }

  async zepToken() {
    return ZepToken.at(await this.zepCore.token());
  }

  async mintZepTokens(to, amount) {
    log("\nMinting ZEP tokens for the developer...");
    const zepToken = await this.zepToken();
    log("  ZepToken:", zepToken.address);
    const mintTx = await zepToken.mint(to, amount, { from: this.owner });
    log("  Tokens minted: ", mintTx.tx)
  }

  async registerKernelInstance(distribution, version, contractKlazz, contractName, developer, parent = 0) {
    log(`\nDeploying a new kernel instance including ${contractName}...`);
    const implementation = await contractKlazz.new();
    log(`  ${contractName} implementation: `, implementation.address);
    const instance = await KernelInstance.new(distribution, version, parent, { from: developer });
    log("  Kernel instance: ", instance.address);
    await instance.addImplementation(contractName, implementation.address, { from: developer });
    log("\nRegistering the new kernel instance...");
    const zepToken = await this.zepToken();
    const newVersionCost = await this.zepCore.newVersionCost()
    await zepToken.approve(this.zepCore.address, newVersionCost, { from: developer });
    const registrationTx = await this.zepCore.register(instance.address, { from: developer });
    log("  Kernel instance registered: ", registrationTx.tx)
  }
}
