import { BigInt, BigDecimal, Address, ethereum } from "@graphprotocol/graph-ts"
import {
  Deposit as DepositEvent,
  Withdraw as WithdrawEvent,
  DualDeposit as DualDepositEvent,
  Reported as ReportedEvent,
  StrategyDeployed as StrategyDeployedEvent,
  Rebalanced as RebalancedEvent,
} from "../generated/EagleOVault/EagleOVault"
import {
  StrategyDeposit as StrategyDepositEvent,
  StrategyWithdraw as StrategyWithdrawEvent,
  StrategyRebalanced as StrategyRebalancedEvent,
} from "../generated/USD1Strategy/CharmStrategy"
import {
  Deposit as CharmDepositEvent,
  Withdraw as CharmWithdrawEvent,
} from "../generated/templates/CharmVaultUSD1/CharmVault"
import {
  Vault,
  VaultSnapshot,
  CollectFeeEvent,
  Deposit,
  Withdrawal,
  Rebalance,
  GlobalStats,
  DailySnapshot
} from "../generated/schema"

// Constants
const VAULT_ADDRESS = "0x47b3ef629d9cb8dfcf8a6c61058338f4e99d7953"
const USD1_STRATEGY_ADDRESS = "0x47b2659747d6a7e00c8251c3c3f7e92625a8cf6f"
const WETH_STRATEGY_ADDRESS = "0x5c525af4153b1c43f9c06c31d32a84637c617ffe"
const USD1_CHARM_VAULT = "0x22828dbf15f5fba2394ba7cf8fa9a96bdb444b71"
const WETH_CHARM_VAULT = "0x3314e248f3f752cd16939773d83beb3a362f0aef"
const GLOBAL_STATS_ID = "1"
const SECONDS_PER_DAY = BigInt.fromI32(86400)

// Helper functions
function loadOrCreateVault(address: string): Vault {
  let vault = Vault.load(address)
  if (!vault) {
    vault = new Vault(address)
    vault.totalAssets = BigInt.fromI32(0)
    vault.totalSupply = BigInt.fromI32(0)
    vault.sharePrice = BigDecimal.fromString("1.0")
    vault.createdAt = BigInt.fromI32(0)
    vault.updatedAt = BigInt.fromI32(0)
  }
  return vault
}

function loadOrCreateGlobalStats(): GlobalStats {
  let stats = GlobalStats.load(GLOBAL_STATS_ID)
  if (!stats) {
    stats = new GlobalStats(GLOBAL_STATS_ID)
    stats.totalValueLocked = BigInt.fromI32(0)
    stats.totalDeposits = BigInt.fromI32(0)
    stats.totalWithdrawals = BigInt.fromI32(0)
    stats.totalFeesCaptured = BigInt.fromI32(0)
  }
  return stats
}

function loadOrCreateDailySnapshot(timestamp: BigInt): DailySnapshot {
  const dayId = timestamp.div(SECONDS_PER_DAY)
  const id = dayId.toString()
  
  let snapshot = DailySnapshot.load(id)
  if (!snapshot) {
    snapshot = new DailySnapshot(id)
    snapshot.stats = GLOBAL_STATS_ID
    snapshot.date = dayId.times(SECONDS_PER_DAY)
    snapshot.totalValueLocked = BigInt.fromI32(0)
    snapshot.dailyVolume = BigInt.fromI32(0)
    snapshot.dailyFees = BigInt.fromI32(0)
    snapshot.sharePrice = BigDecimal.fromString("1.0")
    snapshot.apy = null
  }
  return snapshot
}

function createVaultSnapshot(
  vault: Vault,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  const id = vault.id + "-" + timestamp.toString()
  let snapshot = new VaultSnapshot(id)
  
  snapshot.vault = vault.id
  snapshot.timestamp = timestamp
  snapshot.totalAssets = vault.totalAssets
  snapshot.totalSupply = vault.totalSupply
  snapshot.sharePrice = vault.sharePrice
  snapshot.usd1StrategyTVL = BigInt.fromI32(0) // Will be updated by strategy events
  snapshot.wethStrategyTVL = BigInt.fromI32(0)
  snapshot.liquidWLFI = BigInt.fromI32(0)
  snapshot.liquidUSD1 = BigInt.fromI32(0)
  
  snapshot.save()
}

// Event Handlers for Main Vault

