# ✅ Eagle Composer UI Fix - Deployment Checklist

## 📋 Pre-Deployment Checklist

### Phase 1: Local Testing (30 minutes)

#### Setup
- [ ] Navigate to `frontend` directory
- [ ] Run `npm install` to ensure all dependencies are installed
- [ ] Run `npm run dev` to start development server
- [ ] Verify server starts without errors

#### Desktop Testing
- [ ] Open `http://localhost:5173` in Chrome
- [ ] Click "Eagle Composer" button
- [ ] Verify modal opens correctly
- [ ] Switch between Deposit and Redeem tabs
- [ ] Test deposit calculation:
  - [ ] Enter 100 WLFI
  - [ ] Verify output shows 99.00 EAGLE
  - [ ] Verify fee shows -1.00 (1%)
  - [ ] Verify conversion rate shows 1:1
- [ ] Test redeem calculation:
  - [ ] Enter 100 EAGLE
  - [ ] Verify output shows 98.00 WLFI
  - [ ] Verify fee shows -2.00 (2%)
  - [ ] Verify conversion rate shows 1:1
- [ ] Test MAX button functionality
- [ ] Test modal close button
- [ ] Test "Before vs After" comparison page
- [ ] Verify no console errors

#### Mobile Testing (Same WiFi Network)
- [ ] Run `npm run dev -- --host`
- [ ] Note your local IP address (e.g., 192.168.1.100)
- [ ] Open `http://YOUR_IP:5173` on iPhone
- [ ] Test on iPhone SE (375px):
  - [ ] Layout fits viewport
  - [ ] Text is readable
  - [ ] Buttons are easy to tap
  - [ ] Input field is accessible
  - [ ] No horizontal scrolling
- [ ] Test on iPhone 12 (390px):
  - [ ] All elements visible
  - [ ] Proper spacing
  - [ ] Touch targets adequate
- [ ] Test on iPhone 14 Pro Max (430px):
  - [ ] Layout scales properly
  - [ ] No wasted space

#### MetaMask Mobile Browser Testing
- [ ] Open MetaMask app on phone
- [ ] Use built-in browser
- [ ] Navigate to `http://YOUR_IP:5173`
- [ ] Verify layout fits properly
- [ ] Test deposit/redeem flows
- [ ] Verify calculations are correct

---

### Phase 2: Code Review (15 minutes)

#### Contract Addresses
- [ ] Open `frontend/src/components/EagleComposer.tsx`
- [ ] Verify VAULT_ADDRESS is correct: `0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953`
- [ ] Verify WRAPPER_ADDRESS is correct: `0x47dAc5063c526dBc6f157093DD1D62d9DE8891c5`
- [ ] Verify EAGLE_OFT_ADDRESS is correct: `0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E`
- [ ] Update WLFI_ADDRESS with actual address (currently placeholder)

#### Fee Structure
- [ ] Verify DEPOSIT_FEE_BPS = 100 (1%)
- [ ] Verify WITHDRAW_FEE_BPS = 200 (2%)
- [ ] Verify BASIS_POINTS = 10000

#### Calculation Logic
- [ ] Review `calculateOutput()` function
- [ ] Verify fee calculation: `(input * FEE_BPS) / BASIS_POINTS`
- [ ] Verify output calculation: `input - fee`
- [ ] Verify percentage display: `FEE_BPS / 100`

---

### Phase 3: Integration (30 minutes)

#### Web3 Setup (If not already done)
- [ ] Install wagmi: `npm install wagmi viem @tanstack/react-query`
- [ ] Create wagmi configuration file
- [ ] Wrap app in WagmiConfig provider
- [ ] Test wallet connection

#### Transaction Implementation
- [ ] Replace TODO in `handleDeposit()` with actual contract call
- [ ] Replace TODO in `handleRedeem()` with actual contract call
- [ ] Add proper error handling
- [ ] Add loading states
- [ ] Add success/error notifications

#### Testing Transactions (Testnet)
- [ ] Deploy contracts to testnet (if needed)
- [ ] Update contract addresses to testnet
- [ ] Test deposit transaction
- [ ] Test redeem transaction
- [ ] Verify balances update correctly
- [ ] Test error scenarios (insufficient balance, etc.)

---

### Phase 4: Build & Deploy (20 minutes)

#### Environment Setup
- [ ] Create `.env` file in `frontend` directory
- [ ] Add RPC endpoints:
  ```
  VITE_ETHEREUM_RPC=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
  VITE_BASE_RPC=https://mainnet.base.org
  VITE_ARBITRUM_RPC=https://arb1.arbitrum.io/rpc
  ```
- [ ] Add WalletConnect project ID (if using)
- [ ] Verify `.env` is in `.gitignore`

