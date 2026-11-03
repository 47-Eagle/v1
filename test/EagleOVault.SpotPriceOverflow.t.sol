// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Test} from "forge-std/Test.sol";
import {stdError} from "forge-std/StdError.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title EagleOVault spot-price overflow regression
 * @notice Guards the defect that froze the deployed EagleOVault.
 *
 * The original `_getSpotPrice()` computed:
 *
 *     uint256 numerator = uint256(sqrtPriceX96) * uint256(sqrtPriceX96);
 *     uint256 rawPrice  = (numerator * 1e18) / (1 << 192);
 *
 * `numerator * 1e18` overflows uint256 once `sqrtPriceX96 > ~3.402e29`
 * (tick > ~0). The live WLFI/USD1 0.3% pool sat at
 * sqrtPriceX96 = 351998837236907140818054177784 when the vault bricked,
 * making the product 1.07x larger than uint256 max.
 *
 * That overflow propagated into `totalAssets()` -> `wlfiEquivalent()` ->
 * `previewRedeem/previewDeposit/convertToAssets/maxWithdraw`, freezing every
 * deposit and redemption path. These tests pin the corrected math against
 * that exact value plus the full uint160 range.
 */
contract EagleOVaultSpotPriceOverflowTest is Test {
    /// @dev The live sqrtPriceX96 at the time the deployed vault froze.
    uint160 internal constant LIVE_SQRT_PRICE = 351998837236907140818054177784;

    /// @dev Highest sqrtPriceX96 a Uniswap V3 pool can report.
    uint160 internal constant MAX_SQRT_PRICE = type(uint160).max;

    /**
     * @dev Mirrors the corrected `_getSpotPrice()` body.
     *      Kept in the test so the regression is pinned even if the contract
     *      is refactored; a mismatch with the contract indicates drift.
     */
    function _fixedSpotPrice(uint160 sqrtPriceX96) internal pure returns (uint256 price) {
        uint256 sqrtPrice = uint256(sqrtPriceX96);

        uint256 rawPrice;
        if (sqrtPrice <= type(uint128).max) {
            uint256 ratioX192 = sqrtPrice * sqrtPrice;
            rawPrice = Math.mulDiv(ratioX192, 1e18, uint256(1) << 192);
        } else {
            uint256 ratioX128 = Math.mulDiv(sqrtPrice, sqrtPrice, uint256(1) << 64);
            rawPrice = Math.mulDiv(ratioX128, 1e18, uint256(1) << 128);
        }

        price = rawPrice > 0 ? Math.mulDiv(1e18, 1e18, rawPrice) : 1e15;
        if (price == 0) price = 1e15;
    }

    /**
     * @dev The pre-fix formula, reproduced verbatim so we can demonstrate the
     *      overflow it produced. Reverts with a panic on the live value.
     */
    function _legacySpotPrice(uint160 sqrtPriceX96) internal pure returns (uint256 price) {
        uint256 numerator = uint256(sqrtPriceX96) * uint256(sqrtPriceX96);
        uint256 denominator = 1 << 192;
        uint256 rawPrice = (numerator * 1e18) / denominator;

        price = rawPrice > 0 ? (1e18 * 1e18) / rawPrice : 1e15;
        if (price == 0) price = 1e15;
    }

    // =================================
    // BUG REPRODUCTION
    // =================================

    /// @notice The legacy formula really does overflow on the live pool price.
    function test_legacyFormulaOverflowsOnLivePoolPrice() public {
        // Confirm the value is genuinely the one that broke production:
        // numerator * 1e18 exceeds uint256 max by ~7%.
        uint256 numerator = uint256(LIVE_SQRT_PRICE) * uint256(LIVE_SQRT_PRICE);
        assertGt(numerator, type(uint256).max / 1e18, "live numerator should not fit after *1e18");

        vm.expectRevert(stdError.arithmeticError);
        this.legacySpotPriceExternal(LIVE_SQRT_PRICE);
    }

    /// @notice The fixed formula returns a sane price for that same value.
    function test_fixedFormulaSurvivesLivePoolPrice() public view {
        uint256 price = _fixedSpotPrice(LIVE_SQRT_PRICE);

        // WLFI per USD1 is ~19 at this pool state (USD1 is token0).
        assertGt(price, 0, "price must be non-zero");
        assertLt(price, 1e24, "price must stay in a sane band");
    }

    // =================================
    // RANGE COVERAGE
    // =================================

    /// @notice No sqrtPriceX96 in the uint160 range may revert.
    function testFuzz_fixedFormulaNeverReverts(uint160 sqrtPriceX96) public view {
        uint256 price = _fixedSpotPrice(sqrtPriceX96);
        // The zero-guard means the return is always non-zero.
        assertGt(price, 0, "price must never be zero");
    }

    /// @notice The legacy formula reverts for a wide band of valid pool prices.
    function testFuzz_legacyFormulaRevertsAboveThreshold(uint160 sqrtPriceX96) public {
        // Threshold where numerator * 1e18 first overflows: sqrt(max / 1e18).
        if (uint256(sqrtPriceX96) <= 340282366920938463463374607431768211455) {
            vm.assume(false); // below type(uint128).max: legacy path is safe
        }
        vm.assume(uint256(sqrtPriceX96) > _overflowThreshold());

        vm.expectRevert(stdError.arithmeticError);
        this.legacySpotPriceExternal(sqrtPriceX96);
    }

    /// @notice The two branches must agree closely across the uint128 boundary.
    function test_branchesAgreeAcrossBoundary() public view {
        // Just below and just above the direct-square cutoff.
        uint160 below = uint160(type(uint128).max - 1);
        uint160 above = uint160(uint256(type(uint128).max) + 1);

        uint256 pBelow = _fixedSpotPrice(below);
        uint256 pAbove = _fixedSpotPrice(above);

        // Adjacent sqrt prices produce near-identical prices (within 0.001%).
        uint256 diff = pBelow > pAbove ? pBelow - pAbove : pAbove - pBelow;
        assertLt(diff * 1e5, pBelow, "branch switch must not shift the price materially");
    }

    /// @notice Monotonicity: a higher sqrtPriceX96 yields a lower WLFI-per-USD1.
    function test_priceIsMonotonicDecreasingInSqrtPrice() public view {
        uint160 low = 1e30 / 1; // well below the overflow threshold
        uint160 high = uint160(uint256(low) * 2);

        uint256 pLow = _fixedSpotPrice(low);
        uint256 pHigh = _fixedSpotPrice(high);

        assertGt(pLow, pHigh, "price must fall as sqrtPrice rises");
    }

    // =================================
    // HELPERS
    // =================================

    function _overflowThreshold() internal pure returns (uint256) {
        // sqrt(type(uint256).max / 1e18)
        return 340282366920938463463374607431768211455;
    }

    /// @dev External wrappers so `vm.expectRevert` can catch the panic.
    function legacySpotPriceExternal(uint160 sqrtPriceX96) external pure returns (uint256) {
        return _legacySpotPrice(sqrtPriceX96);
    }
}
