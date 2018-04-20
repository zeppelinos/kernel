pragma solidity ^0.4.21;

import "./stdlib/ERC721Token.sol";
import "zos-lib/contracts/migrations/Initializable.sol";

contract PickACard is Initializable {
  uint256 public constant MAX_CARD = 10;

  ERC721Token public erc721;

  function initialize(ERC721Token _erc721) public isInitializer {
    erc721 = _erc721;
    erc721.initialize();
    for(uint256 i = 0; i <= MAX_CARD; i++) {
      erc721.mint(this, i);
    }    
  }

  function pick(uint256 number) public {
    require(number < MAX_CARD);
    erc721.safeTransferFrom(this, msg.sender, number);
  }
}