export function handleDeposit(event: DepositEvent): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  vault.totalAssets = vault.totalAssets.plus(event.params.assets)
  vault.totalSupply = vault.totalSupply.plus(event.params.shares)
  
  // Calculate share price
  if (vault.totalSupply.gt(BigInt.fromI32(0))) {
    vault.sharePrice = vault.totalAssets.toBigDecimal().div(vault.totalSupply.toBigDecimal())
  }
  
  vault.updatedAt = event.block.timestamp
  vault.save()
  
  // Create Deposit entity
  const deposit = new Deposit(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  deposit.vault = vault.id
  deposit.sender = event.params.sender
  deposit.owner = event.params.owner
  deposit.assets = event.params.assets
  deposit.shares = event.params.shares
  deposit.timestamp = event.block.timestamp
  deposit.blockNumber = event.block.number
  deposit.transactionHash = event.transaction.hash
  deposit.save()
  
  // Update global stats
  const stats = loadOrCreateGlobalStats()
  stats.totalDeposits = stats.totalDeposits.plus(event.params.assets)
  stats.totalValueLocked = stats.totalValueLocked.plus(event.params.assets)
  stats.save()
  
  // Create snapshot
  createVaultSnapshot(vault, event.block.timestamp, event.block.number)
  
  // Update daily snapshot
  const daily = loadOrCreateDailySnapshot(event.block.timestamp)
  daily.totalValueLocked = stats.totalValueLocked
  daily.dailyVolume = daily.dailyVolume.plus(event.params.assets)
  daily.sharePrice = vault.sharePrice
  daily.save()
}

export function handleWithdraw(event: WithdrawEvent): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  vault.totalAssets = vault.totalAssets.minus(event.params.assets)
  vault.totalSupply = vault.totalSupply.minus(event.params.shares)
  
  // Calculate share price
  if (vault.totalSupply.gt(BigInt.fromI32(0))) {
    vault.sharePrice = vault.totalAssets.toBigDecimal().div(vault.totalSupply.toBigDecimal())
  }
  
  vault.updatedAt = event.block.timestamp
  vault.save()
  
  // Create Withdrawal entity
  const withdrawal = new Withdrawal(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  withdrawal.vault = vault.id
  withdrawal.sender = event.params.sender
  withdrawal.receiver = event.params.receiver
  withdrawal.owner = event.params.owner
  withdrawal.assets = event.params.assets
  withdrawal.shares = event.params.shares
  withdrawal.timestamp = event.block.timestamp
  withdrawal.blockNumber = event.block.number
  withdrawal.transactionHash = event.transaction.hash
  withdrawal.save()
  
  // Update global stats
  const stats = loadOrCreateGlobalStats()
  stats.totalWithdrawals = stats.totalWithdrawals.plus(event.params.assets)
  stats.totalValueLocked = stats.totalValueLocked.minus(event.params.assets)
  stats.save()
  
  // Create snapshot
  createVaultSnapshot(vault, event.block.timestamp, event.block.number)
  
  // Update daily snapshot
  const daily = loadOrCreateDailySnapshot(event.block.timestamp)
  daily.totalValueLocked = stats.totalValueLocked
  daily.dailyVolume = daily.dailyVolume.plus(event.params.assets)
  daily.sharePrice = vault.sharePrice
  daily.save()
}

export function handleDualDeposit(event: DualDepositEvent): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  vault.totalAssets = vault.totalAssets.plus(event.params.totalWlfiDeposited)
  vault.totalSupply = vault.totalSupply.plus(event.params.shares)
  
  // Calculate share price
  if (vault.totalSupply.gt(BigInt.fromI32(0))) {
    vault.sharePrice = vault.totalAssets.toBigDecimal().div(vault.totalSupply.toBigDecimal())
  }
  
  vault.updatedAt = event.block.timestamp
  vault.save()
  
  // Create Deposit entity
  const deposit = new Deposit(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  deposit.vault = vault.id
  deposit.sender = event.params.user
  deposit.owner = event.params.user
  deposit.assets = event.params.totalWlfiDeposited
  deposit.shares = event.params.shares
  deposit.timestamp = event.block.timestamp
  deposit.blockNumber = event.block.number
  deposit.transactionHash = event.transaction.hash
  deposit.save()
  
  // Update global stats
  const stats = loadOrCreateGlobalStats()
  stats.totalDeposits = stats.totalDeposits.plus(event.params.totalWlfiDeposited)
  stats.totalValueLocked = stats.totalValueLocked.plus(event.params.totalWlfiDeposited)
  stats.save()
  
  // Create snapshot
  createVaultSnapshot(vault, event.block.timestamp, event.block.number)
}

