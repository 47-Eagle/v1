import type { EndpointId } from '@layerzerolabs/lz-definitions'

// LayerZero OApp Configuration for Eagle OVault
// This defines the complete omnichain setup

const BSC_CONTRACTS = {
    usd1Adapter: '0x283AbE84811318a873FB98242FC0FE008e7036D4',
    wlfiAdapter: '0x1A66Df0Bd8DBCE7e15e87E4FE7a52Ce6D8e6A688',
}

const ETHEREUM_CONTRACTS = {
    vault: '0xb751adb8Dd9767309D7a0e328B29909aFd311Dc0',
    usd1Adapter: '0xba9B60A00fD10323Abbdc1044627B54D3ebF470e',
    wlfiAdapter: '0x45d452aa571494b896d7926563B41a7b16B74E2F',
    shareOFT: '0x68cF24743CA335ae3c2e21c2538F4E929224F096',
}

const config = {
    contracts: [
        // BSC Contracts
        {
            contract: { 
                eid: 30102 as EndpointId, // BSC
                contractName: 'OFTAdapter',
                address: BSC_CONTRACTS.usd1Adapter,
            },
        },
        {
            contract: { 
                eid: 30102 as EndpointId, // BSC
                contractName: 'OFTAdapter', 
                address: BSC_CONTRACTS.wlfiAdapter,
            },
        },
        // Ethereum Contracts
        {
            contract: { 
                eid: 30101 as EndpointId, // Ethereum
                contractName: 'OFTAdapter',
                address: ETHEREUM_CONTRACTS.usd1Adapter,
            },
        },
        {
            contract: { 
                eid: 30101 as EndpointId, // Ethereum
                contractName: 'OFTAdapter',
                address: ETHEREUM_CONTRACTS.wlfiAdapter,
            },
        },
        {
            contract: { 
                eid: 30101 as EndpointId, // Ethereum
                contractName: 'OFT',
                address: ETHEREUM_CONTRACTS.shareOFT,
            },
        },
    ],
    connections: [
        // USD1 Adapter connections
        {
            from: { 
                eid: 30102 as EndpointId, // BSC
                address: BSC_CONTRACTS.usd1Adapter,
            },
            to: { 
                eid: 30101 as EndpointId, // Ethereum
                address: ETHEREUM_CONTRACTS.usd1Adapter,
            },
        },
        {
            from: { 
                eid: 30101 as EndpointId, // Ethereum
                address: ETHEREUM_CONTRACTS.usd1Adapter,
            },
            to: { 
                eid: 30102 as EndpointId, // BSC
                address: BSC_CONTRACTS.usd1Adapter,
            },
        },
        // WLFI Adapter connections
        {
            from: { 
                eid: 30102 as EndpointId, // BSC
                address: BSC_CONTRACTS.wlfiAdapter,
            },
            to: { 
                eid: 30101 as EndpointId, // Ethereum
                address: ETHEREUM_CONTRACTS.wlfiAdapter,
            },
        },
        {
            from: { 
                eid: 30101 as EndpointId, // Ethereum
                address: ETHEREUM_CONTRACTS.wlfiAdapter,
            },
            to: { 
                eid: 30102 as EndpointId, // BSC
                address: BSC_CONTRACTS.wlfiAdapter,
            },
        },
        // Share OFT connections (future expansion)
        // ... more connections as needed
    ],
}

export default config