#### Build for Production
- [ ] Run `npm run build`
- [ ] Verify build completes without errors
- [ ] Check build output in `dist` folder
- [ ] Run `npm run preview` to test production build locally
- [ ] Verify production build works correctly

#### Deploy to Staging
- [ ] Deploy to staging environment (Vercel/Netlify)
- [ ] Verify staging URL is accessible
- [ ] Test all functionality on staging
- [ ] Test on mobile devices
- [ ] Get team approval

#### Deploy to Production
- [ ] Update contract addresses to mainnet (if different)
- [ ] Verify environment variables are set
- [ ] Deploy to production
- [ ] Verify production URL is accessible
- [ ] Test immediately after deployment
- [ ] Monitor for errors

---

### Phase 5: Post-Deployment (15 minutes)

#### Smoke Tests
- [ ] Open production URL
- [ ] Test deposit flow with small amount
- [ ] Test redeem flow with small amount
- [ ] Verify calculations are correct
- [ ] Test on mobile device
- [ ] Test in MetaMask mobile browser

#### Monitoring
- [ ] Check error logs
- [ ] Monitor transaction success rate
- [ ] Check analytics (if set up)
- [ ] Monitor user feedback

#### Documentation
- [ ] Update README with new features
- [ ] Add screenshots of new UI
- [ ] Update user guide
- [ ] Announce update to community

---

## 🚨 Rollback Plan

If critical issues are found after deployment:

### Immediate Actions
1. [ ] Revert to previous deployment
2. [ ] Notify team of rollback
3. [ ] Document the issue
4. [ ] Fix issue locally
5. [ ] Re-test thoroughly
6. [ ] Re-deploy when fixed

### Rollback Commands
```bash
# Vercel
vercel rollback

# Netlify
netlify rollback

# Manual
# Re-deploy previous version from git
git checkout <previous-commit>
npm run build
vercel --prod
```

---

## 📊 Success Criteria

Deployment is successful when:

- [ ] ✅ All calculations are accurate (1:1 conversion, 1-2% fees)
- [ ] ✅ Mobile layout works on all tested devices
- [ ] ✅ MetaMask mobile browser works correctly
- [ ] ✅ No console errors
- [ ] ✅ Transactions complete successfully
- [ ] ✅ User feedback is positive
- [ ] ✅ No increase in error rate
- [ ] ✅ Load time is acceptable (<3s)

---

## 🐛 Known Issues & Workarounds

### Issue: wagmi hooks not working
**Workaround:** Component currently shows placeholder data. Web3 integration needs to be completed.

**Fix:**
1. Install wagmi dependencies
2. Create wagmi config
3. Wrap app in providers
4. Implement real transaction logic

### Issue: WLFI address not set
**Workaround:** Using placeholder address.

**Fix:**
1. Get actual WLFI token address
2. Update in `EagleComposer.tsx`
3. Verify with team

---

## 📞 Emergency Contacts

If issues arise during deployment:

- **Tech Lead:** [Name] - [Contact]
- **DevOps:** [Name] - [Contact]
- **Product Manager:** [Name] - [Contact]

---

## 📝 Deployment Log

### Deployment #1
- **Date:** _____________
- **Time:** _____________
- **Deployed By:** _____________
- **Environment:** [ ] Staging [ ] Production
- **Status:** [ ] Success [ ] Failed [ ] Rolled Back
- **Notes:** _____________________________________________

### Deployment #2
- **Date:** _____________
- **Time:** _____________
- **Deployed By:** _____________
- **Environment:** [ ] Staging [ ] Production
- **Status:** [ ] Success [ ] Failed [ ] Rolled Back
- **Notes:** _____________________________________________

---

## 🎉 Post-Deployment Celebration

Once everything is working:

- [ ] 🎊 Celebrate with team
- [ ] 📸 Take screenshots for portfolio
- [ ] 📝 Write blog post (optional)
- [ ] 🐦 Tweet about it (optional)
- [ ] 🍕 Order pizza

---

## 📚 Additional Resources

- [UI_FIX_SUMMARY.md](./UI_FIX_SUMMARY.md) - Executive summary
- [VISUAL_GUIDE.md](./VISUAL_GUIDE.md) - Visual comparison
- [frontend/UI_FIXES.md](./frontend/UI_FIXES.md) - Technical details
- [frontend/QUICKSTART.md](./frontend/QUICKSTART.md) - Quick start guide
- [frontend/COMPARISON.md](./frontend/COMPARISON.md) - Detailed comparison

---

**Checklist Version:** 1.0.0  
**Last Updated:** December 8, 2025  
**Status:** Ready to Use ✅

---

