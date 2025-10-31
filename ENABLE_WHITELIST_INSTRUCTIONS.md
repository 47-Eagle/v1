# 🔒 ENABLE WHITELIST MODE - RESTRICT TO MULTISIG ONLY

**Purpose:** Restrict vault deposits/withdrawals to only the multisig for initial testing.

---

## ⚠️ IMPORTANT: MULTISIG REQUIRED

**The contracts are owned by the multisig**, so you need to execute this through the multisig wallet.

**Multisig Address:** `0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3`

---

## 🎯 WHAT THIS DOES

When enabled:
- ❌ Public **CANNOT** deposit into vault
- ❌ Public **CANNOT** withdraw from vault
- ✅ Multisig **CAN** deposit
- ✅ Multisig **CAN** withdraw
- ✅ Anyone can still wrap/unwrap (if they have shares)
- ✅ Anyone can still transfer tokens

---

## 📋 OPTION 1: Using Multisig UI (Recommended)

### Step 1: Prepare the Transaction Data

```bash
# Generate the calldata for enabling whitelist
cast calldata "setWhitelistEnabled(bool)" true

# Output: 0x1b0f9381000000000000000000000000000000000000000000000000000000000000000001
```

```bash
# Generate the calldata for whitelisting multisig
cast calldata "setWhitelist(address,bool)" 0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3 true

# Output: 0x0d392cd90000000000000000000000000e5a1d534eb7f00397361f645f0f39e5d16cc1de30000000000000000000000000000000000000000000000000000000000000001
```

### Step 2: Submit to Multisig

1. Go to your multisig interface (Safe, Gnosis, etc.)
2. Create **Transaction 1:**
   - **To:** `0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953` (EagleOVault)
   - **Value:** `0`
   - **Data:** `0x1b0f9381000000000000000000000000000000000000000000000000000000000000000001`
   - **Description:** "Enable whitelist mode"

3. Create **Transaction 2:**
   - **To:** `0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953` (EagleOVault)
   - **Value:** `0`
   - **Data:** `0x0d392cd90000000000000000000000000e5a1d534eb7f00397361f645f0f39e5d16cc1de30000000000000000000000000000000000000000000000000000000000000001`
   - **Description:** "Whitelist multisig address"

4. Get required signatures from multisig owners
5. Execute both transactions

---

## 📋 OPTION 2: Using Forge Script (If You Have Multisig Private Key)

**⚠️ WARNING:** This requires the multisig private key. Only use if you control the multisig.

```bash
# Set the multisig private key
export PRIVATE_KEY=<multisig_private_key>

# Run the script
forge script script/EnableWhitelist.s.sol:EnableWhitelist \
  --rpc-url $ETHEREUM_RPC_URL \
  --broadcast \
  -vvv
```

---

## 📋 OPTION 3: Manual Transactions via Cast

```bash
# Transaction 1: Enable whitelist
cast send 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953 \
  "setWhitelistEnabled(bool)" true \
  --rpc-url $ETHEREUM_RPC_URL \
  --private-key $MULTISIG_PRIVATE_KEY

# Transaction 2: Whitelist the multisig
cast send 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953 \
  "setWhitelist(address,bool)" \
  0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3 \
  true \
  --rpc-url $ETHEREUM_RPC_URL \
  --private-key $MULTISIG_PRIVATE_KEY
```

---

## ✅ VERIFY IT WORKED

```bash
# Check if whitelist is enabled
cast call 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953 \
  "whitelistEnabled()(bool)" \
  --rpc-url $ETHEREUM_RPC_URL

# Should return: true

# Check if multisig is whitelisted
cast call 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953 \
  "whitelist(address)(bool)" \
  0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3 \
  --rpc-url $ETHEREUM_RPC_URL

# Should return: true
```

---

## 🧪 TEST IT

### Test 1: Multisig Can Deposit
```bash
# Try depositing from multisig (should work)
cast send 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953 \
  "deposit(uint256,address)" \
  1000000000000000000 \
  0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3 \
  --rpc-url $ETHEREUM_RPC_URL \
  --private-key $MULTISIG_PRIVATE_KEY

# Should succeed ✅
```

### Test 2: Random Address Cannot Deposit
```bash
# Try depositing from random address (should fail)
cast send 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953 \
  "deposit(uint256,address)" \
  1000000000000000000 \
  0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb \
  --rpc-url $ETHEREUM_RPC_URL \
  --private-key $RANDOM_PRIVATE_KEY

# Should revert with "Unauthorized" ❌
```

---

## 🔓 TO DISABLE WHITELIST LATER

When you're ready to open to the public:

### Option 1: Via Multisig UI
```bash
# Generate calldata
cast calldata "setWhitelistEnabled(bool)" false

# Submit to multisig:
# To: 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953
# Data: <calldata from above>
```

### Option 2: Via Script
```bash
forge script script/DisableWhitelist.s.sol:DisableWhitelist \
  --rpc-url $ETHEREUM_RPC_URL \
  --broadcast \
  -vvv
```

---

## 📊 CURRENT STATUS

After enabling whitelist:

| Action | Multisig | Public |
|--------|----------|--------|
| Deposit | ✅ Allowed | ❌ Blocked |
| Withdraw | ✅ Allowed | ❌ Blocked |
| Wrap vEAGLE → EAGLE | ✅ Allowed | ✅ Allowed* |
| Unwrap EAGLE → vEAGLE | ✅ Allowed | ✅ Allowed* |
| Transfer tokens | ✅ Allowed | ✅ Allowed |

*Only if they already have the tokens

---

## ⚠️ IMPORTANT NOTES

1. **Whitelist only affects deposits/withdrawals**
   - Wrapping/unwrapping is not restricted
   - Token transfers are not restricted

2. **You can add more addresses to whitelist**
   ```bash
   # Add another address
   cast send 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953 \
     "setWhitelist(address,bool)" \
     <address> \
     true \
     --rpc-url $ETHEREUM_RPC_URL \
     --private-key $MULTISIG_PRIVATE_KEY
   ```

3. **Disable when ready for public**
   - Test thoroughly with multisig first
   - Monitor for 24-48 hours
   - Then disable whitelist to open to public

---

## 🎯 RECOMMENDED TESTING FLOW

1. ✅ Enable whitelist (multisig only)
2. ✅ Test deposits from multisig (small amounts)
3. ✅ Test withdrawals from multisig
4. ✅ Test wrap/unwrap flows
5. ✅ Monitor for 24-48 hours
6. ✅ Verify everything works correctly
7. ✅ Disable whitelist (open to public)
8. ✅ Announce launch!

---

**Need help? Check the multisig documentation or contact the team on Telegram.**

