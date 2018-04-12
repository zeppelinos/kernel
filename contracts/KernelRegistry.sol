pragma solidity ^0.4.21;

import "./KernelInstance.sol";
import "zos-core/contracts/Initializable.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title KernelRegistry
 * @dev This contract keeps track of all submitted Kernel versions
 */
contract KernelRegistry is Initializable, Ownable {
  /**
   * @dev Event signaling that a new instance has been registered
   * @param instance representing the new KernelInstance
   */
  event NewInstance(KernelInstance indexed instance);

  // Mapping from a kernel's hash to its address
  mapping(bytes32 => address) private instances;

  /**
  * @dev Constructor function
  */
  function KernelRegistry() public {}

  /**
   * @dev Initialization function, sets the owner of the registry
   * @param _owner representing the address of the owner
   */
  function initialize(address _owner) public isInitializer {
    owner = _owner;
  }

  /**
   * @dev Tells the kernel for a version of a given distribution
   * @param name representing the distribution
   * @param version representing the distribution's version
   */
  function getInstance(string name, string version) public view returns (KernelInstance) {
    bytes32 hash = keccak256(name, version);
    return KernelInstance(instances[hash]);
  }

  /**
   * @dev Registers a new kernel version
   * @param _instance representing the kernel to be registered
   */
  function addInstance(KernelInstance _instance) onlyOwner public {
    bytes32 hash = _instance.getHash();
    require(instances[hash] == address(0));

    instances[hash] = _instance;
    emit NewInstance(_instance);
  }

  /**
   * @dev Tells whether a given kernel has been registered
   * @param _instance representing the kernel
   */
  function isRegistered(KernelInstance _instance) public view returns (bool) {
    bytes32 hash = _instance.getHash();
    return instances[hash] != address(0);
  }
}
