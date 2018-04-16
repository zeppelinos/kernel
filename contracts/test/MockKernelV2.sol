pragma solidity ^0.4.18;

import "../Kernel.sol";

contract MockKernelV2 is Kernel {

  // Duplicate developer payout, because reasons
  function _payoutAndVouch(address voucher, Release release, uint256 amount, bytes data) internal {
    uint256 developerPayout = amount.mul(2).div(developerFraction);
    require(developerPayout > 0);
   
    uint256 vouchedAmount = amount.sub(developerPayout);
    vouches.vouch(voucher, release, vouchedAmount, data);
    token.transfer(release.developer(), developerPayout);
  }

}
