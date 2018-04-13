export default class RegistryManager {
  constructor(registry) {
    this.registry = registry;
  }

  async owner() {
    return await this.registry.owner()
  }

  async deployAndRegister(contractKlazz, contractName, version) {
    const owner = await this.owner()
    const implementation = await contractKlazz.new();
    await this.registry.addImplementation(version, contractName, implementation.address, { from: owner });
    return implementation;
  }
}
