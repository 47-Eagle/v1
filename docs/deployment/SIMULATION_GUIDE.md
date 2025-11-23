# 🧪 How to Run Production Deployment Simulation

## ⚠️ What Went Wrong

The command failed because:
1. `$ETHEREUM_RPC_URL` wasn't loaded from `.env`
2. The hardhat node wasn't started before running the simulation

## ✅ Correct Way to Run Simulation

### Option 1: Using Helper Script (Easiest!)

**Terminal 1:**
```bash
cd /home/akitav2/eagle-ovault-clean
./run-simulation.sh
# This will start the hardhat fork node
```

**Terminal 2:**
```bash
cd /home/akitav2/eagle-ovault-clean
pnpm run simulate:production
```

---

### Option 2: Manual Commands

**Terminal 1 - Start Fork:**
```bash
cd /home/akitav2/eagle-ovault-clean
source .env
npx hardhat node --fork "$ETHEREUM_RPC_URL"
```

**Terminal 2 - Run Simulation:**
```bash
cd /home/akitav2/eagle-ovault-clean
pnpm run simulate:production
```

---

## 🎯 What the Simulation Does

The simulation will:
1. ✅ Fork Ethereum mainnet at current block
2. ✅ Deploy all 4 contracts with vanity addresses
3. ✅ Verify addresses match pattern (0x47...ea91e)
4. ✅ Test deposits and withdrawals
5. ✅ Check gas costs
6. ✅ Verify all functionality works

## 📊 Expected Output

You should see:
```
╔═══════════════════════════════════════════════════════════╗
║  🧪 PRODUCTION DEPLOYMENT SIMULATION                      ║
║     Testing on Mainnet Fork                               ║
╚═══════════════════════════════════════════════════════════╝

✅ EagleOVault deployed: 0x47841b39df0744abd29c9ab2000f6e009e4ea91e
✅ CharmStrategyUSD1 deployed: 0x4779add531f6b7238a48bfcb16af509f521ea91e
✅ EagleVaultWrapper deployed: 0x473802c222e45ef4619a96a4628474c4c51ea91e
✅ EagleShareOFT deployed: 0x47a5e9ae6cdbff9f0c9375c9e42c3a375b2ea91e

... testing functionality ...

✅ All tests passed!
```

## ⏱️ Duration

- Simulation takes **2-5 minutes**
- The fork node stays running until you stop it (Ctrl+C)

## 🚨 If Simulation Fails

Common issues:
1. **"Contract too large"** - This is just a warning, can be ignored
2. **"RPC rate limit"** - Wait a bit and try again
3. **"Address mismatch"** - Salts are correct, this shouldn't happen

## ✅ After Simulation Passes

Once simulation succeeds, you're ready for mainnet deployment!

**Next steps:**
1. Fund deployer wallet with 1+ ETH
2. Review PRE_DEPLOYMENT_CHECKLIST.md
3. Deploy to mainnet: `pnpm run deploy:production:forge`

---

**Quick Start:**
```bash
# Terminal 1:
cd /home/akitav2/eagle-ovault-clean && ./run-simulation.sh

# Terminal 2:
cd /home/akitav2/eagle-ovault-clean && pnpm run simulate:production
```
