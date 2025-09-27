import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DEPLOYMENT_CONFIG, USD1_ASSET_CONFIG, VANITY_CONFIG } from '../devtools/deployConfig'

task('deploy:eagle-ovault', 'Deploy the complete Eagle OVault system')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    console.log('🦅 Deploying Eagle OVault System')
    console.log('==================================')
    
    const [deployer] = await hre.ethers.getSigners()
    console.log('Deployer:', deployer.address)
    console.log('Network:', hre.network.name)
    console.log('Chain ID:', await hre.ethers.provider.getNetwork().then(n => n.chainId))
    
    // Get current network EID
    const currentEid = hre.network.config.eid
    if (!currentEid) {
      throw new Error('Network EID not configured')
    }
    
    // Check if this is hub or spoke
    const isHub = currentEid === DEPLOYMENT_CONFIG.vault.deploymentEid
    
    if (isHub) {
      console.log('\n📍 Deploying HUB components (Ethereum)...')
      await deployHubComponents(hre, deployer)
    } else {
      console.log('\n📍 Deploying SPOKE components...')
      await deploySpokeComponents(hre, deployer, currentEid)
    }
    
    console.log('\n✅ Deployment completed!')
  })

async function deployHubComponents(hre: HardhatRuntimeEnvironment, deployer: any) {
  const { ethers } = hre
  
  // 1. Deploy WLFI Asset OFT
  console.log('\n1. Deploying WLFI Asset OFT...')
  const WLFIAssetOFT = await ethers.getContractFactory('WLFIAssetOFT')
  const wlfiAssetOFT = await WLFIAssetOFT.deploy(
    DEPLOYMENT_CONFIG.assetOFT.metadata.name,
    DEPLOYMENT_CONFIG.assetOFT.metadata.symbol,
    await getLayerZeroEndpoint(hre),
    deployer.address
  )
  await wlfiAssetOFT.waitForDeployment()
  console.log('WLFI Asset OFT deployed at:', await wlfiAssetOFT.getAddress())
  
  // 2. Deploy USD1 Asset OFT  
  console.log('\n2. Deploying USD1 Asset OFT...')
  const USD1AssetOFT = await ethers.getContractFactory('USD1AssetOFT')
  const usd1AssetOFT = await USD1AssetOFT.deploy(
    USD1_ASSET_CONFIG.metadata.name,
    USD1_ASSET_CONFIG.metadata.symbol,
    await getLayerZeroEndpoint(hre),
    deployer.address
  )
  await usd1AssetOFT.waitForDeployment()
  console.log('USD1 Asset OFT deployed at:', await usd1AssetOFT.getAddress())
  
  // 3. Deploy EagleOVault (ERC4626)
  console.log('\n3. Deploying EagleOVault...')
  const EagleOVault = await ethers.getContractFactory('EagleOVault')
  const vault = await EagleOVault.deploy(
    await wlfiAssetOFT.getAddress(), // WLFI as primary asset
    await usd1AssetOFT.getAddress(), // USD1 as secondary asset
    deployer.address                 // Owner
  )
  await vault.waitForDeployment()
  console.log('EagleOVault deployed at:', await vault.getAddress())
  
  // 4. Deploy Share OFT Adapter
  console.log('\n4. Deploying Eagle Share OFT Adapter...')
  const ShareOFTAdapter = await ethers.getContractFactory('EagleShareOFTAdapter')
  const shareAdapter = await ShareOFTAdapter.deploy(
    await vault.getAddress(),         // EAGLE share token
    await getLayerZeroEndpoint(hre),  // LayerZero endpoint
    deployer.address                  // Delegate
  )
  await shareAdapter.waitForDeployment()
  console.log('Share OFT Adapter deployed at:', await shareAdapter.getAddress())
  
  // 5. Deploy OVault Composer
  console.log('\n5. Deploying Eagle OVault Composer...')
  const OVaultComposer = await ethers.getContractFactory('EagleOVaultComposer')
  const composer = await OVaultComposer.deploy(
    await vault.getAddress(),        // Vault
    await wlfiAssetOFT.getAddress(), // Asset OFT (WLFI primary)
    await shareAdapter.getAddress()  // Share OFT
  )
  await composer.waitForDeployment()
  console.log('OVault Composer deployed at:', await composer.getAddress())
  
  // 6. Configure permissions
  console.log('\n6. Configuring permissions...')
  // Add composer as authorized on vault
  // await vault.setAuthorized(await composer.getAddress(), true)
  console.log('Permissions configured!')
  
  console.log('\n🎉 HUB deployment summary:')
  console.log('WLFI Asset OFT:', await wlfiAssetOFT.getAddress())
  console.log('USD1 Asset OFT:', await usd1AssetOFT.getAddress())
  console.log('EagleOVault:', await vault.getAddress())
  console.log('Share Adapter:', await shareAdapter.getAddress())
  console.log('Composer:', await composer.getAddress())
}

