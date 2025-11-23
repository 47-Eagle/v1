AlphaProVault
The contract that manages liquidity, and processes deposits and withdrawals.

deposit

Copy
function deposit(
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        address to
)
        external
        override
        nonReentrant
        returns (uint256 shares, uint256 amount0, uint256 amount1)
Deposit tokens in proportion to the vault's current holdings. These tokens will remain in the vault, and are not used for liquidity until the next rebalance.

Parameters:
Varible
Type
Description
amount0Desired

uint256

The maximum amount of token0 to deposit.

amount1Desired

uint256

The maximum amount of token1 to deposit.

amount0Min

uint256

Transaction will revert if the amount of token0 deposited is less than this.

amount1Min

uint256

Transaction will revert if the amount of token1 deposited is less than this.

to

address

The recipient of vault shares minted by  the vault.

Returns:
Varible
Type
Description
shares

uint256

The number of vault shares minted by the vault.

amount0

uint256

The amount of token0 deposited into the vault.

amount1

uint256

The amount of token1 deposited into the vault.

withdraw

Copy
function withdraw(
    uint256 shares,
    uint256 amount0Min,
    uint256 amount1Min,
    address to
) 
    external
    override
    nonReentrant
    returns (uint256 amount0, uint256 amount1)
Withdraws tokens in proportion to the vault's current holdings and the fees earned by the vault.

Parameters:
Varible
Type
Description
shares

uint256

The amount of shares to be burned.

amount0Min

uint256

Transaction will revert if the amount of token0 received by the withdrawer is smaller than this.

amount1Min

uint256

Transaction will revert if the amount of token1 received by the withdrawer is smaller than this.

to

address

The recipient of the tokens withdrawn.

Returns:
Varible
Type
Description
amount0

uint256

The amount of token0 sent to the recipient.

amount1

uint256

The amount of token1 sent to the recipient.

rebalance

Copy
function rebalance() external override nonReentrant
Updates the vault's positions. Anyone can call rebalance, unless the vault manager calls setRebalanceDelegate to nominate a specific wallet to rebalance.

checkCanRebalance

Copy
function checkCanRebalance() public view override
Check whether the vault can rebalance. Revert with an error code if it cannot.

getTwap

Copy
function getTwap() public view returns (int24)
Fetches the time-weighted average price in ticks from Uniswap pool.

Returns:
Varible
Type
Description
int24

the time-weighted average price in ticks.

getTotalAmounts

Copy
function getTotalAmounts() 
    public 
    view override 
    returns (uint256 total0, uint256 total1)
Calculates the vault's total holdings of token0 and token1 - ie how much of each token the vault would hold if it withdrew all its liquidity from Uniswap. Includes owed fees but excludes the proportion of fees that will be paid to the protocol and vault manager.

Returns:
Varible
Type
Description
total0

uint256

The total amount of total0 held by the vault.

total1

uint256

The total amount of total1 held by the vault.

getBalance0

Copy
function getBalance0() public view override returns (uint256)
The amount of unused token0 held by the vault.

Returns:
Varible
Type
Description
uint256

The balance of token0 in the vault not used in any position. All of this balance minus the protocol and manager fees will be deposited into Uniswap when rebalance is called.

getBalance1

Copy
function getBalance1() public view override returns (uint256)
The amount of unused token1 held by the vault.

Returns:
Varible
Type
Description
uint256

The balance of token1 in the vault not used in any position. All of this balance minus the protocol and manager fees will be deposited into Uniswap when rebalance is called.

collectProtocol

Copy
collectProtocol(address to) external
Collects all the uncollected protocol fees accrued by the vault. Can only be called by Charm Governance.

Parameters:
Varible
Type
Description
to

address

The protocol fees' recipient.

collectManager

Copy
collectManager(address to) external onlyManager
Collects all the uncollected manager fees accrued by the vault. Can only be called by the vault manager.

Parameters:
Varible
Type
Description
to

address

The manager fees' recipient.

sweep

