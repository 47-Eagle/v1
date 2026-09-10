#!/usr/bin/env tsx
/**
 * Dane listing bar for EagleShareOFT 0x474e… (not ■AKITA 0xe7e44…).
 * Pin SendUln302/ReceiveUln302 (no Endpoint-default inherit) and set
 * 2 required DVNs (LayerZero Labs + Nethermind) + 2-of-3 optional.
 *
 * Exact match via getAppUlnConfig (not merged Endpoint.getConfig).
 *
 * Arbitrum inbound from the Sep 2026 INFLIGHT hops is skipped unless
 * --force-inflight-receive — changing that receive set would require extra
 * DVN attestations the source sends did not pay.
 *
 *   EAGLE_OFT_PRIVATE_KEY=… pnpm exec tsx --env-file=.env \
 *     ops/configure-eagle-lz-listing-bar.ts -- --chain arbitrum --execute
 *   … --chain all --execute
 */
import { pathToFileURL } from 'node:url'

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeAbiParameters,
  encodeFunctionData,
  formatEther,
  getAddress,
  http,
  parseAbi,
  type Address,
  type Chain,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arbitrum, avalanche, base, bsc, mainnet, sonic } from 'viem/chains'

const EXPECTED_EVM_LANE_CONFIRMATIONS = 15n
const EXPECTED_EVM_REQUIRED_DVN_COUNT = 2
const EXPECTED_EVM_REQUIRED_DVN_NAMES = ['LayerZero Labs', 'Nethermind'] as const
const EXPECTED_EVM_OPTIONAL_DVN_COUNT = 3
const EXPECTED_EVM_OPTIONAL_DVN_THRESHOLD = 2
const DEFAULT_DVN_METADATA_URL = 'https://metadata.layerzero-api.com/v1/metadata/deployments'

function isExpectedEvmListingDvnShape(slice: {
  requiredDvnCount: number
  optionalDvnCount: number
  optionalDvnThreshold: number
}): boolean {
  return (
    slice.requiredDvnCount === EXPECTED_EVM_REQUIRED_DVN_COUNT &&
    slice.optionalDvnCount === EXPECTED_EVM_OPTIONAL_DVN_COUNT &&
    slice.optionalDvnThreshold === EXPECTED_EVM_OPTIONAL_DVN_THRESHOLD
  )
}

const EAGLE_OFT = getAddress('0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E')
const EAGLE_OWNER = getAddress('0x7310Dd6EF89b7f829839F140C6840bc929ba2031')
const ULN_CONFIG_TYPE = 2

/** Inflight dest Arbitrum (30110) source EIDs — do not change receive ULN. */
const INFLIGHT_ARB_RECEIVE_EIDS = new Set([30_102, 30_106, 30_332, 30_367, 30_390])

const monad = defineChain({
  id: 143,
  name: 'Monad',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc-mainnet.monadinfra.com'] } },
})

const hyperliquid = defineChain({
  id: 999,
  name: 'HyperEVM',
  nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.hyperliquid.xyz/evm'] } },
})

type ChainKey =
  | 'ethereum'
  | 'bsc'
  | 'avalanche'
  | 'arbitrum'
  | 'base'
  | 'hyperliquid'
  | 'sonic'
  | 'monad'

const OPTIONAL_THREE = ['Horizen', 'Deutsche Telekom', 'P2P'] as const
const DVN_NAMES = [...EXPECTED_EVM_REQUIRED_DVN_NAMES, ...OPTIONAL_THREE] as const

