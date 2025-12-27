import { BigInt, BigDecimal, Address, ethereum } from "@graphprotocol/graph-ts"
import {
  EagleOVault,
  Deposit as DepositEvent,
  Withdraw as WithdrawEvent,
  DualDeposit as DualDepositEvent,
  Reported as ReportedEvent,
  StrategyDeployed as StrategyDeployedEvent,
  Rebalanced as RebalancedEvent,
} from "../generated/EagleOVault/EagleOVault"
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
const USD1_STRATEGY_ADDRESS = "0x6c638f745b7adc2873a52de0d732163b32144f0b"
const WETH_STRATEGY_ADDRESS = "0x55e78798a926bac07b4d90f7b1bec769b72e76a6"
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

function refreshVaultFromContract(vault: Vault, block: ethereum.Block): void {
  const contract = EagleOVault.bind(Address.fromString(VAULT_ADDRESS))

  const totalAssetsCall = contract.try_totalAssets()
  if (!totalAssetsCall.reverted) {
    vault.totalAssets = totalAssetsCall.value
  }

  const totalSupplyCall = contract.try_totalSupply()
  if (!totalSupplyCall.reverted) {
    vault.totalSupply = totalSupplyCall.value
  }

  if (vault.totalSupply.gt(BigInt.fromI32(0))) {
    vault.sharePrice = vault.totalAssets.toBigDecimal().div(vault.totalSupply.toBigDecimal())
  }

  vault.updatedAt = block.timestamp
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

function createVaultSnapshotFromEvent(vault: Vault, event: ethereum.Event): void {
  // IMPORTANT: IDs must be unique; multiple events in the same block share the same timestamp.
  // Use txHash + logIndex to avoid immutable entity collisions.
  const id = vault.id + "-" + event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let snapshot = new VaultSnapshot(id)
  
  snapshot.vault = vault.id
  snapshot.timestamp = event.block.timestamp
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
  if (vault.createdAt.equals(BigInt.fromI32(0))) {
    vault.createdAt = event.block.timestamp
  }
  // Sync on-chain state first so snapshots are accurate even if a Reported
  // event is not emitted frequently.
  refreshVaultFromContract(vault, event.block)
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
  createVaultSnapshotFromEvent(vault, event)
  
  // Update daily snapshot
  const daily = loadOrCreateDailySnapshot(event.block.timestamp)
  daily.totalValueLocked = stats.totalValueLocked
  daily.dailyVolume = daily.dailyVolume.plus(event.params.assets)
  daily.sharePrice = vault.sharePrice
  daily.save()
}

export function handleWithdraw(event: WithdrawEvent): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  if (vault.createdAt.equals(BigInt.fromI32(0))) {
    vault.createdAt = event.block.timestamp
  }
  refreshVaultFromContract(vault, event.block)
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
  createVaultSnapshotFromEvent(vault, event)
  
  // Update daily snapshot
  const daily = loadOrCreateDailySnapshot(event.block.timestamp)
  daily.totalValueLocked = stats.totalValueLocked
  daily.dailyVolume = daily.dailyVolume.plus(event.params.assets)
  daily.sharePrice = vault.sharePrice
  daily.save()
}

export function handleDualDeposit(event: DualDepositEvent): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  if (vault.createdAt.equals(BigInt.fromI32(0))) {
    vault.createdAt = event.block.timestamp
  }
  refreshVaultFromContract(vault, event.block)
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
  createVaultSnapshotFromEvent(vault, event)
}

export function handleReported(event: ReportedEvent): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  if (vault.createdAt.equals(BigInt.fromI32(0))) {
    vault.createdAt = event.block.timestamp
  }
  // Reported already contains totals, but still refresh first to keep supply in sync
  // in case the event doesn't include it.
  refreshVaultFromContract(vault, event.block)
  
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
  // Keep sharePrice in sync when possible
  if (vault.totalSupply.gt(BigInt.fromI32(0))) {
    vault.sharePrice = vault.totalAssets.toBigDecimal().div(vault.totalSupply.toBigDecimal())
  }
  vault.updatedAt = event.block.timestamp
  vault.save()
  
  // Create snapshot
  createVaultSnapshotFromEvent(vault, event)
}

