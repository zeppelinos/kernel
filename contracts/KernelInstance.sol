pragma solidity ^0.4.21;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title KernelInstance
 * @dev This contract represents a particular Kernel version from a distribution. Has an immutable reference to all contract implementations that comprise this version.
 */
contract KernelInstance is Ownable {

  // Distribution name
  string public name;

  // Distribution version
  string public version;

  // Developer address to which staking payouts will be sent
  address public developer;

  // Parent KernelInstance in the version tree, acts as a fallback for missing implementations
  KernelInstance public parent;
  
  // Provides freezing behavior to prevent implementations defined in parent to be overwritten
  bool public frozen;
  
  // Mapping from a contract name to its implementation address
  mapping(string => address) private implementations;

  /**
   * @dev This event will be emitted every time an implementation is added
   * @param contractName representing the name of the contract for which an implementation was added
   * @param implementation representing the address of the implementation
   */
  event ImplementationAdded(string contractName, address implementation);

  /**
  * @dev Guarantees the KernelInstance is not frozen
  */
  modifier notFrozen() {
    require(!frozen);
    _;
  }

  /**
   * @dev Constructor function that sets the distribution's name, version, developer and parent while checking the latter is frozen
   * @param _name representing the name of the distribution
   * @param _version representing the version of the distribution
   * @param _parent representing the parent KernelInstance in the version tree
   */
  function KernelInstance(string _name, string _version, KernelInstance _parent) public {
    if(_parent != address(0)) { require(_parent.frozen()); }
    name = _name;
    version = _version;
    parent = _parent;
    developer = msg.sender;
  }

  /**
   * @dev Tells the hash representing the KernelInstance
   * @return the hash representing the KernelInstance
   */
  function getHash() public view returns(bytes32) {
    return keccak256(name, version);
  }

  /**
   * @dev Adds an implementation for a contract to the KernelInstance and emits an event accordingly
   * @param contractName representing the name of the contract
   * @param implementation representing the address of the implementation
   */
  function addImplementation(string contractName, address implementation) onlyOwner notFrozen public {
    require(implementation != address(0));
    require(implementations[contractName] == address(0));
    implementations[contractName] = implementation;
    emit ImplementationAdded(contractName, implementation);
  }

  /**
   * @dev Tells the implementation address for a given contract
   * @param contractName representing the name of the contract
   * @return the implementation address or 0 if it does not exist
   */
  function getImplementation(string contractName) public view returns(address) {
    address implementation = implementations[contractName];
    if(implementation != address(0)) return implementation;
    else if(parent != address(0)) return parent.getImplementation(contractName); 
    else return 0;
  }

  /**
   * @dev Locks the KernelInstance to avoid adding new implementations
   */
  function freeze() onlyOwner notFrozen public {
    frozen = true;
  }
}