const CHAINS: Record<ChainKey, {
  chain: Chain
  eid: number
  rpcEnv: readonly string[]
  defaultRpc?: string
  metadataKey: string
}> = {
  ethereum: {
    chain: mainnet,
    eid: 30_101,
    rpcEnv: ['ETHEREUM_RPC_URL', 'ETH_RPC_URL', 'MAINNET_RPC_URL'],
    metadataKey: 'ethereum',
  },
  bsc: {
    chain: bsc,
    eid: 30_102,
    rpcEnv: ['BSC_RPC_URL'],
    defaultRpc: 'https://bsc-dataseed.binance.org',
    metadataKey: 'bsc',
  },
  avalanche: {
    chain: avalanche,
    eid: 30_106,
    rpcEnv: ['AVALANCHE_RPC_URL', 'AVAX_RPC_URL'],
    defaultRpc: 'https://avalanche-c-chain-rpc.publicnode.com',
    metadataKey: 'avalanche',
  },
  arbitrum: {
    chain: arbitrum,
    eid: 30_110,
    rpcEnv: ['ARBITRUM_RPC_URL', 'ARB_RPC_URL'],
    defaultRpc: 'https://arb1.arbitrum.io/rpc',
    metadataKey: 'arbitrum',
  },
  base: {
    chain: base,
    eid: 30_184,
    rpcEnv: ['BASE_RPC_URL'],
    metadataKey: 'base',
  },
  hyperliquid: {
    chain: hyperliquid,
    eid: 30_367,
    rpcEnv: ['HYPEREVM_RPC_URL', 'HYPERLIQUID_RPC_URL'],
    defaultRpc: 'https://rpc.hyperliquid.xyz/evm',
    metadataKey: 'hyperliquid',
  },
  sonic: {
    chain: sonic,
    eid: 30_332,
    rpcEnv: ['SONIC_RPC_URL'],
    defaultRpc: 'https://rpc.soniclabs.com',
    metadataKey: 'sonic',
  },
  monad: {
    chain: monad,
    eid: 30_390,
    rpcEnv: ['MONAD_RPC_URL'],
    defaultRpc: 'https://rpc-mainnet.monadinfra.com',
    metadataKey: 'monad',
  },
}

const ALL_KEYS = Object.keys(CHAINS) as ChainKey[]

type UlnConfig = {
  confirmations: bigint
  requiredDvnCount: number
  optionalDvnCount: number
  optionalDvnThreshold: number
  requiredDvns: readonly Address[]
  optionalDvns: readonly Address[]
}

const ULN_CONFIG_ABI = [{
  type: 'tuple',
  components: [
    { name: 'confirmations', type: 'uint64' },
    { name: 'requiredDvnCount', type: 'uint8' },
    { name: 'optionalDvnCount', type: 'uint8' },
    { name: 'optionalDvnThreshold', type: 'uint8' },
    { name: 'requiredDvns', type: 'address[]' },
    { name: 'optionalDvns', type: 'address[]' },
  ],
}] as const

const ENDPOINT_ABI = parseAbi([
  'function delegates(address oapp) view returns (address)',
  'function getSendLibrary(address sender, uint32 dstEid) view returns (address)',
  'function isDefaultSendLibrary(address sender, uint32 dstEid) view returns (bool)',
  'function getReceiveLibrary(address receiver, uint32 srcEid) view returns (address lib, bool isDefault)',
  'function setConfig(address oapp, address lib, (uint32 eid, uint32 configType, bytes config)[] params)',
  'function setSendLibrary(address oapp, uint32 dstEid, address sendLib)',
  'function setReceiveLibrary(address oapp, uint32 srcEid, address receiveLib, uint256 gracePeriod)',
])

const ULN_ABI = [
  {
    type: 'function',
    name: 'getAppUlnConfig',
    stateMutability: 'view',
    inputs: [
      { name: 'oapp', type: 'address' },
      { name: 'remoteEid', type: 'uint32' },
    ],
    outputs: ULN_CONFIG_ABI,
  },
  {
    type: 'function',
    name: 'isSupportedEid',
    stateMutability: 'view',
    inputs: [{ name: 'eid', type: 'uint32' }],
    outputs: [{ type: 'bool' }],
  },
] as const

const OAPP_ABI = parseAbi([
  'function owner() view returns (address)',
  'function endpoint() view returns (address)',
  'function peers(uint32 eid) view returns (bytes32)',
])

function env(name: string): string {
  return String(process.env[name] ?? '').trim()
}

function firstRpc(...names: string[]): string {
  for (const name of names) {
    const value = env(name).split(',')[0]?.trim()
    if (value) return value
  }
  return ''
}

const RPC_FALLBACKS: Partial<Record<ChainKey, readonly string[]>> = {
  avalanche: [
    'https://avalanche-c-chain-rpc.publicnode.com',
    'https://api.avax.network/ext/bc/C/rpc',
  ],
  bsc: ['https://bsc-dataseed.binance.org', 'https://bsc-dataseed1.bnbchain.org', 'https://binance.llamarpc.com'],
  sonic: ['https://rpc.soniclabs.com'],
  hyperliquid: ['https://rpc.hyperliquid.xyz/evm'],
  monad: ['https://rpc-mainnet.monadinfra.com', 'https://rpc.monad.xyz'],
  base: ['https://mainnet.base.org', 'https://base-rpc.publicnode.com'],
}

