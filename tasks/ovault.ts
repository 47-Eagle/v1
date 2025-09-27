import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

task('ovault:info', 'Display Eagle OVault information')
  .addOptionalParam('vault', 'Vault contract address')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    console.log('🦅 Eagle OVault Information')
    console.log('==========================')
    
    const vaultAddress = taskArgs.vault
    if (!vaultAddress) {
      console.log('❌ Please provide vault address with --vault parameter')
      return
    }
    
    const vault = await hre.ethers.getContractAt('EagleOVault', vaultAddress)
    
    try {
      console.log('\n📊 Vault Status:')
      console.log('Address:', vaultAddress)
      console.log('Name:', await vault.name())
      console.log('Symbol:', await vault.symbol())
      console.log('Total Supply:', hre.ethers.formatEther(await vault.totalSupply()))
      console.log('Total Assets:', hre.ethers.formatEther(await vault.totalAssets()))
      
      const [wlfi, usd1] = await vault.getBalances()
      console.log('\n💰 Token Balances:')
      console.log('WLFI:', hre.ethers.formatEther(wlfi))
      console.log('USD1:', hre.ethers.formatEther(usd1))
      
      console.log('\n⚖️ Rebalance Status:')
      console.log('Needs Rebalance:', await vault.needsRebalance())
      
      console.log('\n🔒 Security Status:')
      console.log('Paused:', await vault.paused())
      console.log('Manager:', await vault.manager())
      
    } catch (error) {
      console.log('❌ Error fetching vault info:', error)
    }
  })

task('ovault:deposit-dual', 'Deposit both WLFI and USD1 into Eagle vault')
  .addParam('vault', 'Vault contract address')
  .addParam('wlfi', 'WLFI amount to deposit (in ETH units)')
  .addParam('usd1', 'USD1 amount to deposit (in ETH units)')
  .addOptionalParam('receiver', 'Address to receive shares (default: deployer)')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    console.log('🦅 Eagle OVault Dual Deposit')
    console.log('============================')
    
    const [deployer] = await hre.ethers.getSigners()
    const receiver = taskArgs.receiver || deployer.address
    
    const vault = await hre.ethers.getContractAt('EagleOVault', taskArgs.vault)
    const wlfiToken = await hre.ethers.getContractAt('WLFIAssetOFT', await vault.WLFI_TOKEN())
    const usd1Token = await hre.ethers.getContractAt('USD1AssetOFT', await vault.USD1_TOKEN())
    
    const wlfiAmount = hre.ethers.parseEther(taskArgs.wlfi)
    const usd1Amount = hre.ethers.parseEther(taskArgs.usd1)
    
    console.log('\n📝 Transaction Details:')
    console.log('WLFI Amount:', hre.ethers.formatEther(wlfiAmount))
    console.log('USD1 Amount:', hre.ethers.formatEther(usd1Amount))
    console.log('Receiver:', receiver)
    
    try {
      // Check balances
      const wlfiBalance = await wlfiToken.balanceOf(deployer.address)
      const usd1Balance = await usd1Token.balanceOf(deployer.address)
      
      console.log('\n💰 Current Balances:')
      console.log('WLFI:', hre.ethers.formatEther(wlfiBalance))
      console.log('USD1:', hre.ethers.formatEther(usd1Balance))
      
      if (wlfiBalance < wlfiAmount) {
        console.log('❌ Insufficient WLFI balance')
        return
      }
      
      if (usd1Balance < usd1Amount) {
        console.log('❌ Insufficient USD1 balance')
        return
      }
      
      // Approve tokens
      if (wlfiAmount > 0) {
        console.log('\n🔓 Approving WLFI...')
        const wlfiApproveTx = await wlfiToken.approve(taskArgs.vault, wlfiAmount)
        await wlfiApproveTx.wait()
        console.log('WLFI approved!')
      }
      
      if (usd1Amount > 0) {
        console.log('🔓 Approving USD1...')
        const usd1ApproveTx = await usd1Token.approve(taskArgs.vault, usd1Amount)
        await usd1ApproveTx.wait()
        console.log('USD1 approved!')
      }
      
      // Deposit
      console.log('\n💰 Depositing into vault...')
      const depositTx = await vault.depositDual(wlfiAmount, usd1Amount, receiver)
      const receipt = await depositTx.wait()
      
      console.log('✅ Deposit successful!')
      console.log('Transaction:', receipt?.hash)
      
      // Show new balances
      const newVaultBalance = await vault.balanceOf(receiver)
      console.log('New EAGLE balance:', hre.ethers.formatEther(newVaultBalance))
      
    } catch (error) {
      console.log('❌ Deposit failed:', error)
    }
  })