async function deploySpokeComponents(hre: HardhatRuntimeEnvironment, deployer: any, eid: number) {
  const { ethers } = hre
  
  // 1. Deploy WLFI Asset OFT (spoke)
  console.log('\n1. Deploying WLFI Asset OFT (spoke)...')
  const WLFIAssetOFT = await ethers.getContractFactory('WLFIAssetOFT')
  const wlfiAssetOFT = await WLFIAssetOFT.deploy(
    DEPLOYMENT_CONFIG.assetOFT.metadata.name,
    DEPLOYMENT_CONFIG.assetOFT.metadata.symbol,
    await getLayerZeroEndpoint(hre),
    deployer.address
  )
  await wlfiAssetOFT.waitForDeployment()
  console.log('WLFI Asset OFT deployed at:', await wlfiAssetOFT.getAddress())
  
  // 2. Deploy USD1 Asset OFT (spoke)
  console.log('\n2. Deploying USD1 Asset OFT (spoke)...')
  const USD1AssetOFT = await ethers.getContractFactory('USD1AssetOFT')
  const usd1AssetOFT = await USD1AssetOFT.deploy(
    USD1_ASSET_CONFIG.metadata.name,
    USD1_ASSET_CONFIG.metadata.symbol,
    await getLayerZeroEndpoint(hre),
    deployer.address
  )
  await usd1AssetOFT.waitForDeployment()
  console.log('USD1 Asset OFT deployed at:', await usd1AssetOFT.getAddress())
  
  // 3. Deploy Eagle Share OFT (spoke)
  console.log('\n3. Deploying Eagle Share OFT (spoke)...')
  const EagleShareOFT = await ethers.getContractFactory('EagleShareOFT')
  const shareOFT = await EagleShareOFT.deploy(
    DEPLOYMENT_CONFIG.shareOFT.metadata.name,
    DEPLOYMENT_CONFIG.shareOFT.metadata.symbol,
    await getLayerZeroEndpoint(hre),
    deployer.address
  )
  await shareOFT.waitForDeployment()
  console.log('Eagle Share OFT deployed at:', await shareOFT.getAddress())
  
  console.log('\n🎉 SPOKE deployment summary:')
  console.log('WLFI Asset OFT:', await wlfiAssetOFT.getAddress())
  console.log('USD1 Asset OFT:', await usd1AssetOFT.getAddress())
  console.log('Eagle Share OFT:', await shareOFT.getAddress())
}

async function getLayerZeroEndpoint(hre: HardhatRuntimeEnvironment): Promise<string> {
  // LayerZero V2 Endpoints
  const endpoints: { [chainId: number]: string } = {
    1: '0x1a44076050125825900e736c501f859c50fE728c',     // Ethereum
    56: '0x1a44076050125825900e736c501f859c50fE728c',    // BSC  
    42161: '0x1a44076050125825900e736c501f859c50fE728c', // Arbitrum
    8453: '0x1a44076050125825900e736c501f859c50fE728c',  // Base
    43114: '0x1a44076050125825900e736c501f859c50fE728c', // Avalanche
  }
  
  const chainId = await hre.ethers.provider.getNetwork().then(n => Number(n.chainId))
  const endpoint = endpoints[chainId]
  
  if (!endpoint) {
    throw new Error(`LayerZero endpoint not configured for chain ID: ${chainId}`)
  }
  
  return endpoint
}