function isUnreliableRpc(key: ChainKey, rpc: string): boolean {
  const host = rpc.toLowerCase()
  // Matrixed BSC proxy returns "Missing or invalid parameters" on eth_call/send.
  return (key === 'bsc' || key === 'avalanche') && host.includes('matrixed')
}

async function resolveRpc(key: ChainKey): Promise<string> {
  const spec = CHAINS[key]
  const candidates = [
    ...spec.rpcEnv.map((name) => firstRpc(name)).filter(Boolean),
    spec.defaultRpc ?? '',
    ...(RPC_FALLBACKS[key] ?? []),
  ].filter((rpc, index, all) => (
    rpc.length > 0 &&
    all.indexOf(rpc) === index &&
    !isUnreliableRpc(key, rpc) &&
    !(key === 'bsc' && rpc.includes('publicnode'))
  ))
  for (const rpc of candidates) {
    try {
      const client = createPublicClient({
        chain: spec.chain,
        transport: http(rpc, { timeout: 15_000 }),
      })
      if (await client.getChainId() === spec.chain.id) return rpc
    } catch {
      continue
    }
  }
  throw new Error(`missing_rpc:${key}`)
}

async function feeFields(
  client: ReturnType<typeof createPublicClient>,
  chainId: number,
): Promise<Record<string, bigint>> {
  const block = await client.getBlock({ blockTag: 'latest' })
  const base = block.baseFeePerGas ?? 0n
  const quoted = await client.getGasPrice()
  // BSC (and any chain with a 0 base fee) wants a legacy gasPrice, not 1559.
  if (chainId === 56 || base === 0n) {
    const gasPrice = quoted > 0n ? (quoted * 12n) / 10n : 50_000_000n
    return { gasPrice }
  }
  const tip = chainId === 146 || chainId === 143 ? 1_000_000_000n : 100_000_000n
  const maxFeePerGas = (base * 12n) / 10n + tip
  return { maxFeePerGas, maxPriorityFeePerGas: tip }
}

function errMsg(error: unknown): string {
  if (error instanceof Error) return error.message.split('\n')[0] ?? error.message
  return String(error)
}

function normalizePrivateKey(raw: string): Hex {
  const value = raw.startsWith('0x') ? raw : `0x${raw}`
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error('private_key_invalid')
  return value as Hex
}

function orderedAddresses(addresses: readonly Address[]): Address[] {
  return [...addresses].sort((left, right) => left.toLowerCase().localeCompare(right.toLowerCase()))
}

function exactAddressList(actual: readonly Address[], expected: readonly Address[]): boolean {
  return actual.length === expected.length &&
    actual.every((address, index) => address.toLowerCase() === expected[index]?.toLowerCase())
}

function encodeUlnConfig(config: UlnConfig): Hex {
  return encodeAbiParameters(ULN_CONFIG_ABI, [config])
}

function parseChainArg(): ChainKey | 'all' {
  const idx = process.argv.indexOf('--chain')
  const raw = (idx >= 0 ? process.argv[idx + 1] : 'all')?.trim().toLowerCase()
  if (!raw || raw === 'all') return 'all'
  if ((ALL_KEYS as readonly string[]).includes(raw)) return raw as ChainKey
  throw new Error(`unsupported_chain:${raw}`)
}

function skipInflightReceive(): boolean {
  return !process.argv.includes('--force-inflight-receive')
}

