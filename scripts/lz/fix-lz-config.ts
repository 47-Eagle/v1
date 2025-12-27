/**
 * Programmatic LayerZero V2 wiring for multiple OApps (OFTs).
 * - Sets peers for each pathway
 * - Sets send/receive libraries
 * - Sets DVN (ULN) config and Executor config
 *
 * NOTE: Addresses below are taken from LayerZero V2 mainnet docs (ULN302 + Executor).
 *       Update if LayerZero publishes new endpoints/libraries.
 *
 * Usage:
 *   PRIVATE_KEY=<owner_of_oapp> pnpm ts-node scripts/lz/fix-lz-config.ts --dryRun
 *   PRIVATE_KEY=<owner_of_oapp> pnpm ts-node scripts/lz/fix-lz-config.ts
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

// -----------------------------------------------------------------------------//
// Config
// -----------------------------------------------------------------------------//

// OApps to wire (set any to '' to skip)
const OAPPS = {
  EAGLE_OFT: process.env.EAGLE_OFT || '0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E',
  WLFI_OFT: process.env.WLFI_OFT || '',
  USD1_OFT: process.env.USD1_OFT || '',
  SHARE_OFT: process.env.SHARE_OFT || '',
};

// Chain configs (LayerZero V2 mainnet endpoints/libraries/DVN/Executor)
const CHAINS: Record<
  string,
  {
    name: string;
    eid: number;
    rpc: string;
    endpoint: string;
    sendUln302: string;
    receiveUln302: string;
    executor: string;
    dvn: string;
  }
> = {
  ethereum: {
    name: 'Ethereum',
    eid: 30101,
    rpc: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
    sendUln302: '0xbB2Ea70C9E858123480642Cf96acbcCE1372dCe1',
    receiveUln302: '0xc02Ab410f0734EFa3F14628780e6e695156024C2',
    executor: '0x173272739Bd7Aa6e4e214714048a9fE699453059',
    dvn: '0x589dEDbD617e0CBcB916A9223F4d1300c294236b', // LayerZero Labs DVN
  },
  base: {
    name: 'Base',
    eid: 30184,
    rpc: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    endpoint: '0x1a44076050125825900e736c501f859c50fE728c',
    sendUln302: '0xB5320B0B3a13cC860893E2Bd79FCd7e13484Dda2',
    receiveUln302: '0xc70AB6f32772f59fBfc23889Caf4Ba3376C84bAf',
    executor: '0x2CCA08ae69E0C44b18a57Ab2A87644234dAebaE4',
    dvn: '0x9e059a54699a285714207b43b055483e78faac25', // LayerZero Labs DVN
  },
  sonic: {
    name: 'Sonic',
    eid: 30332,
    rpc: process.env.SONIC_RPC_URL || 'https://rpc.soniclabs.com',
    endpoint: '0x6F475642a6e85809B1c36Fa62763669b1b48DD5B',
    sendUln302: '0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7',
    receiveUln302: '0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043',
    executor: '0x4208D6E27538189bB48E603D6123A94b8Abe0A0b',
    dvn: '0x282b3386571f7f794450d5789911a9804fa346b4', // LayerZero Labs DVN
  },
  hyperevm: {
    name: 'HyperEVM',
    eid: 30367,
    rpc: process.env.HYPEREVM_RPC_URL || 'https://rpc.hyperliquid.xyz/evm',
    endpoint: '0x3A73033C0b1407574C76BdBAc67f126f6b4a9AA9',
    sendUln302: '0xfd76d9CB0Bac839725aB79127E7411fe71b1e3CA',
    receiveUln302: '0x7cacBe439EaD55fa1c22790330b12835c6884a91',
    executor: '0x41Bdb4aa4A63a5b2Efc531858d3118392B1A1C3d',
    dvn: '0xc097ab8cd7b053326dfe9fb3e3a31a0cce3b526f', // LayerZero Labs DVN
  },
  monad: {
    name: 'Monad',
    eid: 30390,
    rpc: process.env.MONAD_RPC_URL || 'https://rpc-mainnet.monadinfra.com',
    // From LayerZero V2 docs (Monad Mainnet):
    // https://docs.layerzero.network/v2/deployments/chains/monad
    endpoint: '0x6F475642a6e85809B1c36Fa62763669b1b48DD5B',
    sendUln302: '0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7',
    receiveUln302: '0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043',
    executor: '0x4208D6E27538189bB48E603D6123A94b8Abe0A0b',
    dvn: '0x282b3386571f7f794450d5789911a9804fa346b4', // LayerZero Labs DVN
  },
};

// Pathways (source -> destination) to wire for all OApps
const PATHWAYS: [string, string][] = [
  ['ethereum', 'base'],
  ['base', 'ethereum'],
  ['ethereum', 'sonic'],
  ['sonic', 'ethereum'],
  ['ethereum', 'hyperevm'],
  ['hyperevm', 'ethereum'],
  ['base', 'sonic'],
  ['sonic', 'base'],
  ['base', 'hyperevm'],
  ['hyperevm', 'base'],
  ['sonic', 'hyperevm'],
  ['hyperevm', 'sonic'],
  ['monad', 'ethereum'],
  ['ethereum', 'monad'],
];

const ENDPOINT_ABI = [
  'function setSendLibrary(address _oapp, uint32 _eid, address _newLib) external',
  'function setReceiveLibrary(address _oapp, uint32 _eid, address _lib, uint256 _gracePeriod) external',
  'function setConfig(address _oapp, address _lib, tuple(uint32 eid, uint32 configType, bytes config)[] _params) external',
  'function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) external view returns (bytes)',
  'function getSendLibrary(address _sender, uint32 _eid) external view returns (address)',
  'function getReceiveLibrary(address _receiver, uint32 _eid) external view returns (address, bool)',
];

const OFT_ABI = [
  'function setPeer(uint32 _eid, bytes32 _peer) external',
  'function peers(uint32 _eid) external view returns (bytes32)',
  'function setEnforcedOptions((uint32 eid, uint16 msgType, bytes options)[] _enforcedOptions) external',
  'function enforcedOptions(uint32 _eid, uint16 _msgType) external view returns (bytes)',
  'function owner() external view returns (address)',
];

const CONFIG_TYPE_EXECUTOR = 1;
const CONFIG_TYPE_ULN = 2;

// ULN config (adjust to your risk profile)
const ULN_CONFIRMATIONS = 15;
const REQUIRED_DVN_COUNT = 1;
const OPTIONAL_DVN_COUNT = 0;
const OPTIONAL_DVN_THRESHOLD = 0;

// Max message size for executor
const EXECUTOR_MAX_MESSAGE_SIZE = 50000;

// Enforced options (OAppOptionsType3). We only SET if missing.
const ENFORCED_OPTIONS_MSG_TYPE_SEND = 1;
const ENFORCED_OPTIONS_GAS_DEFAULT = 200000;

// -----------------------------------------------------------------------------//
// Helpers
// -----------------------------------------------------------------------------//

function encodeUlnConfig(requiredDVNs: string[], optionalDVNs: string[]): string {
  return ethers.utils.defaultAbiCoder.encode(
    ['tuple(uint64,uint8,uint8,uint8,address[],address[])'],
    [
      [
        ULN_CONFIRMATIONS,
        REQUIRED_DVN_COUNT,
        OPTIONAL_DVN_COUNT,
        OPTIONAL_DVN_THRESHOLD,
        requiredDVNs,
        optionalDVNs,
      ],
    ],
  );
}

function encodeExecutorConfig(maxMessageSize: number, executor: string): string {
  return ethers.utils.defaultAbiCoder.encode(['tuple(uint32,address)'], [[maxMessageSize, executor]]);
}

function encodeEnforcedOptions(gas: number, value: ethers.BigNumberish = 0): string {
  // Options type 3 format (matches OptionsBuilder.newOptions().addExecutorLzReceiveOption(gas, value))
  // - version: uint16 = 3
  // - optionType: uint8 = 1 (LZ_RECEIVE)
  // - gas: uint128
  // - value: uint128
  return ethers.utils.solidityPack(['uint16', 'uint8', 'uint128', 'uint128'], [3, 1, gas, value]);
}

async function configureForOApp(oapp: string, wallet: ethers.Wallet, dryRun: boolean) {
  if (!oapp) return;

  // Track per-chain nonces to avoid "nonce too low"/replacement issues across rapid txs.
  const nextNonceBySourceKey: Record<string, number> = {};

  for (const [sourceKey, destKey] of PATHWAYS) {
    const source = CHAINS[sourceKey];
    const dest = CHAINS[destKey];
    if (!source || !dest) continue;

    console.log(`\n=== OApp ${oapp} :: ${source.name} -> ${dest.name} (EID ${dest.eid}) ===`);

    const provider = new ethers.providers.JsonRpcProvider(source.rpc);
    const signer = wallet.connect(provider);
    const endpoint = new ethers.Contract(source.endpoint, ENDPOINT_ABI, signer);
    const oft = new ethers.Contract(oapp, OFT_ABI, signer);

    const getNextNonce = async (): Promise<number> => {
      if (nextNonceBySourceKey[sourceKey] === undefined) {
        nextNonceBySourceKey[sourceKey] = await provider.getTransactionCount(wallet.address, 'pending');
      }
      return nextNonceBySourceKey[sourceKey];
    };

    const markNonceUsed = (nonce: number) => {
      // Only advance forward
      if (nextNonceBySourceKey[sourceKey] === undefined || nextNonceBySourceKey[sourceKey] <= nonce) {
        nextNonceBySourceKey[sourceKey] = nonce + 1;
      }
    };

    // Ownership check
    const owner = await oft.owner();
    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
      console.log('  ⚠ Not owner on this chain; skipping');
      continue;
    }

    const peerBytes32 = ethers.utils.hexZeroPad(oapp, 32);

    // 1) Peer
    try {
      const currentPeer = await oft.peers(dest.eid);
      if (currentPeer.toLowerCase() === peerBytes32.toLowerCase()) {
        console.log('  ✓ Peer already set');
      } else {
        console.log('  Setting peer...');
        if (!dryRun) {
          const tx = await oft.setPeer(dest.eid, peerBytes32, { gasLimit: 120000 });
          console.log('    TX', tx.hash);
          await tx.wait();
        }
        console.log('  ✓ Peer set');
      }
    } catch (e: any) {
      console.log('  ✗ Peer error:', e.message);
    }

    // 1b) Enforced options (only set if missing; do NOT overwrite existing)
    if (process.argv.includes('--setOptions')) {
      try {
        const currentOptions: string = await oft.enforcedOptions(dest.eid, ENFORCED_OPTIONS_MSG_TYPE_SEND);
        const hasOptions = currentOptions && currentOptions !== '0x' && currentOptions.length > 2;
        if (hasOptions) {
          console.log('  ✓ Enforced options already set');
        } else {
          console.log('  Setting enforced options...');
          if (!dryRun) {
            const options = encodeEnforcedOptions(ENFORCED_OPTIONS_GAS_DEFAULT, 0);
            const enforcedParams = [{ eid: dest.eid, msgType: ENFORCED_OPTIONS_MSG_TYPE_SEND, options }];

            const nonce = await getNextNonce();
            const gasEstimate = await oft.estimateGas.setEnforcedOptions(enforcedParams);
            const gasLimit = gasEstimate.mul(12).div(10);

            const tx = await oft.setEnforcedOptions(enforcedParams, { gasLimit, nonce });
            markNonceUsed(nonce);
            console.log('    TX', tx.hash);
            await tx.wait();
          }
          console.log('  ✓ Enforced options set');
        }
      } catch (e: any) {
        console.log('  ✗ Enforced options error:', e.message);
      }
    } else {
      console.log('  ⏭ Enforced options skipped (use --setOptions)');
    }

    // 2) Send library
    try {
      const currentSend = await endpoint.getSendLibrary(oapp, dest.eid);
      if (currentSend.toLowerCase() === source.sendUln302.toLowerCase()) {
        console.log('  ✓ Send lib already set');
      } else {
        console.log('  Setting send lib...');
        if (!dryRun) {
          const tx = await endpoint.setSendLibrary(oapp, dest.eid, source.sendUln302, { gasLimit: 250000 });
          console.log('    TX', tx.hash);
          await tx.wait();
        }
        console.log('  ✓ Send lib set');
      }
    } catch (e: any) {
      console.log('  ✗ Send lib error:', e.message);
    }

    // 3) Receive library
    try {
      const [currentRecv] = await endpoint.getReceiveLibrary(oapp, dest.eid);
      if (currentRecv.toLowerCase() === source.receiveUln302.toLowerCase()) {
        console.log('  ✓ Receive lib already set');
      } else {
        console.log('  Setting receive lib...');
        if (!dryRun) {
          const tx = await endpoint.setReceiveLibrary(oapp, dest.eid, source.receiveUln302, 0, { gasLimit: 300000 });
          console.log('    TX', tx.hash);
          await tx.wait();
        }
        console.log('  ✓ Receive lib set');
      }
    } catch (e: any) {
      console.log('  ✗ Receive lib error:', e.message);
    }

    // 4) ULN config (DVN)
    try {
      const desiredConfig = encodeUlnConfig([source.dvn], []);
      let shouldSet = true;

      try {
        const currentConfig: string = await endpoint.getConfig(oapp, source.receiveUln302, dest.eid, CONFIG_TYPE_ULN);
        const hasConfig = currentConfig && currentConfig !== '0x' && currentConfig.length > 2;
        if (hasConfig) {
          try {
            const decoded = ethers.utils.defaultAbiCoder.decode(
              ['tuple(uint64,uint8,uint8,uint8,address[],address[])'],
              currentConfig,
            )[0];
            const requiredDVNs: string[] = decoded[4] || [];
            const hasRequiredDvn = requiredDVNs.some((a) => a.toLowerCase() === source.dvn.toLowerCase());
            if (hasRequiredDvn) {
              shouldSet = false;
              console.log('  ✓ ULN config already set');
            } else {
              console.log('  ULN config missing required DVN; updating...');
            }
          } catch {
            console.log('  ULN config unreadable; updating...');
          }
        } else {
          console.log('  No ULN config found; setting...');
        }
      } catch {
        console.log('  Could not read ULN config; setting...');
      }

      if (shouldSet) {
        const params = [
          {
            eid: dest.eid,
            configType: CONFIG_TYPE_ULN,
            config: desiredConfig,
          },
        ];
        console.log('  Setting ULN config (DVN)...');
        if (!dryRun) {
          const nonce = await getNextNonce();
          const gasEstimate = await endpoint.estimateGas.setConfig(oapp, source.receiveUln302, params);
          const gasLimit = gasEstimate.mul(12).div(10);
          const tx = await endpoint.setConfig(oapp, source.receiveUln302, params, { gasLimit, nonce });
          markNonceUsed(nonce);
          console.log('    TX', tx.hash);
          await tx.wait();
        }
        console.log('  ✓ ULN config set');
      }
    } catch (e: any) {
      console.log('  ✗ ULN config error:', e.message);
    }

    // 5) Executor config
    try {
      let shouldSet = true;
      let maxMessageSizeToUse = EXECUTOR_MAX_MESSAGE_SIZE;

      try {
        const currentConfig: string = await endpoint.getConfig(oapp, source.sendUln302, dest.eid, CONFIG_TYPE_EXECUTOR);
        const hasConfig = currentConfig && currentConfig !== '0x' && currentConfig.length > 2;
        if (hasConfig) {
          try {
            const decoded = ethers.utils.defaultAbiCoder.decode(['tuple(uint32,address)'], currentConfig)[0];
            const currentExecutor: string = decoded[1];
            const currentMaxSizeNum = ethers.BigNumber.from(decoded[0]).toNumber();
            if (currentMaxSizeNum > 0) {
              maxMessageSizeToUse = currentMaxSizeNum;
            }

            if (currentExecutor.toLowerCase() === source.executor.toLowerCase()) {
              shouldSet = false;
              console.log(`  ✓ Executor config already set (maxSize=${maxMessageSizeToUse})`);
            } else {
              console.log(`  Executor config executor mismatch (${currentExecutor} → ${source.executor}); updating...`);
            }
          } catch {
            console.log('  Executor config unreadable; updating...');
          }
        } else {
          console.log('  No executor config found; setting...');
        }
      } catch {
        console.log('  Could not read executor config; setting...');
      }

      if (!shouldSet) continue;

      const params = [
        {
          eid: dest.eid,
          configType: CONFIG_TYPE_EXECUTOR,
          config: encodeExecutorConfig(maxMessageSizeToUse, source.executor),
        },
      ];
      console.log('  Setting executor config...');
      if (!dryRun) {
        const nonce = await getNextNonce();
        const gasEstimate = await endpoint.estimateGas.setConfig(oapp, source.sendUln302, params);
        const gasLimit = gasEstimate.mul(12).div(10);
        const tx = await endpoint.setConfig(oapp, source.sendUln302, params, { gasLimit, nonce });
        markNonceUsed(nonce);
        console.log('    TX', tx.hash);
        await tx.wait();
      }
      console.log('  ✓ Executor config set');
    } catch (e: any) {
      console.log('  ✗ Executor config error:', e.message);
    }
  }
}

async function main() {
  const dryRun = process.argv.includes('--dryRun');
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('Missing PRIVATE_KEY');

  const wallet = new ethers.Wallet(pk);
  console.log('Signer:', wallet.address);
  console.log('Dry run:', dryRun);

  const oapps = Object.values(OAPPS).filter((a) => a && a !== '');
  if (oapps.length === 0) {
    console.log('No OApps configured, exiting.');
    return;
  }

  for (const oapp of oapps) {
    console.log(`\n==============================`);
    console.log(`Wiring OApp: ${oapp}`);
    console.log(`==============================`);
    await configureForOApp(oapp, wallet, dryRun);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


