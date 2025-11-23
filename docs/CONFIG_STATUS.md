# Configuration Status

## Active Config Files (Root Directory)

### Hardhat Configs
- **`hardhat.config.cjs`** (Primary)
  - Main Hardhat + LayerZero toolbox configuration
  - Used for: Eagle OFT, Composer deployments
  - Networks: Ethereum, Base, BSC, Avalanche, Sepolia, Arbitrum
  - Last updated: Nov 16, 2025
  - Default config when running `npx hardhat`

- **`hardhat.wlfi.config.cjs`** (WLFI-specific)
  - WLFI OFT + Adapter deployment config
  - Networks: `ethereum-mainnet`, `base-mainnet`
  - Last updated: Nov 18, 2025
  - Usage: `npx hardhat --config hardhat.wlfi.config.cjs`

- **`hardhat.wlfi.config.ts`** (WLFI TypeScript variant)
  - TypeScript version of WLFI config
  - Same functionality as `.cjs` version
  - Last updated: Nov 18, 2025

### LayerZero Configs
- **`layerzero.config.js`** (Eagle OApp)
  - Full LayerZero OApp graph for Eagle OFT
  - Ethereum ↔ Base connection
  - Explicit send/receive libraries, DVNs, executors
  - Enforced options for message handling
  - Last updated: Nov 16, 2025

- **`layerzero.config.ts`** (Eagle OApp TypeScript)
  - TypeScript version of Eagle OApp config
  - Type-safe configuration with EndpointId types
  - Last updated: Nov 16, 2025

- **`layerzero.wlfi.config.js`** (WLFI Bridge)
  - WLFI OFT bridge configuration
  - Pairs `WLFIOFTAdapter` (Ethereum) with `WLFIOFT` (Base)
  - Dual DVN setup (LayerZero + Google Cloud)
  - Last updated: Nov 19, 2025 (most recent)

- **`layerzero.wlfi.config.ts`** (WLFI Bridge TypeScript)
  - TypeScript version of WLFI bridge config
  - Last updated: Nov 19, 2025

## Archived Configs (docs/root-notes/archived-configs/)

The following configs were moved to archive as they're superseded by the main configs:

- **`hardhat.lz.config.cjs`** - Minimal LayerZero-only config, superseded by `hardhat.config.cjs`
- **`hardhat.lz-only.config.cjs`** - Another minimal variant, superseded by `hardhat.config.cjs`
- **`layerzero.config.simple.js`** - Simplified config without explicit libraries/DVNs, superseded by full `layerzero.config.js`

These files are kept for historical reference but are no longer used in deployments.

## Usage Guidelines

### For Eagle OFT Deployments
```bash
# Uses hardhat.config.cjs by default
npx hardhat compile
npx hardhat run scripts/deploy-eagle.ts --network ethereum

# Wire LayerZero connections (uses layerzero.config.ts)
npm run lz:wire
```

### For WLFI OFT Deployments
```bash
# Specify WLFI config explicitly
npx hardhat --config hardhat.wlfi.config.cjs run scripts/deploy-wlfi.ts --network ethereum-mainnet

# Wire WLFI bridge (uses layerzero.wlfi.config.ts)
npx hardhat --config hardhat.wlfi.config.cjs lz:oapp:wire --oapp-config layerzero.wlfi.config.ts
```

### Config Selection Logic
1. **Default**: `hardhat.config.cjs` is used when no `--config` flag is specified
2. **WLFI**: Use `--config hardhat.wlfi.config.cjs` for WLFI-specific operations
3. **LayerZero**: The toolbox auto-detects `layerzero.config.ts` or `layerzero.wlfi.config.ts` based on the hardhat config in use

## File Relationships

```
Eagle OFT Flow:
hardhat.config.cjs → layerzero.config.ts → Eagle OFT (0x474e...ea91E)

WLFI OFT Flow:
hardhat.wlfi.config.cjs → layerzero.wlfi.config.ts → WLFI Adapter (Ethereum) + WLFI OFT (Base)
```

## Notes for Contributors
- All active configs remain in repo root for easy access
- TypeScript (`.ts`) and JavaScript (`.js`) variants exist for compatibility
- WLFI configs use different network names (`ethereum-mainnet` vs `ethereum`) to avoid conflicts
- Archived configs in `docs/root-notes/archived-configs/` are for reference only
- When adding new chains, update `hardhat.config.cjs` and `layerzero.config.ts`