function buildExpected(named: readonly { name: string; address: Address }[]): UlnConfig {
  const requiredNames = new Set(EXPECTED_EVM_REQUIRED_DVN_NAMES.map((n) => n.toLowerCase()))
  const requiredDvns = orderedAddresses(
    named.filter((row) => requiredNames.has(row.name.toLowerCase())).map((row) => row.address),
  )
  const optionalDvns = orderedAddresses(
    named.filter((row) => !requiredNames.has(row.name.toLowerCase())).map((row) => row.address),
  )
  if (requiredDvns.length !== EXPECTED_EVM_REQUIRED_DVN_COUNT) {
    throw new Error(`evm_required_dvn_count_mismatch:${requiredDvns.length}`)
  }
  if (optionalDvns.length !== EXPECTED_EVM_OPTIONAL_DVN_COUNT) {
    throw new Error(`evm_optional_dvn_count_mismatch:${optionalDvns.length}`)
  }
  return {
    confirmations: EXPECTED_EVM_LANE_CONFIRMATIONS,
    requiredDvnCount: EXPECTED_EVM_REQUIRED_DVN_COUNT,
    optionalDvnCount: optionalDvns.length,
    optionalDvnThreshold: EXPECTED_EVM_OPTIONAL_DVN_THRESHOLD,
    requiredDvns,
    optionalDvns,
  }
}

function isExact(actual: UlnConfig, expected: UlnConfig): boolean {
  return actual.confirmations === expected.confirmations &&
    isExpectedEvmListingDvnShape({
      confirmations: actual.confirmations,
      requiredDvnCount: actual.requiredDvnCount,
      optionalDvnCount: actual.optionalDvnCount,
      optionalDvnThreshold: actual.optionalDvnThreshold,
    }) &&
    exactAddressList(actual.requiredDvns, expected.requiredDvns) &&
    exactAddressList(actual.optionalDvns, expected.optionalDvns)
}

async function resolveDvns(metadataKey: string): Promise<{ name: string; address: Address }[]> {
  const url = env('LZ_DVN_METADATA_URL') || DEFAULT_DVN_METADATA_URL
  const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`dvn_metadata_http_${response.status}`)
  const body = await response.json() as Record<string, {
    chainKey?: string
    dvns?: Record<string, { canonicalName?: string; version?: number; deprecated?: boolean; lzReadCompatible?: boolean }>
  }>
  const record = Object.values(body).find((row) => row.chainKey === metadataKey && row.dvns)
  if (!record?.dvns) throw new Error(`dvn_metadata_missing_chain:${metadataKey}`)
  return DVN_NAMES.map((name) => {
    const matches = Object.entries(record.dvns ?? {}).filter(([, meta]) => (
      meta?.canonicalName === name &&
      meta.version === 2 &&
      meta.deprecated !== true &&
      meta.lzReadCompatible !== true
    ))
    if (matches.length !== 1) throw new Error(`dvn_metadata_ambiguous:${metadataKey}:${name}:${matches.length}`)
    return { name, address: getAddress(matches[0]![0]) }
  })
}

type Pathway = {
  remote: ChainKey
  remoteEid: number
  sendLibrary: Address
  receiveLibrary: Address
  sendLibraryIsDefault: boolean
  receiveLibraryIsDefault: boolean
  send: UlnConfig
  receive: UlnConfig
  sendOk: boolean
  receiveOk: boolean
  skipReceiveWrite: boolean
  sendSupported: boolean
  receiveSupported: boolean
}