export function handleStrategyDeployed(event: StrategyDeployedEvent): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  if (vault.createdAt.equals(BigInt.fromI32(0))) {
    vault.createdAt = event.block.timestamp
  }
  refreshVaultFromContract(vault, event.block)
  vault.updatedAt = event.block.timestamp
  vault.save()
  
  // Create snapshot
  createVaultSnapshotFromEvent(vault, event)
}

export function handleRebalanced(event: RebalancedEvent): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  if (vault.createdAt.equals(BigInt.fromI32(0))) {
    vault.createdAt = event.block.timestamp
  }
  refreshVaultFromContract(vault, event.block)
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
  createVaultSnapshotFromEvent(vault, event)
}

// Event Handlers for Strategies

export function handleStrategyDeposit(event: ethereum.Event): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  if (vault.createdAt.equals(BigInt.fromI32(0))) {
    vault.createdAt = event.block.timestamp
  }
  refreshVaultFromContract(vault, event.block)
  vault.updatedAt = event.block.timestamp
  vault.save()
  
  // Create snapshot
  createVaultSnapshotFromEvent(vault, event)
}

export function handleStrategyWithdraw(event: ethereum.Event): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  if (vault.createdAt.equals(BigInt.fromI32(0))) {
    vault.createdAt = event.block.timestamp
  }
  refreshVaultFromContract(vault, event.block)
  vault.updatedAt = event.block.timestamp
  vault.save()
  
  // Create snapshot
  createVaultSnapshotFromEvent(vault, event)
}

export function handleStrategyRebalanced(event: ethereum.Event): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  if (vault.createdAt.equals(BigInt.fromI32(0))) {
    vault.createdAt = event.block.timestamp
  }
  refreshVaultFromContract(vault, event.block)
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
  createVaultSnapshotFromEvent(vault, event)
}

// Event Handlers for Charm Vaults

export function handleCharmDeposit(event: ethereum.Event): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  if (vault.createdAt.equals(BigInt.fromI32(0))) {
    vault.createdAt = event.block.timestamp
  }
  refreshVaultFromContract(vault, event.block)
  vault.updatedAt = event.block.timestamp
  vault.save()
  
  // This represents fees being collected and redeposited
  const feeEvent = new CollectFeeEvent(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  feeEvent.vault = vault.id
  feeEvent.strategy = event.transaction.from
  feeEvent.charmVault = event.address
  // Best-effort decode (depends on ABI param names / ordering)
  let amount0 = BigInt.fromI32(0)
  let amount1 = BigInt.fromI32(0)
  for (let i = 0; i < event.parameters.length; i++) {
    const p = event.parameters[i]
    if (p.name == "amount0") amount0 = p.value.toBigInt()
    if (p.name == "amount1") amount1 = p.value.toBigInt()
  }
  // Fallback: take the last two parameters if names are missing
  if (amount0.equals(BigInt.fromI32(0)) && amount1.equals(BigInt.fromI32(0)) && event.parameters.length >= 2) {
    amount0 = event.parameters[event.parameters.length - 2].value.toBigInt()
    amount1 = event.parameters[event.parameters.length - 1].value.toBigInt()
  }
  feeEvent.amount0 = amount0
  feeEvent.amount1 = amount1
  feeEvent.timestamp = event.block.timestamp
  feeEvent.blockNumber = event.block.number
  feeEvent.transactionHash = event.transaction.hash
  feeEvent.save()
  
  // Update global stats
  const stats = loadOrCreateGlobalStats()
  stats.totalFeesCaptured = stats.totalFeesCaptured.plus(amount0).plus(amount1)
  stats.save()
  
  // Create snapshot
  createVaultSnapshotFromEvent(vault, event)
}

export function handleCharmWithdraw(event: ethereum.Event): void {
  const vault = loadOrCreateVault(VAULT_ADDRESS)
  if (vault.createdAt.equals(BigInt.fromI32(0))) {
    vault.createdAt = event.block.timestamp
  }
  refreshVaultFromContract(vault, event.block)
  vault.updatedAt = event.block.timestamp
  vault.save()
  
  // Create snapshot
  createVaultSnapshotFromEvent(vault, event)
}



