pragma solidity ^0.4.21;
// solium-disable-next-line max-len
import "zos-lib/contracts/application/versioning/FreezableContractDirectory.sol";


/**
 * @title Release
 * @dev This contract represents a particular stdlib version from a developer
 * @dev Has an immutable reference to all contract implementations that comprise this version
 */
contract Release is FreezableContractDirectory {

  // Developer address to which staking payouts will be sent, owner of the contract directory
  address public developer;

  /**
   * @dev Constructor function that sets the developer of this release
   */
  function Release() public {
    developer = msg.sender;
  }
}
