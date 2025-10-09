import { EndpointId } from '@layerzerolabs/lz-definitions'

// LayerZero OApp Config for Eagle Share Cross-Chain System
const config = {
  contracts: [
    // ARBITRUM (Hub) - Adapter
    {
      eid: EndpointId.ARBITRUM_V2_MAINNET,
      contractName: 'EagleShareAdapter',
      address: '0x780A713c0330A0581C027F95198e776515B7b371',
    },
    // SONIC (Spoke) - ShareOFT
    {
      eid: EndpointId.SONIC_V2_MAINNET,
      contractName: 'EagleShareOFTSimple',
      address: '0x695d6B3628B4701E7eAfC0bc511CbAF23f6003eE',
    },
  ],
  connections: [
    // Arbitrum → Sonic
    {
      from: EndpointId.ARBITRUM_V2_MAINNET,
      to: EndpointId.SONIC_V2_MAINNET,
      config: {
        sendLibrary: '0x975bcD720be66659e3EB3C0e4F1866a3020E493A', // From .env: ARBITRUM_SEND_ULN_302
        receiveLibraryConfig: {
          receiveLibrary: '0x7B9E184e07a6EE1aC23eAe0fe8D6Be2f663f05e6', // From .env: ARBITRUM_RECEIVE_ULN_302
          gracePeriod: 0,
        },
        sendConfig: {
          executorConfig: {
            maxMessageSize: 10000,
            executor: '0x31CAe3B7fB82d847621859fb1585353c5720660D', // From .env: ARBITRUM_LZ_EXECUTOR
          },
          ulnConfig: {
            confirmations: 15, // Arbitrum block confirmations
            requiredDVNs: [
              '0x2f55c492897526677c5b68fb199ea31e2c126416', // From .env: ARBITRUM_LZ_DVN (lowercase)
            ],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
        receiveConfig: {
          ulnConfig: {
            confirmations: 10, // Sonic block confirmations  
            requiredDVNs: [
              '0x282b3386571f7f794450d5789911a9804fa346b4', // From .env: SONIC_LZ_DVN (receiving from Sonic)
            ],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
      },
    },
    // Sonic → Arbitrum
    {
      from: EndpointId.SONIC_V2_MAINNET,
      to: EndpointId.ARBITRUM_V2_MAINNET,
      config: {
        sendLibrary: '0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7', // From .env: SONIC_SEND_ULN_302
        receiveLibraryConfig: {
          receiveLibrary: '0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043', // From .env: SONIC_RECEIVE_ULN_302
          gracePeriod: 0,
        },
        sendConfig: {
          executorConfig: {
            maxMessageSize: 10000,
            executor: '0x4208D6E27538189bB48E603D6123A94b8Abe0A0b', // From .env: SONIC_LZ_EXECUTOR
          },
          ulnConfig: {
            confirmations: 10, // Sonic block confirmations
            requiredDVNs: [
              '0x282b3386571f7f794450d5789911a9804fa346b4', // From .env: SONIC_LZ_DVN
            ],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
        receiveConfig: {
          ulnConfig: {
            confirmations: 15, // Arbitrum block confirmations (receiving from Arbitrum)
            requiredDVNs: [
              '0x2f55c492897526677c5b68fb199ea31e2c126416', // From .env: ARBITRUM_LZ_DVN
            ],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
          },
        },
      },
    },
  ],
}

export default config