Copy
function sweep(
    IERC20Upgradeable token
    uint256 amount
    address to
) 
    external onlyManager 
Removes tokens accidentally sent to this vault. Can only be called by the vault manager.

Parameters:
Varible
Type
Description
token

IERC20Upgradeable

The ERC-20 token to be removed from the vault. Revert if token is token0 or token1.

amount

uint256

amount of tokens to sweep.

to

address

The recipient of the token swept.

setBaseThreshold

Copy
function setBaseThreshold(int24 _baseThreshold) external onlyManager
Setting the baseThreshold. Can only be called by the vault manager.

Parameters:
Varible
Type
Description
_baseThreshold

int24

The width of the base-order in ticks.

setLimitThreshold

Copy
function setLimitThreshold(int24 _baseThreshold) external onlyManager
Setting the limitThreshold. Can only be called by the vault manager.

Parameters:
Varible
Type
Description
_limitThreshold

int24

The width of the limit-order in ticks.

setFullRangeWeight

Copy
function setFullRangeWeight(uint256 _fullRangeWeight) external onlyManager
Setting the  fullRangeWeight . Can only be called by the vault manager.

Parameters:
Varible
Type
Description
_fullRangeWeight

uint256

The maximum % of total liquidity deposited into a Full-Range Position, with 1 unit of _fullRangeWeight = 1e-4 % full-range liquidity.

setPeriod

Copy
function setPeriod(uint256 _period) external onlyManager
Setting the rebalancing period. Can only be called by the vault manager.

Parameters:
Varible
Type
Description
_period

uint256

Rebalance will revert if the time interval (in seconds) between rebalances is less than _period.

setMinTickMove

Copy
function setMinTickMove(int24 _minTickMove) external onlyManager
Setting the minimum tick movement between rebalance. Can only be called by the vault manager.

Parameters:
Varible
Type
Description
_minTickMove

int24

Rebalance will revert if the price difference since the last rebalance is less than the _minTickMove.

setTwapDuration

Copy
function setTwapDuration(uint32 _twapDuration) external onlyManager
Setting the Security Parameter to calculate the TWAP. Can only be called by the vault manager.

Parameters:
Variable
Type
Description
_twapDuration

uint32

The time period in seconds over which the TWAP is calculated. 

setMaxTwapDeviation

Copy
function setMaxTwapDeviation(int24 _maxTwapDeviation) external onlyManagersol
Setting the Security Parameter that determines the maximum TWAP deviation. Can only be called by the vault manager.

Parameters:
Variable
Type
Description
_maxTwapDeviation

int24

Rebalance will revert if the spot price deviates from the TWAP by at least this amount.

setMaxTotalSupply

Copy
function setMaxTotalSupply(uint256 _maxTotalSupply) external onlyManager
Setting the Information Parameter that determines a vault's maximum capacity. Can only be called by the vault manager.

Parameters:
Variable
Type
Description
_maxTotalSupply

uint256

The maximum shares the vault can mint. Deposit will revert if the total amount of vault shares after a deposit is more than the_maxTotalSupply.

emergencyBurn

Copy
function emergencyBurn(
    int24 tickLower,
    int24 tickUpper,
    uint128 liquidity
) 
    external onlyManager 
Removes the vault's liquidity in a given range. Can only be called by the vault manager.

Parameters:
Variable
Type
Description
tickLower

int24

The lower limit of the range to remove liquidity. 

tickUpper

int24

The upper limit of the range to remove liquidity. 

liquidity

uint128

The amount of liquidity to remove.

setManager

Copy
function setManager(address _manager) external onlyManager
The first step to change a vault's manager. Can only called by the vault manager.

Parameters:
Variable
Type
Description
_manager

address

The address of the new vault manager. The changes will not take effect until the new address calls acceptManager.

acceptManager

Copy
function acceptManager() external
The second step to change a vault manager. Can only be called by the address assigned to _manager.

State Changes:
Variable
Type
Description
manager

address

Setting the value of manager as the address of the new vault manager.

