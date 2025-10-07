// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { EagleShareOFTV2 } from "../layerzero-ovault/oft/EagleShareOFTV2.sol";

/**
 * @title EagleShareOFTV2Testable
 * @notice Testable version of EagleShareOFTV2 with mint function for testing
 */
contract EagleShareOFTV2Testable is EagleShareOFTV2 {
    constructor(
        string memory _name,
        string memory _symbol,
        address _registry,
        address _delegate,
        SwapFeeConfig memory _feeConfig
    ) EagleShareOFTV2(_name, _symbol, _registry, _delegate, _feeConfig) {}

    /**
     * @notice Mint tokens for testing (owner only)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

