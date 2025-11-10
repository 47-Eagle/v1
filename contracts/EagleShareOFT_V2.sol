// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { IEagleRegistry } from "./interfaces/IEagleRegistry.sol";

/**
 * @title EagleShareOFT V2
 * @notice Omnichain fungible token with LayerZero Composer integration
 * @dev Uses OApp Composer for atomic cross-chain vault operations
 * 
 * @dev FEATURES:
 *      - Standard OFT bridging (EAGLE ↔ EAGLE)
 *      - Atomic cross-chain withdrawal via Composer (EAGLE → WLFI)
 *      - EagleRegistry integration for deterministic addresses
 *      - Minter role for EagleVaultWrapper
 *      - Security features: pause, rate limiting, slippage protection
 * 
 * https://keybase.io/47eagle
 */
contract EagleShareOFT is OFT, ReentrancyGuard, Pausable {
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    /// @notice EagleRegistry for dynamic configuration
    IEagleRegistry public immutable registry;
    
    /// @notice Minter permissions (for EagleVaultWrapper integration)
    mapping(address => bool) public isMinter;
    
    /// @notice Address of the EagleVaultWrapper on this chain (if deployed)
    address public vaultWrapper;
    
    /// @notice Address of the EagleOVault on this chain (if deployed)
    address public vault;
    
    /// @notice Address of WLFI token on this chain (if deployed)
    address public wlfiToken;
    
    /// @notice Current share price (vEAGLE to WLFI conversion rate)
    /// @dev Synchronized across chains via Composer
    uint256 public sharePrice;
    
    /// @notice Last time share price was updated
    uint256 public sharePriceLastUpdated;
    
    /// @notice Daily withdrawal limit per destination chain (for security)
    mapping(uint32 => uint256) public dailyWithdrawalLimit;
    
    /// @notice Amount withdrawn today per destination chain
    mapping(uint32 => uint256) public dailyWithdrawn;
    
    /// @notice Last reset timestamp for daily limits
    mapping(uint32 => uint256) public lastDailyReset;
    
    /// @notice Withdrawal fee in basis points (e.g., 200 = 2%)
    uint256 public withdrawalFeeBps = 200;
    
    // ============================================
    // COMPOSE MESSAGE TYPES
    // ============================================
    
    /// @dev Compose message type for unwrapping EAGLE → WLFI
    uint16 public constant MSG_TYPE_UNWRAP = 1;
    
    /// @dev Compose message type for share price update
    uint16 public constant MSG_TYPE_PRICE_UPDATE = 2;
    
    // ============================================
    // STRUCTS
    // ============================================
    
    /// @notice Unwrap request data for Composer
    struct UnwrapRequest {
        address recipient;
        uint256 minAmountOut; // Slippage protection
    }
    
    // ============================================
    // EVENTS
    // ============================================
    
    event MinterUpdated(address indexed minter, bool status);
    event VaultConfigured(address indexed vault, address indexed wrapper);
    event WithdrawalLimitUpdated(uint32 indexed dstEid, uint256 newLimit);
    event CrossChainUnwrapInitiated(
        address indexed sender,
        uint32 indexed dstEid,
        address indexed recipient,
        uint256 amount
    );
    event CrossChainUnwrapCompleted(
        address indexed recipient,
        uint256 eagleAmount,
        uint256 wlfiAmount
    );
    event SharePriceUpdated(uint256 oldPrice, uint256 newPrice, uint256 timestamp);
    event EmergencyWithdrawal(address indexed token, uint256 amount);
    
    // ============================================
    // ERRORS
    // ============================================
    
    error ZeroAddress();
    error NotMinter();
    error InvalidAmount();
    error ExceedsWithdrawalLimit();
    error VaultNotConfigured();
    error SlippageExceeded();
    error InvalidMessageType();
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    /**
     * @notice Creates Eagle Share OFT with Registry integration
     * @param _name Token name (e.g., "Eagle")
     * @param _symbol Token symbol (e.g., "EAGLE")
     * @param _registry EagleRegistry for dynamic configuration
     * @param _delegate Contract delegate/owner
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _registry,
        address _delegate
    ) OFT(_name, _symbol, _getLzEndpoint(_registry), _delegate) Ownable(_delegate) {
        if (_delegate == address(0)) revert ZeroAddress();
        if (_registry == address(0)) revert ZeroAddress();
        
        registry = IEagleRegistry(_registry);
        sharePrice = 1e18; // Initialize at 1:1
        sharePriceLastUpdated = block.timestamp;
    }
    
    /**
     * @notice Helper to get LayerZero endpoint from registry
     */
    function _getLzEndpoint(address _registry) private view returns (address) {
        if (_registry == address(0)) revert ZeroAddress();
        address endpoint = IEagleRegistry(_registry).getLayerZeroEndpoint(uint16(block.chainid));
        if (endpoint == address(0)) revert ZeroAddress();
        return endpoint;
    }
    
    // ============================================
    // CONFIGURATION FUNCTIONS
    // ============================================
    
    /**
     * @notice Configure vault and wrapper addresses
     * @dev Only needed on chains with vault deployment (e.g., Ethereum)
     */
    function configureVault(
        address _vault,
        address _wrapper,
        address _wlfi
    ) external onlyOwner {
        if (_vault == address(0) || _wrapper == address(0) || _wlfi == address(0)) {
            revert ZeroAddress();
        }
        vault = _vault;
        vaultWrapper = _wrapper;
        wlfiToken = _wlfi;
        emit VaultConfigured(_vault, _wrapper);
    }
    
    /**
     * @notice Set minter permission
     */
    function setMinter(address minter, bool status) external onlyOwner {
        if (minter == address(0)) revert ZeroAddress();
        isMinter[minter] = status;
        emit MinterUpdated(minter, status);
    }
    
    /**
     * @notice Set daily withdrawal limit for a destination chain
     */
    function setWithdrawalLimit(uint32 _dstEid, uint256 _limit) external onlyOwner {
        dailyWithdrawalLimit[_dstEid] = _limit;
        emit WithdrawalLimitUpdated(_dstEid, _limit);
    }
    
    /**
     * @notice Update withdrawal fee
     */
    function setWithdrawalFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 1000, "Fee too high"); // Max 10%
        withdrawalFeeBps = _feeBps;
    }
    
    // ============================================
    // MINTER FUNCTIONS
    // ============================================
    
    /**
     * @notice Mint tokens (minter only)
     * @dev Used by EagleVaultWrapper when wrapping vault shares
     */
    function mint(address to, uint256 amount) external {
        if (!isMinter[msg.sender] && msg.sender != owner()) revert NotMinter();
        if (to == address(0)) revert ZeroAddress();
        require(amount > 0, "Mint amount must be greater than 0");
        _mint(to, amount);
    }
    
    /**
     * @notice Burn tokens (minter only)
     * @dev Used by EagleVaultWrapper when unwrapping to vault shares
     */
    function burn(address from, uint256 amount) external {
        if (!isMinter[msg.sender] && msg.sender != owner()) revert NotMinter();
        if (from == address(0)) revert ZeroAddress();
        
        // Check allowance if needed
        bool isAuthorizedBurner = isMinter[msg.sender] || msg.sender == owner();
        if (from != msg.sender && !isAuthorizedBurner) {
            uint256 currentAllowance = allowance(from, msg.sender);
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            _approve(from, msg.sender, currentAllowance - amount);
        }
        
        _burn(from, amount);
    }
    
    // ============================================
    // ATOMIC CROSS-CHAIN WITHDRAWAL
    // ============================================
    
    /**
     * @notice Send EAGLE and unwrap to WLFI on destination chain (atomic)
     * @dev Uses LayerZero Composer pattern
     * 
     * @param _dstEid Destination chain endpoint ID
     * @param _recipient Address to receive WLFI on destination
     * @param _amount Amount of EAGLE to send and unwrap
     * @param _minAmountOut Minimum WLFI to receive (slippage protection)
     * @param _options LayerZero execution options
     * 
     * @return receipt MessagingReceipt from LayerZero
     */
    function sendAndUnwrap(
        uint32 _dstEid,
        address _recipient,
        uint256 _amount,
        uint256 _minAmountOut,
        bytes calldata _options
    ) external payable nonReentrant whenNotPaused returns (MessagingReceipt memory receipt) {
        if (_amount == 0) revert InvalidAmount();
        if (_recipient == address(0)) revert ZeroAddress();
        
        // Check daily withdrawal limit
        _checkWithdrawalLimit(_dstEid, _amount);
        
        // Encode compose message for destination
        UnwrapRequest memory request = UnwrapRequest({
            recipient: _recipient,
            minAmountOut: _minAmountOut
        });
        bytes memory composeMsg = abi.encode(MSG_TYPE_UNWRAP, request);
        
        // Build SendParam with compose message
        SendParam memory sendParam = SendParam({
            dstEid: _dstEid,
            to: addressToBytes32(address(this)), // Send to this contract on dst
            amountLD: _amount,
            minAmountLD: _amount, // No slippage on transfer, only on unwrap
            extraOptions: _options,
            composeMsg: composeMsg,
            oftCmd: ""
        });
        
        // Calculate fees
        MessagingFee memory fee = _quote(sendParam, false);
        require(msg.value >= fee.nativeFee, "Insufficient fee");
        
        // Execute send
        receipt = _send(msg.sender, sendParam, fee, msg.sender);
        
        emit CrossChainUnwrapInitiated(msg.sender, _dstEid, _recipient, _amount);
        
        return receipt;
    }
    
    /**
     * @notice Quote fee for cross-chain unwrap
     */
    function quoteSendAndUnwrap(
        uint32 _dstEid,
        uint256 _amount,
        uint256 _minAmountOut,
        bytes calldata _options
    ) external view returns (MessagingFee memory fee) {
        UnwrapRequest memory request = UnwrapRequest({
            recipient: msg.sender,
            minAmountOut: _minAmountOut
        });
        bytes memory composeMsg = abi.encode(MSG_TYPE_UNWRAP, request);
        
        SendParam memory sendParam = SendParam({
            dstEid: _dstEid,
            to: addressToBytes32(address(this)),
            amountLD: _amount,
            minAmountLD: _amount,
            extraOptions: _options,
            composeMsg: composeMsg,
            oftCmd: ""
        });
        
        return _quote(sendParam, false);
    }
    
    // ============================================
    // LAYERZERO COMPOSER INTEGRATION
    // ============================================
    
    /**
     * @notice Called by LayerZero Endpoint after tokens arrive
     * @dev Handles unwrapping EAGLE → vEAGLE → WLFI
     * 
     * @param _from Source chain address (this contract)
     * @param _guid Message GUID
     * @param _message Compose message (contains UnwrapRequest)
     * @param _executor Executor address
     * @param _extraData Additional data
     */
    function lzCompose(
        address _from,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external payable override {
        // Only callable by LayerZero endpoint
        require(msg.sender == address(endpoint), "Only endpoint");
        
        // Decode message type
        (uint16 msgType) = abi.decode(_message, (uint16));
        
        if (msgType == MSG_TYPE_UNWRAP) {
            _handleUnwrap(_message);
        } else if (msgType == MSG_TYPE_PRICE_UPDATE) {
            _handlePriceUpdate(_message);
        } else {
            revert InvalidMessageType();
        }
    }
    
    /**
     * @dev Handle unwrap compose message
     */
    function _handleUnwrap(bytes calldata _message) internal {
        (, UnwrapRequest memory request) = abi.decode(
            _message,
            (uint16, UnwrapRequest)
        );
        
        if (vault == address(0) || vaultWrapper == address(0)) {
            revert VaultNotConfigured();
        }
        
        // Get EAGLE balance received
        uint256 eagleBalance = balanceOf(address(this));
        if (eagleBalance == 0) revert InvalidAmount();
        
        // Step 1: Unwrap EAGLE → vEAGLE via wrapper
        IEagleVaultWrapper wrapper = IEagleVaultWrapper(vaultWrapper);
        
        // Approve wrapper to burn EAGLE
        _approve(address(this), vaultWrapper, eagleBalance);
        uint256 vEagleShares = wrapper.unwrap(eagleBalance);
        
        // Step 2: Withdraw vEAGLE → WLFI via vault
        IEagleOVault vaultContract = IEagleOVault(vault);
        
        // Calculate assets and apply fee
        uint256 assetsBeforeFee = vaultContract.convertToAssets(vEagleShares);
        uint256 withdrawalFee = (assetsBeforeFee * withdrawalFeeBps) / 10000;
        uint256 assetsToWithdraw = assetsBeforeFee - withdrawalFee;
        
        // Check slippage
        if (assetsToWithdraw < request.minAmountOut) {
            revert SlippageExceeded();
        }
        
        // Approve vault to burn vEAGLE shares
        // Note: Assumes this contract has vEAGLE shares after unwrap
        // The wrapper should transfer vEAGLE to this contract
        
        // Execute withdrawal - vault sends WLFI to recipient
        uint256 wlfiReceived = vaultContract.withdraw(
            assetsToWithdraw,
            request.recipient,
            address(this)
        );
        
        emit CrossChainUnwrapCompleted(request.recipient, eagleBalance, wlfiReceived);
    }
    
    /**
     * @dev Handle share price update
     */
    function _handlePriceUpdate(bytes calldata _message) internal {
        (, uint256 newPrice) = abi.decode(_message, (uint16, uint256));
        
        uint256 oldPrice = sharePrice;
        sharePrice = newPrice;
        sharePriceLastUpdated = block.timestamp;
        
        emit SharePriceUpdated(oldPrice, newPrice, block.timestamp);
    }
    
    // ============================================
    // SHARE PRICE MANAGEMENT
    // ============================================
    
    /**
     * @notice Update share price from vault (main chain only)
     */
    function updateSharePriceFromVault() external {
        require(vault != address(0), "Vault not configured");
        
        IEagleOVault vaultContract = IEagleOVault(vault);
        uint256 newPrice = vaultContract.convertToAssets(1e18);
        
        uint256 oldPrice = sharePrice;
        sharePrice = newPrice;
        sharePriceLastUpdated = block.timestamp;
        
        emit SharePriceUpdated(oldPrice, newPrice, block.timestamp);
    }
    
    /**
     * @notice Broadcast share price to remote chains
     * @dev Uses Composer to sync price across chains
     */
    function broadcastSharePrice(
        uint32[] calldata _dstEids,
        bytes calldata _options
    ) external payable onlyOwner {
        bytes memory composeMsg = abi.encode(MSG_TYPE_PRICE_UPDATE, sharePrice);
        
        for (uint i = 0; i < _dstEids.length; i++) {
            // Send 1 wei of EAGLE with price update message
            SendParam memory sendParam = SendParam({
                dstEid: _dstEids[i],
                to: addressToBytes32(address(this)),
                amountLD: 1,
                minAmountLD: 1,
                extraOptions: _options,
                composeMsg: composeMsg,
                oftCmd: ""
            });
            
            MessagingFee memory fee = _quote(sendParam, false);
            _send(address(this), sendParam, fee, msg.sender);
        }
    }
    
    // ============================================
    // INTERNAL HELPERS
    // ============================================
    
    /**
     * @dev Check and update daily withdrawal limits
     */
    function _checkWithdrawalLimit(uint32 _dstEid, uint256 _amount) internal {
        // Reset counter if new day
        if (block.timestamp >= lastDailyReset[_dstEid] + 1 days) {
            dailyWithdrawn[_dstEid] = 0;
            lastDailyReset[_dstEid] = block.timestamp;
        }
        
        uint256 limit = dailyWithdrawalLimit[_dstEid];
        if (limit > 0) {
            uint256 newTotal = dailyWithdrawn[_dstEid] + _amount;
            if (newTotal > limit) revert ExceedsWithdrawalLimit();
            dailyWithdrawn[_dstEid] = newTotal;
        }
    }
    
    /**
     * @dev Convert address to bytes32
     */
    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @notice Calculate expected WLFI output
     */
    function calculateWithdrawalOutput(uint256 _eagleAmount) external view returns (uint256) {
        uint256 assetsBeforeFee = (_eagleAmount * sharePrice) / 1e18;
        uint256 withdrawalFee = (assetsBeforeFee * withdrawalFeeBps) / 10000;
        return assetsBeforeFee - withdrawalFee;
    }
    
    /**
     * @notice Get remaining daily capacity
     */
    function getRemainingDailyCapacity(uint32 _dstEid) external view returns (uint256) {
        uint256 limit = dailyWithdrawalLimit[_dstEid];
        if (limit == 0) return type(uint256).max;
        
        if (block.timestamp >= lastDailyReset[_dstEid] + 1 days) {
            return limit;
        }
        
        uint256 withdrawn = dailyWithdrawn[_dstEid];
        return withdrawn >= limit ? 0 : limit - withdrawn;
    }
    
    /**
     * @notice Check if address is a minter
     */
    function checkMinter(address account) external view returns (bool) {
        return isMinter[account] || account == owner();
    }
    
    /**
     * @notice Get contract version
     */
    function version() external pure returns (string memory) {
        return "2.0.0-composer";
    }
    
    // ============================================
    // EMERGENCY FUNCTIONS
    // ============================================
    
    /**
     * @notice Pause all operations
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
    
    receive() external payable {}
}

// ============================================
// INTERFACES
// ============================================

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