setManagerFee

Copy
function setManagerFee(uint256 _pendingManagerFee) external onlyManager 
Setting a fee for the vault manager, as a % of fees received from Uniswap. Can only be called by the vault manager.

Parameters:
Variable
Type
Description
_pendingManagerFee

uint256

The amount of manager fees as a % of fees earned by the vault, with 1 unit of fees = 1e-4 % of fees earned. 

The maximum manager fee is 20000 units (20%).

The fee will take effect from the next rebalance.

setRebalanceDelegate

Copy
function setRebalanceDelegate(address _rebalanceDelegate) external onlyManager
Switch on/off private rebalancing. Can only be called by the vault manager.

Parameters:
Variable
Type
Description
_rebalanceDelegate

address

Setting an address other than the Zero Address will switch on private rebalancing, which means only rebalanceDelegate and the vault manager's address can call rebalance.

Getter functions for public variables
Getter functions are automatically generated for the following public variables:

Pool Variables
Variable
Type
Description
pool

IUniswapV3Pool

The pool for which the vault is managing the liquidity.

token0

IERC20Upgradeable

The first ERC-20 token within the pool.

token1

IERC20Upgradeable

The second ERC-20 token within the pool.

tickSpacing

int24

The distance between initializable ticks within the pool

Vault Variables
Variable
Type
Description
name

string

The name of the vault shares representing the vault

symbol

string

The symbol of the vault shares representing the vault

maxTotalSupply

uint256

The maximum vault shares that can be mined by the vault.

MINIMUM_LIQUIDITY

uint256

The minimum vault shares minted by the vault.

Protocol Variables
Variable
Type
Description
factory

AlphaProVaultFactory

The Alpha Vaults factory contract used to create liquidity vaults

protocolFee

uint256

The protocol fee applied to this vault.

accruedProtocolFees0

uint256

Total amount of uncollected protocol fees within the vault.

accruedProtocolFees1

uint256

Total amount of uncollected protocol fees within the vault.

Strategy Variables
Variable
Type
Description
fullRangeWeight

uint256

The maximum % of full range liquidity held by the vault, with 1 unit of fullRangeWeight = 1e-4 % full-range liquidity.

baseThreshold

int24

The width of the base-order in ticks.

limitThreshold

int24

The width of the limit-order in ticks.

period

uint256

Rebalance will revert if the time interval (in seconds) between rebalances is less than period.

lastTimestamp

uint256

The time stamp of the last rebalance.

lastTick

int24

The market price of the tokens within the pool at the latest rebalance.

fullLower

int24

The lower limit of a full range position.

fullUpper

int24

The upper limit of a full range position.

baseLower

int24

The lower limit of the base-order selected by the vault at rebalance.

baseUpper

int24

The upper limit of the base-order selected by the vault at rebalance.

limitLower

int24

The lower limit of the limit-order selected by the vault at rebalance.

limitUpper

int24

The upper limit of the limit-order selected by the vault at rebalance.

Security Variables
maxTwapDeviation

int24

Rebalance will revert if the spot price deviates from the TWAP by this amount.

twapDuration

uint32

The time period in seconds over which the TWAP is calculated. 

Gas Optimization Variables
minTickMove

int24

Rebalance will revert if the price movements since the last rebalance is less than the _minTickMove.

Vault Manager Variables
Variable
Type
Description
manager

address

The address of the vault manager.

pendingManager

address

The provisional address of the vault manager. Not finalised until acceptManager is called.

rebalanceDelegate

address

IfrebalanceDelegate is the Zero Address, anyone can call rebalance.

Otherwise, only rebalanceDelegate and the vault manager's address can call rebalance.

managerFee

uint256

The vault manager fee applied to this vault.

pendingManagerFee

uint256

The manager fee to be applied at the next rebalance, after the fee was changed using setManagerFee

accruedManagerFees0

uint256

Total amount of uncollected manager fees within the vault.

accruedManagerFees1

uint256

Total amount of uncollected manager fees within the vault.