async function readChain(key: ChainKey, expected: UlnConfig): Promise<{
  key: ChainKey
  rpc: string
  chain: Chain
  endpoint: Address
  owner: Address
  delegate: Address
  pathways: Pathway[]
}> {
  const spec = CHAINS[key]
  const rpc = await resolveRpc(key)
  const client = createPublicClient({ chain: spec.chain, transport: http(rpc) })
  if (await client.getChainId() !== spec.chain.id) throw new Error(`${key}_chain_id_mismatch`)
  const endpoint = getAddress(
    await client.readContract({ address: EAGLE_OFT, abi: OAPP_ABI, functionName: 'endpoint' }),
  )
  const [owner, delegate] = await Promise.all([
    client.readContract({ address: EAGLE_OFT, abi: OAPP_ABI, functionName: 'owner' }),
    client.readContract({ address: endpoint, abi: ENDPOINT_ABI, functionName: 'delegates', args: [EAGLE_OFT] }),
  ])
  const pathways: Pathway[] = []
  for (const remote of ALL_KEYS) {
    if (remote === key) continue
    const remoteEid = CHAINS[remote].eid
    const peer = await client.readContract({
      address: EAGLE_OFT,
      abi: OAPP_ABI,
      functionName: 'peers',
      args: [remoteEid],
    })
    if (peer === '0x0000000000000000000000000000000000000000000000000000000000000000') continue
    const [sendLibrary, sendLibraryIsDefault, receiveLibraryResult] = await Promise.all([
      client.readContract({
        address: endpoint,
        abi: ENDPOINT_ABI,
        functionName: 'getSendLibrary',
        args: [EAGLE_OFT, remoteEid],
      }),
      client.readContract({
        address: endpoint,
        abi: ENDPOINT_ABI,
        functionName: 'isDefaultSendLibrary',
        args: [EAGLE_OFT, remoteEid],
      }),
      client.readContract({
        address: endpoint,
        abi: ENDPOINT_ABI,
        functionName: 'getReceiveLibrary',
        args: [EAGLE_OFT, remoteEid],
      }),
    ])
    const [receiveLibrary, receiveLibraryIsDefault] = receiveLibraryResult
    const [send, receive, sendSupported, receiveSupported] = await Promise.all([
      client.readContract({
        address: sendLibrary,
        abi: ULN_ABI,
        functionName: 'getAppUlnConfig',
        args: [EAGLE_OFT, remoteEid],
      }),
      client.readContract({
        address: receiveLibrary,
        abi: ULN_ABI,
        functionName: 'getAppUlnConfig',
        args: [EAGLE_OFT, remoteEid],
      }),
      client.readContract({
        address: sendLibrary,
        abi: ULN_ABI,
        functionName: 'isSupportedEid',
        args: [remoteEid],
      }),
      client.readContract({
        address: receiveLibrary,
        abi: ULN_ABI,
        functionName: 'isSupportedEid',
        args: [remoteEid],
      }),
    ])
    const sendCfg: UlnConfig = {
      confirmations: send.confirmations,
      requiredDvnCount: send.requiredDvnCount,
      optionalDvnCount: send.optionalDvnCount,
      optionalDvnThreshold: send.optionalDvnThreshold,
      requiredDvns: send.requiredDvns.map((a) => getAddress(a)),
      optionalDvns: send.optionalDvns.map((a) => getAddress(a)),
    }
    const receiveCfg: UlnConfig = {
      confirmations: receive.confirmations,
      requiredDvnCount: receive.requiredDvnCount,
      optionalDvnCount: receive.optionalDvnCount,
      optionalDvnThreshold: receive.optionalDvnThreshold,
      requiredDvns: receive.requiredDvns.map((a) => getAddress(a)),
      optionalDvns: receive.optionalDvns.map((a) => getAddress(a)),
    }
    const skipReceiveWrite = skipInflightReceive() && key === 'arbitrum' && INFLIGHT_ARB_RECEIVE_EIDS.has(remoteEid)
    pathways.push({
      remote,
      remoteEid,
      sendLibrary: getAddress(sendLibrary),
      receiveLibrary: getAddress(receiveLibrary),
      sendLibraryIsDefault: Boolean(sendLibraryIsDefault),
      receiveLibraryIsDefault: Boolean(receiveLibraryIsDefault),
      send: sendCfg,
      receive: receiveCfg,
      sendOk: isExact(sendCfg, expected),
      receiveOk: isExact(receiveCfg, expected),
      skipReceiveWrite,
      sendSupported: Boolean(sendSupported),
      receiveSupported: Boolean(receiveSupported),
    })
  }
  return {
    key,
    rpc,
    chain: spec.chain,
    endpoint: getAddress(endpoint),
    owner: getAddress(owner),
    delegate: getAddress(delegate),
    pathways,
  }
}

