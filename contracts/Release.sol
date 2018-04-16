pragma solidity ^0.4.21;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title Release
 * @dev This contract represents a particular Kernel version from a distribution. Has an immutable reference to all contract implementations that comprise this version.
 */
contract Release is Ownable {

  // Developer address to which staking payouts will be sent
  address public developer;
  
  // Provides freezing behavior to prevent implementations defined in parent to be overwritten
  bool public frozen;
  
  // Mapping from a contract name to its implementation address
  mapping(string => address) private implementations;

  /**
   * @dev Event signaling that a new implementation for a contract has been added
   * @param contractName representing the name of the contract
   * @param implementation representing the address of the implementation
   */
  event ImplementationAdded(string contractName, address implementation);

  /**
  * @dev Guarantees the Release is not frozen
  */
  modifier whenNotFrozen() {
    require(!frozen);
    _;
  }

  /**
   * @dev Constructor function that sets the developer of this release
   */
  function Release() public {
    developer = msg.sender;
  }

  /**
   * @dev Adds an implementation for a contract to the Release and emits the corresponding event
   * @param contractName representing the name of the contract
   * @param implementation representing the address of the implementation
   */
  function addImplementation(string contractName, address implementation) onlyOwner whenNotFrozen public {
    require(implementation != address(0));
    require(implementations[contractName] == address(0));
    implementations[contractName] = implementation;
    emit ImplementationAdded(contractName, implementation);
  }

  /**
   * @dev Retrieves the implementation address for a given contract
   * @param contractName representing the name of the contract
   * @return the implementation address or 0 if it does not exist
   */
  function getImplementation(string contractName) public view returns(address) {
    return implementations[contractName];
  }

  /**
   * @dev Locks the Release to avoid adding new implementations
   */
  function freeze() onlyOwner whenNotFrozen public {
    frozen = true;
  }
}
