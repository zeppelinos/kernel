pragma solidity ^0.4.21;

import 'zos-core/contracts/Initializable.sol';
import 'zeppelin-solidity/contracts/token/ERC20/PausableToken.sol';
import 'zeppelin-solidity/contracts/token/ERC20/MintableToken.sol';
import 'zeppelin-solidity/contracts/token/ERC20/BurnableToken.sol';
import 'zeppelin-solidity/contracts/token/ERC20/StandardToken.sol';

/**
 * @title ZepToken
 * @dev ZEP token contract including mintable, burnable and pausable functionalities
 */
contract ZepToken is Initializable, StandardToken, MintableToken, PausableToken, BurnableToken {
  // Token name
  string public constant name = "Zep Token";

  // Token symbol
  string public constant symbol = "ZEP";

  // Token decimals
  uint8 public constant decimals = 18;

  /**
   * @dev Constructor function
   */
  function ZepToken() public {}

  /**
   * @dev Initialization function, sets the owner
   * @param _owner representing the address of the owner
   */
  function initialize(address _owner) public isInitializer {
    owner = _owner;
  }
}
