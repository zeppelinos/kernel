pragma solidity ^0.4.21;

import 'zos-lib/contracts/migrations/Migratable.sol';
import 'zeppelin-solidity/contracts/token/ERC20/PausableToken.sol';
import 'zeppelin-solidity/contracts/token/ERC20/MintableToken.sol';
import 'zeppelin-solidity/contracts/token/ERC20/BurnableToken.sol';
import 'zeppelin-solidity/contracts/token/ERC20/StandardToken.sol';

/**
 * @title ZepToken
 * @dev ZEP token contract including mintable, pausable and burnable functionalities
 */
contract ZepToken is Migratable, StandardToken, MintableToken, PausableToken, BurnableToken {

  string public constant name = "Zep Token";
  string public constant symbol = "ZEP";
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
