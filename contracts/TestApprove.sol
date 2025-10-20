// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TestApprove {
    using SafeERC20 for IERC20;
    
    function testSafeIncreaseAllowance(address token, address spender, uint256 amount) external returns (bool) {
        IERC20(token).safeIncreaseAllowance(spender, amount);
        return true;
    }
    
    function testForceApprove(address token, address spender, uint256 amount) external returns (bool) {
        IERC20(token).forceApprove(spender, amount);
        return true;
    }
    
    function testDirectApprove(address token, address spender, uint256 amount) external returns (bool) {
        return IERC20(token).approve(spender, amount);
    }
}