async function applyChain(
  snapshot: Awaited<ReturnType<typeof readChain>>,
  expected: UlnConfig,
  account: ReturnType<typeof privateKeyToAccount>,
): Promise<{ pins: Hex[]; configs: Hex[]; errors: string[] }> {
  const client = createPublicClient({ chain: snapshot.chain, transport: http(snapshot.rpc) })
  const wallet = createWalletClient({ account, chain: snapshot.chain, transport: http(snapshot.rpc) })
  const pins: Hex[] = []
  const configs: Hex[] = []
  const errors: string[] = []
  const pinFees = await feeFields(client, snapshot.chain.id)
  const configFees = await feeFields(client, snapshot.chain.id)

  const send = async (
    label: string,
    functionName: 'setSendLibrary' | 'setReceiveLibrary' | 'setConfig',
    args: readonly unknown[],
    fees: Record<string, bigint>,
    bucket: Hex[],
  ): Promise<boolean> => {
    const write = async (skipSimulate: boolean): Promise<Hex> => {
      if (!skipSimulate) {
        const { request } = await client.simulateContract({
          address: snapshot.endpoint,
          abi: ENDPOINT_ABI,
          functionName,
          args: args as never,
          account,
        })
        const {
          gas: _gas,
          gasPrice: _gasPrice,
          maxFeePerGas: _maxFeePerGas,
          maxPriorityFeePerGas: _maxPriorityFeePerGas,
          ...rest
        } = request
        return wallet.writeContract({ ...rest, ...fees })
      }
      const data = encodeFunctionData({
        abi: ENDPOINT_ABI,
        functionName,
        args: args as never,
      })
        return wallet.sendTransaction({
        to: snapshot.endpoint,
        data,
        account,
        chain: snapshot.chain,
        gas: 1_500_000n,
        ...fees,
      })
    }
    try {
      const hash = await write(false)
      const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 300_000 })
      if (receipt.status !== 'success') throw new Error(`tx_reverted:${hash}`)
      bucket.push(hash)
      process.stdout.write(`${snapshot.key} ${label} ${hash}\n`)
      return true
    } catch (error) {
      const first = errMsg(error)
      if (/missing or invalid parameters/i.test(first) || /cannot unmarshal/i.test(first)) {
        try {
          const hash = await write(true)
          const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 180_000 })
          if (receipt.status !== 'success') throw new Error(`tx_reverted:${hash}`)
          bucket.push(hash)
          process.stdout.write(`${snapshot.key} ${label} (no-sim) ${hash}\n`)
          return true
        } catch (retryError) {
          const message = `${snapshot.key} ${label} ${errMsg(retryError)}`
          errors.push(message)
          process.stderr.write(`${message}\n`)
          return false
        }
      }
      const message = `${snapshot.key} ${label} ${first}`
      errors.push(message)
      process.stderr.write(`${message}\n`)
      return false
    }
  }

  for (const path of snapshot.pathways) {
    if (path.sendLibraryIsDefault) {
      await send(
        `setSendLibrary eid=${path.remoteEid}`,
        'setSendLibrary',
        [EAGLE_OFT, path.remoteEid, path.sendLibrary],
        pinFees,
        pins,
      )
    }
    if (path.receiveLibraryIsDefault) {
      await send(
        `setReceiveLibrary eid=${path.remoteEid}`,
        'setReceiveLibrary',
        [EAGLE_OFT, path.remoteEid, path.receiveLibrary, 0n],
        pinFees,
        pins,
      )
    }
  }

  type ConfigParam = { eid: number; configType: number; config: Hex }
  const writeParams = async (kind: 'send' | 'receive', lib: Address, params: ConfigParam[]) => {
    for (const param of params) {
      const label = `setConfig ${kind} lib=${lib} eid=${param.eid}`
      await send(label, 'setConfig', [EAGLE_OFT, lib, [param]], configFees, configs)
    }
  }

  const configBytes = encodeUlnConfig(expected)
  const sendByLib = new Map<Address, ConfigParam[]>()
  for (const path of snapshot.pathways) {
    if (path.sendOk || !path.sendSupported) continue
    const list = sendByLib.get(path.sendLibrary) ?? []
    list.push({ eid: path.remoteEid, configType: ULN_CONFIG_TYPE, config: configBytes })
    sendByLib.set(path.sendLibrary, list)
  }
  const receiveByLib = new Map<Address, ConfigParam[]>()
  for (const path of snapshot.pathways) {
    if (path.receiveOk || path.skipReceiveWrite || !path.receiveSupported) continue
    const list = receiveByLib.get(path.receiveLibrary) ?? []
    list.push({ eid: path.remoteEid, configType: ULN_CONFIG_TYPE, config: configBytes })
    receiveByLib.set(path.receiveLibrary, list)
  }
  for (const [lib, params] of sendByLib) await writeParams('send', lib, params)
  for (const [lib, params] of receiveByLib) await writeParams('receive', lib, params)
  return { pins, configs, errors }
}

