'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _zosLib = require('zos-lib');

var _ReleaseWrapper = require('./ReleaseWrapper');

var _ReleaseWrapper2 = _interopRequireDefault(_ReleaseWrapper);

var _ContractsProvider = require('../utils/ContractsProvider');

var _ContractsProvider2 = _interopRequireDefault(_ContractsProvider);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const log = new _zosLib.Logger('ReleaseDeployer');

const ReleaseDeployer = {
  async call(contracts, txParams) {
    this.txParams = txParams;
    await this.deployRelease();
    await this.deployAndRegisterContracts(contracts, this._deployLocalContract);
    return new _ReleaseWrapper2.default(this.release, txParams);
  },

  async callForDependency(contracts, dependencyName, txParams) {
    this.txParams = txParams;
    this.dependencyName = dependencyName;
    await this.deployRelease();
    await this.deployAndRegisterContracts(contracts, this._deployDependencyContract);
    return new _ReleaseWrapper2.default(this.release, txParams);
  },

  async deployRelease() {
    log.info("Deploying a new Release...");
    const Release = _ContractsProvider2.default.getFromKernel('Release');
    this.release = await Release.new(this.txParams);
    log.info(`Deployed at ${this.release.address}`);
  },

  async deployAndRegisterContracts(contracts, deployContract) {
    await Promise.all(contracts.map(async contract => {
      const { alias: contractAlias, name: contractName } = contract;
      const implementation = await deployContract(contractName);
      log.info('Registering implementation in release...');
      await this.release.setImplementation(contractAlias, implementation.address, this.txParams);
    }));
  },

  async _deployLocalContract(contractName) {
    const contractClass = _ContractsProvider2.default.getByName(contractName);
    return await ReleaseDeployer._deployContract(contractName, contractClass);
  },

  async _deployDependencyContract(contractName) {
    const path = `node_modules/${this.dependencyName}/build/contracts/${contractName}.json`;
    const contractSchema = _zosLib.FileSystem.parseJson(path);
    const contractClass = _ContractsProvider2.default.getByJSONData(contractSchema);
    return await ReleaseDeployer._deployContract(contractName, contractClass);
  },

  async _deployContract(contractName, contractClass) {
    log.info(`Deploying new ${contractName}...`);
    const implementation = await contractClass.new();
    log.info(`Deployed ${contractName} ${implementation.address}`);
    return implementation;
  }
};

exports.default = ReleaseDeployer;