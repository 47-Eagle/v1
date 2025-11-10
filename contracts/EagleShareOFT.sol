// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/OFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title EagleShareOFT
 * @notice Omnichain fungible token representing yield-bearing vault shares (vEAGLE)
 * @dev Extends LayerZero OFT with cross-chain withdrawal capabilities
 * 
 * Features:
 * - Standard OFT bridging (EAGLE ↔ EAGLE across chains)
 * - Atomic cross-chain withdrawal (EAGLE on Chain A → WLFI on Chain B)
 * - Share price synchronization across chains
 * - Emergency pause and rate limiting
 */
contract EagleShareOFT is OFT, ReentrancyGuard, Pausable {
    
    // ============ State Variables ============
    
    /// @notice Address of the EagleVaultWrapper on this chain (if deployed)
    address public vaultWrapper;
    
    /// @notice Address of the EagleOVault on this chain (if deployed)
    address public vault;
    
    /// @notice Address of WLFI token on this chain (if deployed)
    address public wlfiToken;
    
    /// @notice Current share price (vEAGLE to WLFI conversion rate)
    /// @dev Updated via oracle or direct vault query on main chain
    uint256 public sharePrice;
    
    /// @notice Last time share price was updated
    uint256 public sharePriceLastUpdated;
    
    /// @notice Maximum share price age before requiring update (default: 1 hour)
    uint256 public maxSharePriceAge = 1 hours;
    
    /// @notice Daily withdrawal limit per chain (for security)
    mapping(uint16 => uint256) public dailyWithdrawalLimit;
    
    /// @notice Amount withdrawn today per chain
    mapping(uint16 => uint256) public dailyWithdrawn;
    
    /// @notice Last reset timestamp for daily limits
    mapping(uint16 => uint256) public lastDailyReset;
    
    /// @notice Trusted remote addresses for receiving withdrawal messages
    mapping(uint16 => bool) public trustedChains;
    
    /// @notice Withdrawal fee in basis points (e.g., 200 = 2%)
    uint256 public withdrawalFeeBps = 200;
    
    /// @notice Performance fee in basis points (e.g., 470 = 4.7%)
    uint256 public performanceFeeBps = 470;
    
    // ============ Custom Message Types ============
    
    /// @dev Message type for standard OFT transfer
    uint16 public constant PT_SEND = 0;
    
    /// @dev Message type for cross-chain withdrawal (EAGLE → WLFI)
    uint16 public constant PT_WITHDRAW = 1;
    
    /// @dev Message type for share price update
    uint16 public constant PT_PRICE_UPDATE = 2;
    
    // ============ Structs ============
    
    /// @notice Withdrawal request data
    struct WithdrawalRequest {
        address recipient;
        uint256 amount;
        bool unwrapToWLFI;
        uint256 minAmountOut;
    }
    
    // ============ Events ============
    
    event CrossChainWithdrawalInitiated(
        address indexed sender,
        uint16 indexed dstChainId,
        address indexed recipient,
        uint256 amount,
        bool unwrapToWLFI
    );
    
    event CrossChainWithdrawalReceived(
        uint16 indexed srcChainId,
        address indexed recipient,
        uint256 amount,
        uint256 wlfiReceived
    );
    
    event SharePriceUpdated(
        uint256 oldPrice,
        uint256 newPrice,
        uint256 timestamp
    );
    
    event VaultAddressUpdated(address indexed vault);
    event WrapperAddressUpdated(address indexed wrapper);
    event WithdrawalLimitUpdated(uint16 indexed chainId, uint256 newLimit);
    event EmergencyWithdrawal(address indexed token, uint256 amount);
    
    // ============ Errors ============
    
    error StalePriceData();
    error ExceedsWithdrawalLimit();
    error SlippageExceeded();
    error UntrustedChain();
    error InvalidAmount();
    error VaultNotConfigured();
    error InsufficientLiquidity();
    
    // ============ Constructor ============
    
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {
        sharePrice = 1e18; // Initialize at 1:1
        sharePriceLastUpdated = block.timestamp;
    }
    
    // ============ Configuration Functions ============
    
    /**
     * @notice Set vault wrapper address on this chain
     * @param _wrapper Address of EagleVaultWrapper contract
     */
    function setVaultWrapper(address _wrapper) external onlyOwner {
        require(_wrapper != address(0), "Invalid wrapper address");
        vaultWrapper = _wrapper;
        emit WrapperAddressUpdated(_wrapper);
    }
    
    /**
     * @notice Set vault address on this chain
     * @param _vault Address of EagleOVault contract
     */
    function setVault(address _vault) external onlyOwner {
        require(_vault != address(0), "Invalid vault address");
        vault = _vault;
        emit VaultAddressUpdated(_vault);
    }
    
    /**
     * @notice Set WLFI token address on this chain
     * @param _wlfi Address of WLFI token
     */
    function setWLFIToken(address _wlfi) external onlyOwner {
        require(_wlfi != address(0), "Invalid WLFI address");
        wlfiToken = _wlfi;
    }
    
    /**
     * @notice Set daily withdrawal limit for a chain
     * @param _chainId Destination chain ID
     * @param _limit Daily limit in EAGLE tokens
     */
    function setWithdrawalLimit(uint16 _chainId, uint256 _limit) external onlyOwner {
        dailyWithdrawalLimit[_chainId] = _limit;
        emit WithdrawalLimitUpdated(_chainId, _limit);
    }
    
    /**
     * @notice Mark a chain as trusted for withdrawals
     * @param _chainId Chain ID to trust
     * @param _trusted Whether to trust this chain
     */
    function setTrustedChain(uint16 _chainId, bool _trusted) external onlyOwner {
        trustedChains[_chainId] = _trusted;
    }
    
    /**
     * @notice Update withdrawal fee
     * @param _feeBps New fee in basis points
     */
    function setWithdrawalFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 1000, "Fee too high"); // Max 10%
        withdrawalFeeBps = _feeBps;
    }
    
    /**
     * @notice Update max share price age
     * @param _maxAge New maximum age in seconds
     */
    function setMaxSharePriceAge(uint256 _maxAge) external onlyOwner {
        maxSharePriceAge = _maxAge;
    }
    
    // ============ Core Withdrawal Functions ============
    
    /**
     * @notice Initiate cross-chain withdrawal with automatic unwrapping
     * @param _dstEid Destination chain endpoint ID
     * @param _recipient Address to receive funds on destination chain
     * @param _amount Amount of EAGLE to withdraw
     * @param _unwrapToWLFI Whether to unwrap to WLFI on destination
     * @param _minAmountOut Minimum amount to receive (slippage protection)
     * @param _extraOptions Additional LayerZero options
     */
    function withdrawCrossChain(
        uint32 _dstEid,
        address _recipient,
        uint256 _amount,
        bool _unwrapToWLFI,
        uint256 _minAmountOut,
        bytes calldata _extraOptions
    ) external payable nonReentrant whenNotPaused returns (MessagingReceipt memory receipt) {
        if (_amount == 0) revert InvalidAmount();
        if (!trustedChains[uint16(_dstEid)]) revert UntrustedChain();
        
        // Check daily withdrawal limit
        _checkWithdrawalLimit(uint16(_dstEid), _amount);
        
        // Burn EAGLE from sender on source chain
        _burn(msg.sender, _amount);
        
        // Encode withdrawal request
        WithdrawalRequest memory request = WithdrawalRequest({
            recipient: _recipient,
            amount: _amount,
            unwrapToWLFI: _unwrapToWLFI,
            minAmountOut: _minAmountOut
        });
        
        bytes memory payload = abi.encode(PT_WITHDRAW, request);
        
        // Send cross-chain message
        MessagingFee memory fee = _quote(_dstEid, payload, _extraOptions, false);
        receipt = _lzSend(
            _dstEid,
            payload,
            _extraOptions,
            fee,
            payable(msg.sender)
        );
        
        emit CrossChainWithdrawalInitiated(
            msg.sender,
            uint16(_dstEid),
            _recipient,
            _amount,
            _unwrapToWLFI
        );
        
        return receipt;
    }
    
    /**
     * @notice Quote the fee for cross-chain withdrawal
     * @param _dstEid Destination endpoint ID
     * @param _amount Amount to withdraw
     * @param _unwrapToWLFI Whether to unwrap
     * @param _extraOptions LayerZero options
     * @return fee Messaging fee required
     */
    function quoteWithdrawal(
        uint32 _dstEid,
        uint256 _amount,
        bool _unwrapToWLFI,
        bytes calldata _extraOptions
    ) external view returns (MessagingFee memory fee) {
        WithdrawalRequest memory request = WithdrawalRequest({
            recipient: msg.sender,
            amount: _amount,
            unwrapToWLFI: _unwrapToWLFI,
            minAmountOut: 0
        });
        
        bytes memory payload = abi.encode(PT_WITHDRAW, request);
        return _quote(_dstEid, payload, _extraOptions, false);
    }
    
    // ============ LayerZero Receive Handler ============
    
    /**
     * @dev Internal function to handle incoming LayerZero messages
     * @param _origin Origin chain information
     * @param _guid Global unique identifier
     * @param _message Encoded message payload
     * @param _executor Executor address
     * @param _extraData Additional data
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) internal override {
        // Decode message type
        (uint16 messageType) = abi.decode(_message, (uint16));
        
        if (messageType == PT_SEND) {
            // Standard OFT transfer
            _handleStandardTransfer(_origin, _guid, _message, _executor, _extraData);
        } else if (messageType == PT_WITHDRAW) {
            // Cross-chain withdrawal
            _handleWithdrawal(_origin, _message);
        } else if (messageType == PT_PRICE_UPDATE) {
            // Share price update
            _handlePriceUpdate(_message);
        } else {
            revert("Invalid message type");
        }
    }
    
    /**
     * @dev Handle standard OFT transfer
     */
    function _handleStandardTransfer(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) internal {
        // Call parent OFT implementation
        super._lzReceive(_origin, _guid, _message, _executor, _extraData);
    }
    
    /**
     * @dev Handle cross-chain withdrawal request
     * @param _origin Origin information
     * @param _message Encoded withdrawal request
     */
    function _handleWithdrawal(
        Origin calldata _origin,
        bytes calldata _message
    ) internal {
        // Decode withdrawal request
        (, WithdrawalRequest memory request) = abi.decode(
            _message,
            (uint16, WithdrawalRequest)
        );
        
        uint256 wlfiReceived = 0;
        
        if (request.unwrapToWLFI) {
            // Must have vault configured on this chain
            if (vault == address(0) || vaultWrapper == address(0)) {
                revert VaultNotConfigured();
            }
            
            // Unwrap EAGLE → vEAGLE → WLFI
            wlfiReceived = _unwrapToWLFI(request.recipient, request.amount);
            
            // Check slippage
            if (wlfiReceived < request.minAmountOut) {
                revert SlippageExceeded();
            }
        } else {
            // Just mint EAGLE on destination chain
            _mint(request.recipient, request.amount);
            wlfiReceived = request.amount; // For event tracking
        }
        
        emit CrossChainWithdrawalReceived(
            _origin.srcEid,
            request.recipient,
            request.amount,
            wlfiReceived
        );
    }
    
    /**
     * @dev Handle share price update
     */
    function _handlePriceUpdate(bytes calldata _message) internal {
        (, uint256 newPrice) = abi.decode(_message, (uint16, uint256));
        _updateSharePrice(newPrice);
    }
    
    // ============ Internal Helper Functions ============
    
    /**
     * @dev Unwrap EAGLE to WLFI via vault
     * @param _recipient Recipient of WLFI
     * @param _amount Amount of EAGLE to unwrap
     * @return wlfiAmount Amount of WLFI received
     */
    function _unwrapToWLFI(
        address _recipient,
        uint256 _amount
    ) internal returns (uint256 wlfiAmount) {
        // Step 1: Unwrap EAGLE → vEAGLE shares
        IEagleVaultWrapper wrapper = IEagleVaultWrapper(vaultWrapper);
        uint256 vEagleShares = wrapper.unwrap(_amount);
        
        // Step 2: Withdraw vEAGLE → WLFI from vault
        IEagleOVault vaultContract = IEagleOVault(vault);
        
        // Calculate withdrawal with fees
        uint256 assetsBeforeFee = vaultContract.convertToAssets(vEagleShares);
        uint256 withdrawalFee = (assetsBeforeFee * withdrawalFeeBps) / 10000;
        wlfiAmount = assetsBeforeFee - withdrawalFee;
        
        // Execute withdrawal
        wlfiAmount = vaultContract.withdraw(
            wlfiAmount,
            _recipient,
            address(this)
        );
        
        return wlfiAmount;
    }
    
    /**
     * @dev Check and update daily withdrawal limits
     */
    function _checkWithdrawalLimit(uint16 _chainId, uint256 _amount) internal {
        // Reset counter if new day
        if (block.timestamp >= lastDailyReset[_chainId] + 1 days) {
            dailyWithdrawn[_chainId] = 0;
            lastDailyReset[_chainId] = block.timestamp;
        }
        
        uint256 limit = dailyWithdrawalLimit[_chainId];
        if (limit > 0) {
            uint256 newTotal = dailyWithdrawn[_chainId] + _amount;
            if (newTotal > limit) revert ExceedsWithdrawalLimit();
            dailyWithdrawn[_chainId] = newTotal;
        }
    }
    
    /**
     * @dev Update share price
     */
    function _updateSharePrice(uint256 _newPrice) internal {
        uint256 oldPrice = sharePrice;
        sharePrice = _newPrice;
        sharePriceLastUpdated = block.timestamp;
        
        emit SharePriceUpdated(oldPrice, _newPrice, block.timestamp);
    }
    
    // ============ Share Price Management ============
    
    /**
     * @notice Update share price from vault (only on main chain with vault)
     * @dev Should be called periodically on Ethereum
     */
    function updateSharePriceFromVault() external {
        require(vault != address(0), "Vault not configured");
        
        IEagleOVault vaultContract = IEagleOVault(vault);
        uint256 newPrice = vaultContract.convertToAssets(1e18); // 1 share to assets
        
        _updateSharePrice(newPrice);
    }
    
    /**
     * @notice Broadcast share price update to all remote chains
     * @param _dstEids Array of destination endpoint IDs
     * @param _extraOptions LayerZero options
     */
    function broadcastSharePrice(
        uint32[] calldata _dstEids,
        bytes calldata _extraOptions
    ) external payable onlyOwner {
        bytes memory payload = abi.encode(PT_PRICE_UPDATE, sharePrice);
        
        for (uint i = 0; i < _dstEids.length; i++) {
            MessagingFee memory fee = _quote(_dstEids[i], payload, _extraOptions, false);
            
            _lzSend(
                _dstEids[i],
                payload,
                _extraOptions,
                fee,
                payable(msg.sender)
            );
        }
    }
    
    /**
     * @notice Check if share price is stale
     */
    function isSharePriceStale() public view returns (bool) {
        return block.timestamp > sharePriceLastUpdated + maxSharePriceAge;
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Calculate expected WLFI output for EAGLE amount
     * @param _eagleAmount Amount of EAGLE
     * @return Expected WLFI amount after fees
     */
    function calculateWithdrawalOutput(uint256 _eagleAmount) external view returns (uint256) {
        // EAGLE to assets conversion
        uint256 assetsBeforeFee = (_eagleAmount * sharePrice) / 1e18;
        
        // Apply withdrawal fee
        uint256 withdrawalFee = (assetsBeforeFee * withdrawalFeeBps) / 10000;
        
        return assetsBeforeFee - withdrawalFee;
    }
    
    /**
     * @notice Get remaining daily withdrawal capacity
     */
    function getRemainingDailyCapacity(uint16 _chainId) external view returns (uint256) {
        uint256 limit = dailyWithdrawalLimit[_chainId];
        if (limit == 0) return type(uint256).max;
        
        if (block.timestamp >= lastDailyReset[_chainId] + 1 days) {
            return limit;
        }
        
        uint256 withdrawn = dailyWithdrawn[_chainId];
        return withdrawn >= limit ? 0 : limit - withdrawn;
    }
    
    // ============ Emergency Functions ============
    
    /**
     * @notice Pause all cross-chain operations
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Emergency withdrawal of stuck tokens
     * @param _token Token address
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(owner(), _amount);
        emit EmergencyWithdrawal(_token, _amount);
    }
    
    /**
     * @notice Recover stuck ETH
     */
    function recoverETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    // ============ Receive ETH ============
    
    receive() external payable {}
}

// ============ Interfaces ============

interface IEagleVaultWrapper {
    function wrap(uint256 vEagleShares) external returns (uint256 eagleAmount);
    function unwrap(uint256 eagleAmount) external returns (uint256 vEagleShares);
}

interface IEagleOVault {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function convertToAssets(uint256 shares) external view returns (uint256 assets);
    function convertToShares(uint256 assets) external view returns (uint256 shares);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