**Good luck with your deployment! 🚀**


## 📋 Pre-Deployment Checklist

### Phase 1: Local Testing (30 minutes)

#### Setup
- [ ] Navigate to `frontend` directory
- [ ] Run `npm install` to ensure all dependencies are installed
- [ ] Run `npm run dev` to start development server
- [ ] Verify server starts without errors

#### Desktop Testing
- [ ] Open `http://localhost:5173` in Chrome
- [ ] Click "Eagle Composer" button
- [ ] Verify modal opens correctly
- [ ] Switch between Deposit and Redeem tabs
- [ ] Test deposit calculation:
  - [ ] Enter 100 WLFI
  - [ ] Verify output shows 99.00 EAGLE
  - [ ] Verify fee shows -1.00 (1%)
  - [ ] Verify conversion rate shows 1:1
- [ ] Test redeem calculation:
  - [ ] Enter 100 EAGLE
  - [ ] Verify output shows 98.00 WLFI
  - [ ] Verify fee shows -2.00 (2%)
  - [ ] Verify conversion rate shows 1:1
- [ ] Test MAX button functionality
- [ ] Test modal close button
- [ ] Test "Before vs After" comparison page
- [ ] Verify no console errors

#### Mobile Testing (Same WiFi Network)
- [ ] Run `npm run dev -- --host`
- [ ] Note your local IP address (e.g., 192.168.1.100)
- [ ] Open `http://YOUR_IP:5173` on iPhone
- [ ] Test on iPhone SE (375px):
  - [ ] Layout fits viewport
  - [ ] Text is readable
  - [ ] Buttons are easy to tap
  - [ ] Input field is accessible
  - [ ] No horizontal scrolling
- [ ] Test on iPhone 12 (390px):
  - [ ] All elements visible
  - [ ] Proper spacing
  - [ ] Touch targets adequate
- [ ] Test on iPhone 14 Pro Max (430px):
  - [ ] Layout scales properly
  - [ ] No wasted space

#### MetaMask Mobile Browser Testing
- [ ] Open MetaMask app on phone
- [ ] Use built-in browser
- [ ] Navigate to `http://YOUR_IP:5173`
- [ ] Verify layout fits properly
- [ ] Test deposit/redeem flows
- [ ] Verify calculations are correct

---

### Phase 2: Code Review (15 minutes)

#### Contract Addresses
- [ ] Open `frontend/src/components/EagleComposer.tsx`
- [ ] Verify VAULT_ADDRESS is correct: `0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953`
- [ ] Verify WRAPPER_ADDRESS is correct: `0x47dAc5063c526dBc6f157093DD1D62d9DE8891c5`
- [ ] Verify EAGLE_OFT_ADDRESS is correct: `0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E`
- [ ] Update WLFI_ADDRESS with actual address (currently placeholder)

#### Fee Structure
- [ ] Verify DEPOSIT_FEE_BPS = 100 (1%)
- [ ] Verify WITHDRAW_FEE_BPS = 200 (2%)
- [ ] Verify BASIS_POINTS = 10000

#### Calculation Logic
- [ ] Review `calculateOutput()` function
- [ ] Verify fee calculation: `(input * FEE_BPS) / BASIS_POINTS`
- [ ] Verify output calculation: `input - fee`
- [ ] Verify percentage display: `FEE_BPS / 100`

---

### Phase 3: Integration (30 minutes)

#### Web3 Setup (If not already done)
- [ ] Install wagmi: `npm install wagmi viem @tanstack/react-query`
- [ ] Create wagmi configuration file
- [ ] Wrap app in WagmiConfig provider
- [ ] Test wallet connection

#### Transaction Implementation
- [ ] Replace TODO in `handleDeposit()` with actual contract call
- [ ] Replace TODO in `handleRedeem()` with actual contract call
- [ ] Add proper error handling
- [ ] Add loading states
- [ ] Add success/error notifications

#### Testing Transactions (Testnet)
- [ ] Deploy contracts to testnet (if needed)
- [ ] Update contract addresses to testnet
- [ ] Test deposit transaction
- [ ] Test redeem transaction
- [ ] Verify balances update correctly
- [ ] Test error scenarios (insufficient balance, etc.)

---

### Phase 4: Build & Deploy (20 minutes)

#### Environment Setup
- [ ] Create `.env` file in `frontend` directory
- [ ] Add RPC endpoints:
  ```
  VITE_ETHEREUM_RPC=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
  VITE_BASE_RPC=https://mainnet.base.org
  VITE_ARBITRUM_RPC=https://arb1.arbitrum.io/rpc
  ```
- [ ] Add WalletConnect project ID (if using)
- [ ] Verify `.env` is in `.gitignore`