async function main(): Promise<void> {
  const execute = process.argv.includes('--execute')
  const chainArg = parseChainArg()
  const keys: ChainKey[] = chainArg === 'all' ? [...ALL_KEYS] : [chainArg]

  const report: Record<string, unknown> = {
    oapp: EAGLE_OFT,
    policy: {
      confirmations: EXPECTED_EVM_LANE_CONFIRMATIONS.toString(),
      required: [...EXPECTED_EVM_REQUIRED_DVN_NAMES],
      optional: [...OPTIONAL_THREE],
      optionalThreshold: EXPECTED_EVM_OPTIONAL_DVN_THRESHOLD,
    },
    skipInflightReceive: skipInflightReceive(),
    inflightArbReceiveEids: [...INFLIGHT_ARB_RECEIVE_EIDS],
    metadataUrl: env('LZ_DVN_METADATA_URL') || DEFAULT_DVN_METADATA_URL,
    execute,
    chains: {} as Record<string, unknown>,
  }

  for (const key of keys) {
    const named = await resolveDvns(CHAINS[key].metadataKey)
    const expected = buildExpected(named)
    const snapshot = await readChain(key, expected)
    ;(report.chains as Record<string, unknown>)[key] = {
      endpoint: snapshot.endpoint,
      owner: snapshot.owner,
      delegate: snapshot.delegate,
      expected: {
        ...expected,
        confirmations: expected.confirmations.toString(),
      },
      pathways: snapshot.pathways.map((path) => ({
        remote: path.remote,
        remoteEid: path.remoteEid,
        sendLibraryIsDefault: path.sendLibraryIsDefault,
        receiveLibraryIsDefault: path.receiveLibraryIsDefault,
        sendSupported: path.sendSupported,
        receiveSupported: path.receiveSupported,
        sendOk: path.sendOk,
        receiveOk: path.receiveOk,
        skipReceiveWrite: path.skipReceiveWrite,
        send: {
          confirmations: path.send.confirmations.toString(),
          requiredDvnCount: path.send.requiredDvnCount,
          optionalDvnCount: path.send.optionalDvnCount,
          optionalDvnThreshold: path.send.optionalDvnThreshold,
          requiredDvns: path.send.requiredDvns,
          optionalDvns: path.send.optionalDvns,
        },
        receive: {
          confirmations: path.receive.confirmations.toString(),
          requiredDvnCount: path.receive.requiredDvnCount,
          optionalDvnCount: path.receive.optionalDvnCount,
          optionalDvnThreshold: path.receive.optionalDvnThreshold,
          requiredDvns: path.receive.requiredDvns,
          optionalDvns: path.receive.optionalDvns,
        },
      })),
    }

    if (!execute) continue
    try {
      if (snapshot.owner !== EAGLE_OWNER) throw new Error(`unexpected_owner:${key}:${snapshot.owner}`)
      const account = privateKeyToAccount(
        normalizePrivateKey(env('EAGLE_OFT_PRIVATE_KEY') || env('PRIVATE_KEY')),
      )
      if (getAddress(account.address) !== snapshot.owner && getAddress(account.address) !== snapshot.delegate) {
        throw new Error(`signer_not_owner_or_delegate:${key}:${account.address}`)
      }
      const client = createPublicClient({ chain: snapshot.chain, transport: http(snapshot.rpc) })
      const bal = await client.getBalance({ address: account.address })
      process.stdout.write(`${key} rpc=${snapshot.rpc.split('?')[0]} signer balance=${formatEther(bal)}\n`)
      const hashes = await applyChain(snapshot, expected, account)
      ;(report.chains as Record<string, unknown>)[`${key}Hashes`] = hashes
      if (hashes.errors.length > 0) process.exitCode = 1
    } catch (error) {
      process.exitCode = 1
      const message = `${key} ${errMsg(error)}`
      process.stderr.write(`${message}\n`)
      ;(report.chains as Record<string, unknown>)[`${key}Error`] = message
    }
  }

  process.stdout.write(`${JSON.stringify(report, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2)}\n`)
  if (!execute) {
    process.stdout.write('Dry-run only. Re-run with --execute (47-eagle PRIVATE_KEY → 0x7310…). Inflight Arb receive ULNs stay 1-of-1 Labs until those packets deliver.\n')
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
