pragma solidity ^0.4.21;

import "zos-lib/contracts/migrations/Migratable.sol";
import "zeppelin-solidity/contracts/token/ERC20/PausableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";


/**
 * @title ZepToken
 * @dev ZEP token contract including mintable, pausable and burnable functionalities
 */
// XXX There doesn't seem to be a way to split this line that keeps solium
// happy. See:
// https://github.com/duaraghav8/Solium/issues/205
// --elopio - 2018-05-31
// solium-disable-next-line max-len
contract ZepToken is Migratable, StandardToken, MintableToken, PausableToken, BurnableToken {

  // solium-disable-next-line uppercase
  string public constant name = "Zep Token";
  // solium-disable-next-line uppercase
  string public constant symbol = "ZEP";
  // solium-disable-next-line uppercase
  uint8 public constant decimals = 18;

  /**
   * @dev Constructor function
   */
  function ZepToken() public {}

  /**
   * @dev Initialization function, sets the owner
   * @param _owner the address of the zep token owner
   */
  function initialize(address _owner) public isInitializer("ZepToken", "0") {
    owner = _owner;
  }
}
