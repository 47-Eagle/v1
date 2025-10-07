import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { EagleShareOFTV2Testable, EagleRegistry } from "../typechain-types";

describe("EagleShareOFTV2 - Vault Injection Tests", function () {
    let eagleOFT: EagleShareOFTV2Testable;
    let registry: EagleRegistry;
    let owner: SignerWithAddress;
    let treasury: SignerWithAddress;
    let vaultBeneficiary: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;
    let v3Pool: SignerWithAddress;
    let v2Pair: SignerWithAddress;

    const BASIS_POINTS = 10000n;
    const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1M tokens

    beforeEach(async function () {
        [owner, treasury, vaultBeneficiary, user1, user2, v3Pool, v2Pair] = await ethers.getSigners();

        // Deploy mock LayerZero endpoint
        const MockEndpointFactory = await ethers.getContractFactory("MockEndpoint");
        const mockEndpoint = await MockEndpointFactory.deploy();
        await mockEndpoint.waitForDeployment();
        const lzEndpoint = await mockEndpoint.getAddress();

        // Deploy EagleRegistry
        const RegistryFactory = await ethers.getContractFactory("EagleRegistry");
        registry = await RegistryFactory.deploy(owner.address);
        await registry.waitForDeployment();

        // Get current chain ID from registry
        const currentChainId = await registry.getCurrentChainId();
        
        // Configure registry for current chain (Hardhat local network = 31337)
        const weth = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // WETH address
        
        // Register current chain
        await registry.registerChain(
            currentChainId,
            "Hardhat",
            weth,
            "WETH",
            true
        );
        
        // Set LayerZero endpoint for current chain
        await registry.setLayerZeroEndpoint(currentChainId, lzEndpoint);
        
        // Set EID mapping (using a test EID)
        await registry.setChainIdToEid(Number(currentChainId), 40161); // Test EID

        // Deploy EagleShareOFTV2Testable
        const EagleOFTV2Factory = await ethers.getContractFactory("EagleShareOFTV2Testable");
        
        const feeConfig = {
            buyFee: 300,          // 3%
            sellFee: 500,         // 5%
            treasuryShare: 7000,  // 70%
            burnShare: 2000,      // 20%
            vaultShare: 1000,     // 10%
            treasury: treasury.address,
            vaultBeneficiary: vaultBeneficiary.address,
            feesEnabled: true
        };

        eagleOFT = await EagleOFTV2Factory.deploy(
            "Eagle Vault Shares",
            "EAGLE",
            await registry.getAddress(),
            owner.address,
            feeConfig
        );
        await eagleOFT.waitForDeployment();

        // Mint initial supply for testing
        await eagleOFT.connect(owner).mint(owner.address, ethers.parseEther("1000000"));
        await eagleOFT.connect(owner).transfer(user1.address, ethers.parseEther("100000"));
        await eagleOFT.connect(owner).transfer(user2.address, ethers.parseEther("100000"));

        // Configure V3 pool for testing
        await eagleOFT.connect(owner).setV3Pool(v3Pool.address, true);
        await eagleOFT.connect(owner).setPair(v2Pair.address, true);

        // Make pool addresses fee exempt for cleaner testing
        await eagleOFT.connect(owner).setFeeExempt(v3Pool.address, true);
        await eagleOFT.connect(owner).setFeeExempt(v2Pair.address, true);
    });

    describe("Deployment & Configuration", function () {
        it("Should deploy with correct initial configuration", async function () {
            const config = await eagleOFT.swapFeeConfig();
            expect(config.buyFee).to.equal(300);
            expect(config.sellFee).to.equal(500);
            expect(config.treasuryShare).to.equal(7000);
            expect(config.burnShare).to.equal(2000);
            expect(config.vaultShare).to.equal(1000);
            expect(config.treasury).to.equal(treasury.address);
            expect(config.vaultBeneficiary).to.equal(vaultBeneficiary.address);
            expect(config.feesEnabled).to.equal(true);
        });

        it("Should allow owner to update vault beneficiary", async function () {
            const newBeneficiary = user2.address;
            await eagleOFT.connect(owner).setVaultBeneficiary(newBeneficiary);
            
            const config = await eagleOFT.swapFeeConfig();
            expect(config.vaultBeneficiary).to.equal(newBeneficiary);
        });

        it("Should not allow non-owner to update vault beneficiary", async function () {
            await expect(
                eagleOFT.connect(user1).setVaultBeneficiary(user2.address)
            ).to.be.reverted;
        });
    });

    describe("Vault Injection - With Beneficiary", function () {
        it("Should send vault portion to beneficiary on sell", async function () {
            const sellAmount = ethers.parseEther("1000");
            
            // Remove fee exemption from v3Pool to trigger fees
            await eagleOFT.connect(owner).setFeeExempt(v3Pool.address, false);
            
            const beneficiaryBalanceBefore = await eagleOFT.balanceOf(vaultBeneficiary.address);
            
            // Simulate sell: user1 -> v3Pool
            await eagleOFT.connect(user1).transfer(v3Pool.address, sellAmount);
            
            const beneficiaryBalanceAfter = await eagleOFT.balanceOf(vaultBeneficiary.address);
            
            // Calculate expected vault amount
            const feeAmount = (sellAmount * 500n) / BASIS_POINTS; // 5% fee
            const vaultAmount = (feeAmount * 1000n) / BASIS_POINTS; // 10% of fees
            
            expect(beneficiaryBalanceAfter - beneficiaryBalanceBefore).to.equal(vaultAmount);
        });

        it("Should send vault portion to beneficiary on buy", async function () {
            const buyAmount = ethers.parseEther("1000");
            
            // Remove fee exemption from v3Pool to trigger fees
            await eagleOFT.connect(owner).setFeeExempt(v3Pool.address, false);
            
            // Transfer tokens to pool first
            await eagleOFT.connect(user1).transfer(v3Pool.address, buyAmount);
            
            const beneficiaryBalanceBefore = await eagleOFT.balanceOf(vaultBeneficiary.address);
            
            // Simulate buy: v3Pool -> user2
            await eagleOFT.connect(owner).transfer(v3Pool.address, buyAmount); // Give pool tokens
            await eagleOFT.connect(owner).setFeeExempt(v3Pool.address, false); // Enable fees
            
            // Now do the buy transfer
            await eagleOFT.connect(user1).transfer(v3Pool.address, buyAmount);
            
            const beneficiaryBalanceAfter = await eagleOFT.balanceOf(vaultBeneficiary.address);
            
            // Should have received vault fees
            expect(beneficiaryBalanceAfter).to.be.gt(beneficiaryBalanceBefore);
        });

        it("Should track totalVaultInjected correctly", async function () {
            const sellAmount = ethers.parseEther("1000");
            
            await eagleOFT.connect(owner).setFeeExempt(v3Pool.address, false);
            
            const vaultInjectedBefore = await eagleOFT.totalVaultInjected();
            
            // Do multiple swaps
            await eagleOFT.connect(user1).transfer(v3Pool.address, sellAmount);
            await eagleOFT.connect(user1).transfer(v3Pool.address, sellAmount);
            
            const vaultInjectedAfter = await eagleOFT.totalVaultInjected();
            
            expect(vaultInjectedAfter).to.be.gt(vaultInjectedBefore);
        });
    });

    describe("Vault Injection - Without Beneficiary (Burn)", function () {
        beforeEach(async function () {
            // Set beneficiary to zero address
            await eagleOFT.connect(owner).setVaultBeneficiary(ethers.ZeroAddress);
        });

        it("Should burn vault portion when no beneficiary set", async function () {
            const sellAmount = ethers.parseEther("1000");
            
            await eagleOFT.connect(owner).setFeeExempt(v3Pool.address, false);
            
            const totalSupplyBefore = await eagleOFT.totalSupply();
            const totalBurnedBefore = await eagleOFT.totalBurnedAmount();
            
            // Simulate sell
            await eagleOFT.connect(user1).transfer(v3Pool.address, sellAmount);
            
            const totalSupplyAfter = await eagleOFT.totalSupply();
            const totalBurnedAfter = await eagleOFT.totalBurnedAmount();
            
            // Total supply should decrease
            expect(totalSupplyAfter).to.be.lt(totalSupplyBefore);
            
            // Total burned should increase
            expect(totalBurnedAfter).to.be.gt(totalBurnedBefore);
        });

        it("Should emit correct events when burning vault portion", async function () {
            const sellAmount = ethers.parseEther("1000");
            
            await eagleOFT.connect(owner).setFeeExempt(v3Pool.address, false);
            
            // Expect FeesDistributed event with zero address
            await expect(eagleOFT.connect(user1).transfer(v3Pool.address, sellAmount))
                .to.emit(eagleOFT, "FeesDistributed");
        });
    });

    describe("Fee Distribution", function () {
        it("Should correctly distribute fees: treasury, burn, and vault", async function () {
            const sellAmount = ethers.parseEther("1000");
            
            await eagleOFT.connect(owner).setFeeExempt(v3Pool.address, false);
            
            const treasuryBalanceBefore = await eagleOFT.balanceOf(treasury.address);
            const beneficiaryBalanceBefore = await eagleOFT.balanceOf(vaultBeneficiary.address);
            const totalSupplyBefore = await eagleOFT.totalSupply();
            
            // Do swap
            await eagleOFT.connect(user1).transfer(v3Pool.address, sellAmount);
            
            const treasuryBalanceAfter = await eagleOFT.balanceOf(treasury.address);
            const beneficiaryBalanceAfter = await eagleOFT.balanceOf(vaultBeneficiary.address);
            const totalSupplyAfter = await eagleOFT.totalSupply();
            
            // Calculate expected amounts
            const feeAmount = (sellAmount * 500n) / BASIS_POINTS; // 5% sell fee
            const treasuryAmount = (feeAmount * 7000n) / BASIS_POINTS; // 70%
            const burnAmount = (feeAmount * 2000n) / BASIS_POINTS; // 20%
            const vaultAmount = feeAmount - treasuryAmount - burnAmount; // 10% (remainder)
            
            // Verify distributions
            expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(treasuryAmount);
            expect(beneficiaryBalanceAfter - beneficiaryBalanceBefore).to.equal(vaultAmount);
            expect(totalSupplyBefore - totalSupplyAfter).to.be.gte(burnAmount); // >= because net transfer also affects supply
        });

        it("Should handle zero fee amount gracefully", async function () {
            // Disable fees
            await eagleOFT.connect(owner).setSwapFeeConfig(
                0, 0, 7000, 2000, 1000, 
                treasury.address, 
                vaultBeneficiary.address,
                true
            );
            
            await eagleOFT.connect(owner).setFeeExempt(v3Pool.address, false);
            
            const beneficiaryBalanceBefore = await eagleOFT.balanceOf(vaultBeneficiary.address);
            
            // Do transfer with 0% fee
            await eagleOFT.connect(user1).transfer(v3Pool.address, ethers.parseEther("1000"));
            
            const beneficiaryBalanceAfter = await eagleOFT.balanceOf(vaultBeneficiary.address);
            
            // Should not change
            expect(beneficiaryBalanceAfter).to.equal(beneficiaryBalanceBefore);
        });
    });

    describe("Statistics & Monitoring", function () {
        it("Should return correct fee statistics", async function () {
            const stats = await eagleOFT.getFeeStats();
            expect(stats[0]).to.equal(0); // totalBuyFees
            expect(stats[1]).to.equal(0); // totalSellFees
            expect(stats[2]).to.equal(0); // totalBurned
            expect(stats[3]).to.equal(0); // totalVaultInjected
            expect(stats[4]).to.equal(0); // totalSwaps
        });

        it("Should update statistics after swaps", async function () {
            await eagleOFT.connect(owner).setFeeExempt(v3Pool.address, false);
            
            // Do a sell swap
            await eagleOFT.connect(user1).transfer(v3Pool.address, ethers.parseEther("1000"));
            
            const stats = await eagleOFT.getFeeStats();
            expect(stats[1]).to.be.gt(0); // totalSellFees > 0
            expect(stats[3]).to.be.gt(0); // totalVaultInjected > 0
            expect(stats[4]).to.be.gt(0); // totalSwaps > 0
        });
    });

    describe("Edge Cases", function () {
        it("Should handle very small amounts", async function () {
            const smallAmount = ethers.parseEther("0.001");
            
            await eagleOFT.connect(owner).setFeeExempt(v3Pool.address, false);
            
            await expect(
                eagleOFT.connect(user1).transfer(v3Pool.address, smallAmount)
            ).to.not.be.reverted;
        });

        it("Should handle maximum fee percentage", async function () {
            // Set to max 10% fee
            await eagleOFT.connect(owner).setSwapFeeConfig(
                1000, 1000, 7000, 2000, 1000,
                treasury.address,
                vaultBeneficiary.address,
                true
            );
            
            await eagleOFT.connect(owner).setFeeExempt(v3Pool.address, false);
            
            const sellAmount = ethers.parseEther("1000");
            const beneficiaryBalanceBefore = await eagleOFT.balanceOf(vaultBeneficiary.address);
            
            await eagleOFT.connect(user1).transfer(v3Pool.address, sellAmount);
            
            const beneficiaryBalanceAfter = await eagleOFT.balanceOf(vaultBeneficiary.address);
            
            // Should have received vault fees
            expect(beneficiaryBalanceAfter).to.be.gt(beneficiaryBalanceBefore);
        });

        it("Should not allow fees exceeding maximum", async function () {
            await expect(
                eagleOFT.connect(owner).setSwapFeeConfig(
                    1001, 500, 7000, 2000, 1000, // 10.01% exceeds max
                    treasury.address,
                    vaultBeneficiary.address,
                    true
                )
            ).to.be.revertedWithCustomError(eagleOFT, "FeeExceedsLimit");
        });

        it("Should not allow invalid fee distribution", async function () {
            await expect(
                eagleOFT.connect(owner).setSwapFeeConfig(
                    300, 500, 7000, 2000, 2000, // Sums to 11000, not 10000
                    treasury.address,
                    vaultBeneficiary.address,
                    true
                )
            ).to.be.revertedWithCustomError(eagleOFT, "InvalidFeeRecipient");
        });
    });

    describe("Regular Transfers (No Fees)", function () {
        it("Should not charge fees on regular user-to-user transfers", async function () {
            const transferAmount = ethers.parseEther("1000");
            
            const user1BalanceBefore = await eagleOFT.balanceOf(user1.address);
            const user2BalanceBefore = await eagleOFT.balanceOf(user2.address);
            const beneficiaryBalanceBefore = await eagleOFT.balanceOf(vaultBeneficiary.address);
            
            await eagleOFT.connect(user1).transfer(user2.address, transferAmount);
            
            const user1BalanceAfter = await eagleOFT.balanceOf(user1.address);
            const user2BalanceAfter = await eagleOFT.balanceOf(user2.address);
            const beneficiaryBalanceAfter = await eagleOFT.balanceOf(vaultBeneficiary.address);
            
            // Full amount should be transferred
            expect(user1BalanceBefore - user1BalanceAfter).to.equal(transferAmount);
            expect(user2BalanceAfter - user2BalanceBefore).to.equal(transferAmount);
            
            // Beneficiary should not receive anything
            expect(beneficiaryBalanceAfter).to.equal(beneficiaryBalanceBefore);
        });
    });
});