export function handleReported(event: ReportedEvent): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  
  // Track fees collected
  if (event.params.performanceFees.gt(BigInt.fromI32(0))) {
    const feeEvent = new CollectFeeEvent(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
    feeEvent.vault = vault.id
    feeEvent.strategy = Address.zero() // From vault itself
    feeEvent.charmVault = Address.zero()
    feeEvent.amount0 = event.params.performanceFees
    feeEvent.amount1 = BigInt.fromI32(0)
    feeEvent.timestamp = event.block.timestamp
    feeEvent.blockNumber = event.block.number
    feeEvent.transactionHash = event.transaction.hash
    feeEvent.save()
    
    // Update global stats
    const stats = loadOrCreateGlobalStats()
    stats.totalFeesCaptured = stats.totalFeesCaptured.plus(event.params.performanceFees)
    stats.save()
  }
  
  vault.totalAssets = event.params.totalAssets
  vault.updatedAt = event.block.timestamp
  vault.save()
  
  // Create snapshot
  createVaultSnapshot(vault, event.block.timestamp, event.block.number)
}

export function handleStrategyDeployed(event: StrategyDeployedEvent): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  vault.updatedAt = event.block.timestamp
  vault.save()
  
  // Create snapshot
  createVaultSnapshot(vault, event.block.timestamp, event.block.number)
}

export function handleRebalanced(event: RebalancedEvent): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  vault.updatedAt = event.block.timestamp
  vault.save()
  
  // Create Rebalance entity
  const rebalance = new Rebalance(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  rebalance.vault = vault.id
  rebalance.strategy = Address.zero()
  rebalance.timestamp = event.block.timestamp
  rebalance.blockNumber = event.block.number
  rebalance.transactionHash = event.transaction.hash
  rebalance.save()
  
  // Create snapshot
  createVaultSnapshot(vault, event.block.timestamp, event.block.number)
}

// Event Handlers for Strategies

export function handleStrategyDeposit(event: StrategyDepositEvent): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  vault.updatedAt = event.block.timestamp
  vault.save()
  
  // Create snapshot
  createVaultSnapshot(vault, event.block.timestamp, event.block.number)
}

export function handleStrategyWithdraw(event: StrategyWithdrawEvent): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  vault.updatedAt = event.block.timestamp
  vault.save()
  
  // Create snapshot
  createVaultSnapshot(vault, event.block.timestamp, event.block.number)
}

export function handleStrategyRebalanced(event: StrategyRebalancedEvent): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  vault.updatedAt = event.block.timestamp
  vault.save()
  
  // Create Rebalance entity
  const rebalance = new Rebalance(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  rebalance.vault = vault.id
  rebalance.strategy = event.address
  rebalance.timestamp = event.block.timestamp
  rebalance.blockNumber = event.block.number
  rebalance.transactionHash = event.transaction.hash
  rebalance.save()
  
  // Create snapshot
  createVaultSnapshot(vault, event.block.timestamp, event.block.number)
}

// Event Handlers for Charm Vaults

export function handleCharmDeposit(event: CharmDepositEvent): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  vault.updatedAt = event.block.timestamp
  vault.save()
  
  // This represents fees being collected and redeposited
  const feeEvent = new CollectFeeEvent(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  feeEvent.vault = vault.id
  feeEvent.strategy = event.transaction.from
  feeEvent.charmVault = event.address
  feeEvent.amount0 = event.params.amount0
  feeEvent.amount1 = event.params.amount1
  feeEvent.timestamp = event.block.timestamp
  feeEvent.blockNumber = event.block.number
  feeEvent.transactionHash = event.transaction.hash
  feeEvent.save()
  
  // Update global stats
  const stats = loadOrCreateGlobalStats()
  stats.totalFeesCaptured = stats.totalFeesCaptured.plus(event.params.amount0).plus(event.params.amount1)
  stats.save()
  
  // Create snapshot
  createVaultSnapshot(vault, event.block.timestamp, event.block.number)
}

export function handleCharmWithdraw(event: CharmWithdrawEvent): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  vault.updatedAt = event.block.timestamp
  vault.save()
  
  // Create snapshot
  createVaultSnapshot(vault, event.block.timestamp, event.block.number)
}