task('ovault:withdraw-dual', 'Withdraw both WLFI and USD1 from Eagle vault')
  .addParam('vault', 'Vault contract address')
  .addParam('shares', 'EAGLE shares to burn (in ETH units)')
  .addOptionalParam('receiver', 'Address to receive tokens (default: deployer)')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    console.log('🦅 Eagle OVault Dual Withdraw')
    console.log('=============================')
    
    const [deployer] = await hre.ethers.getSigners()
    const receiver = taskArgs.receiver || deployer.address
    
    const vault = await hre.ethers.getContractAt('EagleOVault', taskArgs.vault)
    const sharesAmount = hre.ethers.parseEther(taskArgs.shares)
    
    console.log('\n📝 Transaction Details:')
    console.log('Shares to burn:', hre.ethers.formatEther(sharesAmount))
    console.log('Receiver:', receiver)
    
    try {
      // Check balance
      const shareBalance = await vault.balanceOf(deployer.address)
      console.log('\n💰 Current Share Balance:', hre.ethers.formatEther(shareBalance))
      
      if (shareBalance < sharesAmount) {
        console.log('❌ Insufficient share balance')
        return
      }
      
      // Withdraw
      console.log('\n💸 Withdrawing from vault...')
      const withdrawTx = await vault.withdrawDual(sharesAmount, receiver)
      const receipt = await withdrawTx.wait()
      
      console.log('✅ Withdrawal successful!')
      console.log('Transaction:', receipt?.hash)
      
      // Show new balances
      const newShareBalance = await vault.balanceOf(deployer.address)
      console.log('New EAGLE balance:', hre.ethers.formatEther(newShareBalance))
      
    } catch (error) {
      console.log('❌ Withdrawal failed:', error)
    }
  })

task('ovault:rebalance', 'Rebalance the Eagle vault portfolio')
  .addParam('vault', 'Vault contract address')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    console.log('🦅 Eagle OVault Rebalance')
    console.log('=========================')
    
    const vault = await hre.ethers.getContractAt('EagleOVault', taskArgs.vault)
    
    try {
      console.log('\n📊 Pre-rebalance status:')
      const [wlfiBefore, usd1Before] = await vault.getBalances()
      console.log('WLFI:', hre.ethers.formatEther(wlfiBefore))
      console.log('USD1:', hre.ethers.formatEther(usd1Before))
      console.log('Needs rebalance:', await vault.needsRebalance())
      
      console.log('\n⚖️ Rebalancing...')
      const rebalanceTx = await vault.rebalance()
      const receipt = await rebalanceTx.wait()
      
      console.log('✅ Rebalance successful!')
      console.log('Transaction:', receipt?.hash)
      
      console.log('\n📊 Post-rebalance status:')
      const [wlfiAfter, usd1After] = await vault.getBalances()
      console.log('WLFI:', hre.ethers.formatEther(wlfiAfter))
      console.log('USD1:', hre.ethers.formatEther(usd1After))
      console.log('Needs rebalance:', await vault.needsRebalance())
      
    } catch (error) {
      console.log('❌ Rebalance failed:', error)
    }
  })