#### Build for Production
- [ ] Run `npm run build`
- [ ] Verify build completes without errors
- [ ] Check build output in `dist` folder
- [ ] Run `npm run preview` to test production build locally
- [ ] Verify production build works correctly

#### Deploy to Staging
- [ ] Deploy to staging environment (Vercel/Netlify)
- [ ] Verify staging URL is accessible
- [ ] Test all functionality on staging
- [ ] Test on mobile devices
- [ ] Get team approval

#### Deploy to Production
- [ ] Update contract addresses to mainnet (if different)
- [ ] Verify environment variables are set
- [ ] Deploy to production
- [ ] Verify production URL is accessible
- [ ] Test immediately after deployment
- [ ] Monitor for errors

---

### Phase 5: Post-Deployment (15 minutes)

#### Smoke Tests
- [ ] Open production URL
- [ ] Test deposit flow with small amount
- [ ] Test redeem flow with small amount
- [ ] Verify calculations are correct
- [ ] Test on mobile device
- [ ] Test in MetaMask mobile browser

#### Monitoring
- [ ] Check error logs
- [ ] Monitor transaction success rate
- [ ] Check analytics (if set up)
- [ ] Monitor user feedback

#### Documentation
- [ ] Update README with new features
- [ ] Add screenshots of new UI
- [ ] Update user guide
- [ ] Announce update to community

---

## 🚨 Rollback Plan

If critical issues are found after deployment:

### Immediate Actions
1. [ ] Revert to previous deployment
2. [ ] Notify team of rollback
3. [ ] Document the issue
4. [ ] Fix issue locally
5. [ ] Re-test thoroughly
6. [ ] Re-deploy when fixed

### Rollback Commands
```bash
# Vercel
vercel rollback

# Netlify
netlify rollback

# Manual
# Re-deploy previous version from git
git checkout <previous-commit>
npm run build
vercel --prod
```

---

## 📊 Success Criteria

Deployment is successful when:

- [ ] ✅ All calculations are accurate (1:1 conversion, 1-2% fees)
- [ ] ✅ Mobile layout works on all tested devices
- [ ] ✅ MetaMask mobile browser works correctly
- [ ] ✅ No console errors
- [ ] ✅ Transactions complete successfully
- [ ] ✅ User feedback is positive
- [ ] ✅ No increase in error rate
- [ ] ✅ Load time is acceptable (<3s)

---

## 🐛 Known Issues & Workarounds

### Issue: wagmi hooks not working
**Workaround:** Component currently shows placeholder data. Web3 integration needs to be completed.

**Fix:**
1. Install wagmi dependencies
2. Create wagmi config
3. Wrap app in providers
4. Implement real transaction logic

### Issue: WLFI address not set
**Workaround:** Using placeholder address.

**Fix:**
1. Get actual WLFI token address
2. Update in `EagleComposer.tsx`
3. Verify with team

---

## 📞 Emergency Contacts

If issues arise during deployment:

- **Tech Lead:** [Name] - [Contact]
- **DevOps:** [Name] - [Contact]
- **Product Manager:** [Name] - [Contact]

---

## 📝 Deployment Log

### Deployment #1
- **Date:** _____________
- **Time:** _____________
- **Deployed By:** _____________
- **Environment:** [ ] Staging [ ] Production
- **Status:** [ ] Success [ ] Failed [ ] Rolled Back
- **Notes:** _____________________________________________

### Deployment #2
- **Date:** _____________
- **Time:** _____________
- **Deployed By:** _____________
- **Environment:** [ ] Staging [ ] Production
- **Status:** [ ] Success [ ] Failed [ ] Rolled Back
- **Notes:** _____________________________________________

---

## 🎉 Post-Deployment Celebration

Once everything is working:

- [ ] 🎊 Celebrate with team
- [ ] 📸 Take screenshots for portfolio
- [ ] 📝 Write blog post (optional)
- [ ] 🐦 Tweet about it (optional)
- [ ] 🍕 Order pizza

---

## 📚 Additional Resources

- [UI_FIX_SUMMARY.md](./UI_FIX_SUMMARY.md) - Executive summary
- [VISUAL_GUIDE.md](./VISUAL_GUIDE.md) - Visual comparison
- [frontend/UI_FIXES.md](./frontend/UI_FIXES.md) - Technical details
- [frontend/QUICKSTART.md](./frontend/QUICKSTART.md) - Quick start guide
- [frontend/COMPARISON.md](./frontend/COMPARISON.md) - Detailed comparison

---

**Checklist Version:** 1.0.0  
**Last Updated:** December 8, 2025  
**Status:** Ready to Use ✅

---

**Good luck with your deployment! 🚀**



