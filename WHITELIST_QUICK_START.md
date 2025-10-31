# 🔒 QUICK START: Enable Whitelist Mode

**Goal:** Restrict vault to multisig-only for initial testing

---

## 🚀 FASTEST METHOD (Copy & Paste)

### Step 1: Generate Transaction Data

```bash
cd /home/akitav2/.cursor/worktrees/eagle-ovault-clean__WSL__ubuntu-24.04_/8fkjs

# Transaction 1 data (enable whitelist)
cast calldata "setWhitelistEnabled(bool)" true

# Transaction 2 data (whitelist multisig)
cast calldata "setWhitelist(address,bool)" 0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3 true
```

### Step 2: Submit to Multisig

Go to your multisig interface and create 2 transactions:

**Transaction 1:**
- To: `0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953`
- Value: `0`
- Data: `0x1b0f9381000000000000000000000000000000000000000000000000000000000000000001`

**Transaction 2:**
- To: `0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953`
- Value: `0`
- Data: `0x0d392cd90000000000000000000000000e5a1d534eb7f00397361f645f0f39e5d16cc1de30000000000000000000000000000000000000000000000000000000000000001`

### Step 3: Execute & Verify

```bash
# Check if enabled
cast call 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953 \
  "whitelistEnabled()(bool)" \
  --rpc-url https://eth.llamarpc.com

# Should return: true ✅
```

---

## ✅ DONE!

Now only the multisig (`0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3`) can deposit/withdraw.

**To disable later:** See `ENABLE_WHITELIST_INSTRUCTIONS.md`

---

## 📞 Need Help?

- Full instructions: `ENABLE_WHITELIST_INSTRUCTIONS.md`
- Telegram: https://t.me/Eagle_community_47

