pragma solidity ^0.4.21;

import 'zos-core/contracts/Initializable.sol';
import 'zeppelin-solidity/contracts/token/ERC20/PausableToken.sol';
import 'zeppelin-solidity/contracts/token/ERC20/MintableToken.sol';
import 'zeppelin-solidity/contracts/token/ERC20/BurnableToken.sol';
import 'zeppelin-solidity/contracts/token/ERC20/StandardToken.sol';

contract ZepToken is Initializable, StandardToken, MintableToken, PausableToken, BurnableToken {
  string public constant name = "Zep Token";
  string public constant symbol = "ZEP";
  uint8 public constant decimals = 18;

  function ZepToken() public {}

  function initialize(address _owner) public isInitializer {
    owner = _owner;
  }
}
