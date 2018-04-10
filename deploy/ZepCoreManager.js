const ZepToken = artifacts.require('ZepToken');
const KernelInstance = artifacts.require('KernelInstance');

export default class ZepCoreManager {
  constructor(zepCore, owner) {
    this.zepCore = zepCore;
    this.owner = owner;
  }

  async zepToken() {
    return ZepToken.at(await this.zepCore.token());
  }

  async mintZepTokens(to, amount) {
    console.log("\nMinting ZEP tokens for the developer...");
    const zepToken = await this.zepToken();
    console.log("  ZepToken:", zepToken.address);
    const mintTx = await zepToken.mint(to, amount, { from: this.owner });
    console.log("  Tokens minted: ", mintTx.transactionHash)
  }

  async registerKernelInstance(distribution, version, contractKlazz, contractName, developer, parent = 0) {
    console.log(`\nDeploying a new kernel instance including ${contractKlazz}...`);
    const implementation = await contractKlazz.new();
    console.log(`  ${contractName} implementation: `, implementation.address);
    const instance = await KernelInstance.new(distribution, version, parent, { from: developer });
    console.log("  Kernel instance: ", instance.address);
    await instance.addImplementation(contractName, implementation.address, { from: developer });
    console.log("\nRegistering the new kernel instance...");
    const zepToken = await this.zepToken();
    const newVersionCost = await this.zepCore.newVersionCost()
    await zepToken.approve(this.zepCore.address, newVersionCost, { from: developer });
    const registrationTx = await this.zepCore.register(instance.address, { from: developer });
    console.log("  Kernel instance registered: ", registrationTx.transactionHash)
  }
}
