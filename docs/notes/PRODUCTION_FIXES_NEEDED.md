# 🎯 Production Fixes for v1 Repo

## Issues to Fix

### 1. ✅ Bottom Navigation Bar - Mobile Spacing
### 2. ✅ Max Supply Block - Disable Deposits at 50M EAGLE

---

## Fix #1: Bottom Navigation Bar (Mobile)

**File**: `frontend/src/components/FloorIndicator.tsx`

**Problem**: Navigation bar at `bottom-20` (80px) overlaps with MetaMask mobile browser's bottom bar.

**Current Code** (Line 133):
```tsx
<div className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
```

**Fix**: Change `bottom-20` to `bottom-24` or `bottom-28` for more breathing room:
```tsx
<div className="md:hidden fixed bottom-28 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
```

**Alternative Fix** (Better for all browsers):
```tsx
<div className="md:hidden fixed bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md pb-safe">
```

This adds `pb-safe` for iOS safe area and increases bottom spacing.

---

## Fix #2: Max Supply Check

**Files to Update**:
1. `frontend/src/hooks/useEagleComposer.ts`
2. `frontend/src/components/ComposerPanel.tsx`

### A. Add Max Supply Check to Hook

**File**: `frontend/src/hooks/useEagleComposer.ts`

**Add after line 21** (after ERC20_ABI):
```typescript
const EAGLE_ABI = [
  "function totalSupply() external view returns (uint256)",
  "function MAX_SUPPLY() external view returns (uint256)"
];
```

**Add constants after line 28**:
```typescript
// Supply limits
const MAX_SUPPLY = 50_000_000n * parseEther('1'); // 50 Million EAGLE tokens
```

**Add new function** (after line 148, before the deposit/redeem functions):
```typescript
/**
 * Check if max supply has been reached
 */
const checkMaxSupply = useCallback(async (): Promise<{
  isMaxReached: boolean;
  currentSupply: bigint;
  maxSupply: bigint;
  remaining: bigint;
}> => {
  const provider = getProvider();
  if (!provider) {
    return {
      isMaxReached: false,
      currentSupply: 0n,
      maxSupply: MAX_SUPPLY,
      remaining: MAX_SUPPLY
    };
  }
  
  try {
    const eagle = new Contract(ADDRESSES.EAGLE, EAGLE_ABI, provider);
    const currentSupply = await eagle.totalSupply();
    const isMaxReached = currentSupply >= MAX_SUPPLY;
    const remaining = isMaxReached ? 0n : MAX_SUPPLY - currentSupply;
    
    return {
      isMaxReached,
      currentSupply,
      maxSupply: MAX_SUPPLY,
      remaining
    };
  } catch (err: any) {
    console.error('Check max supply failed:', err);
    return {
      isMaxReached: false,
      currentSupply: 0n,
      maxSupply: MAX_SUPPLY,
      remaining: MAX_SUPPLY
    };
  }
}, [getProvider]);
```

**Export the function** (add to return statement around line 440):
```typescript
return {
  // Existing exports...
  previewDeposit,
  previewRedeem,
  depositWLFI,
  redeemEAGLE,
  getBalances,
  checkAllowance,
  approveToken,
  loading,
  error,
  isConnected: !!address,
  
  // NEW: Add this line
  checkMaxSupply,
};
```

### B. Update ComposerPanel Component

**File**: `frontend/src/components/ComposerPanel.tsx`

**Add state** (after line 30):
```typescript
const [maxSupplyInfo, setMaxSupplyInfo] = useState<any>(null);
const [isMaxSupplyReached, setIsMaxSupplyReached] = useState(false);
```

**Import the function** (line 22, add to destructuring):
```typescript
const {
  previewDeposit,
  previewRedeem,
  depositWLFI,
  redeemEAGLE,
  getBalances,
  checkAllowance,
  approveToken,
  checkMaxSupply,  // ADD THIS
  loading,
  error,
  isConnected
} = useEagleComposer();
```

**Add useEffect** (after line 37):
```typescript
// Check max supply on mount and when switching tabs
useEffect(() => {
  if (isConnected && activeTab === 'deposit') {
    checkMaxSupply().then(info => {
      setMaxSupplyInfo(info);
      setIsMaxSupplyReached(info.isMaxReached);
    });
  }
}, [isConnected, activeTab, checkMaxSupply]);
```

**Add warning banner** (after line 161, before Balance Display):
```typescript
{/* Max Supply Warning - only show for deposits */}
{activeTab === 'deposit' && isMaxSupplyReached && (
  <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800/50 rounded-xl p-4 mb-4 animate-pulse">
    <div className="flex items-start gap-3">
      <div className="text-2xl">🚫</div>
      <div className="flex-1">
        <h4 className="font-bold text-red-800 dark:text-red-200 text-sm mb-1">
          Deposits Disabled
        </h4>
        <p className="text-xs text-red-700 dark:text-red-300">
          Maximum supply of {(Number(maxSupplyInfo?.maxSupply || 0n) / 1e18).toLocaleString()} EAGLE has been reached.
        </p>
        <p className="text-xs text-red-600 dark:text-red-400 mt-2">
          You can still redeem EAGLE tokens for WLFI.
        </p>
      </div>
    </div>
  </div>
)}
```

**Update deposit button** (line 268, update disabled condition):
```typescript
<NeoButton
  onClick={needsApproval ? handleApprove : (activeTab === 'deposit' ? handleDeposit : handleRedeem)}
  disabled={
    loading || 
    !inputAmount || 
    parseFloat(inputAmount) <= 0 || 
    (activeTab === 'deposit' && isMaxSupplyReached)  // ADD THIS
  }
  className="w-full"
>
  {loading 
    ? 'Processing...'
    : needsApproval
      ? `Approve ${activeTab === 'deposit' ? 'WLFI' : 'EAGLE'}`
      : activeTab === 'deposit' && isMaxSupplyReached
        ? 'Deposits Disabled (Max Supply Reached)'  // ADD THIS
        : activeTab === 'deposit'
          ? 'Deposit'
          : 'Redeem'
  }
</NeoButton>
```

**Update info section** (line 283, add max supply info):
```typescript
{activeTab === 'deposit' ? (
  <>
    <p>• Converts WLFI → vEAGLE → EAGLE in one transaction</p>
    <p>• Includes vault deposit fee + wrapper fee</p>
    <p>• EAGLE can be used for cross-chain operations</p>
    {maxSupplyInfo && !isMaxSupplyReached && (
      <p>• Remaining supply: {(Number(maxSupplyInfo.remaining) / 1e18).toLocaleString()} EAGLE</p>
    )}
    {isMaxSupplyReached && (
      <p className="text-red-500 dark:text-red-400">⚠️ Max supply reached - deposits disabled</p>
    )}
  </>
) : (
  <>
    <p>• Converts EAGLE → vEAGLE → WLFI in one transaction</p>
    <p>• Includes wrapper fee + vault withdrawal fee</p>
    <p>• Receive WLFI directly in your wallet</p>
  </>
)}
```

---

## Testing Checklist

### Fix #1: Bottom Navigation
- [ ] Test on iPhone SE (375px width)
- [ ] Test on iPhone 12 (390px)
- [ ] Test on iPhone 14 Pro Max (430px)
- [ ] Test in MetaMask mobile browser
- [ ] Verify no overlap with browser bottom bar
- [ ] Verify still accessible on all screens

### Fix #2: Max Supply Block
- [ ] Deposits are blocked when supply >= 50M
- [ ] Warning banner shows clearly
- [ ] Button shows "Deposits Disabled"
- [ ] Redeem still works normally
- [ ] Supply info shows correctly when < 50M
- [ ] No errors in console

---

## Deployment Steps

### 1. Checkout v1/main branch or pull latest
```bash
git checkout v1/main
# OR
git pull v1 main
```

### 2. Make the changes
- Edit `frontend/src/components/FloorIndicator.tsx`
- Edit `frontend/src/hooks/useEagleComposer.ts`
- Edit `frontend/src/components/ComposerPanel.tsx`

### 3. Test locally
```bash
cd frontend
npm run dev
```

### 4. Build for production
```bash
npm run build
```

### 5. Deploy
```bash
# If using Vercel
vercel --prod

# Or push to main to trigger auto-deploy
git add frontend/
git commit -m "fix: bottom navigation spacing and add max supply check"
git push origin main
```

---

## Expected Results

### Before
- ❌ Bottom nav overlaps with MetaMask bar
- ❌ Users can deposit even when max supply reached
- ❌ No warning about max supply

### After
- ✅ Bottom nav has proper spacing (112px from bottom)
- ✅ Deposits blocked when 50M EAGLE reached
- ✅ Clear warning banner explains why
- ✅ Redeem functionality still works
- ✅ Shows remaining supply when available

---

## Rollback Plan

If issues arise:

```bash
# Revert the changes
git revert HEAD

# Or redeploy previous version
git checkout <previous-commit-hash>
vercel --prod
```

---

**Created**: December 8, 2025  
**Status**: Ready to Implement  
**Priority**: High (UX + Supply Limit)

---

## Quick Summary

**2 Simple Changes:**
1. Change `bottom-20` to `bottom-28` in FloorIndicator.tsx (1 line)
2. Add max supply check to useEagleComposer and ComposerPanel (~50 lines total)

**Total Time**: ~15 minutes to implement + test


## Issues to Fix

### 1. ✅ Bottom Navigation Bar - Mobile Spacing
### 2. ✅ Max Supply Block - Disable Deposits at 50M EAGLE

---

## Fix #1: Bottom Navigation Bar (Mobile)

**File**: `frontend/src/components/FloorIndicator.tsx`

**Problem**: Navigation bar at `bottom-20` (80px) overlaps with MetaMask mobile browser's bottom bar.

**Current Code** (Line 133):
```tsx
<div className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
```

**Fix**: Change `bottom-20` to `bottom-24` or `bottom-28` for more breathing room:
```tsx
<div className="md:hidden fixed bottom-28 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
```

**Alternative Fix** (Better for all browsers):
```tsx
<div className="md:hidden fixed bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md pb-safe">
```

This adds `pb-safe` for iOS safe area and increases bottom spacing.

---

## Fix #2: Max Supply Check

**Files to Update**:
1. `frontend/src/hooks/useEagleComposer.ts`
2. `frontend/src/components/ComposerPanel.tsx`

### A. Add Max Supply Check to Hook

**File**: `frontend/src/hooks/useEagleComposer.ts`

**Add after line 21** (after ERC20_ABI):
```typescript
const EAGLE_ABI = [
  "function totalSupply() external view returns (uint256)",
  "function MAX_SUPPLY() external view returns (uint256)"
];
```

**Add constants after line 28**:
```typescript
// Supply limits
const MAX_SUPPLY = 50_000_000n * parseEther('1'); // 50 Million EAGLE tokens
```

**Add new function** (after line 148, before the deposit/redeem functions):
```typescript
/**
 * Check if max supply has been reached
 */
const checkMaxSupply = useCallback(async (): Promise<{
  isMaxReached: boolean;
  currentSupply: bigint;
  maxSupply: bigint;
  remaining: bigint;
}> => {
  const provider = getProvider();
  if (!provider) {
    return {
      isMaxReached: false,
      currentSupply: 0n,
      maxSupply: MAX_SUPPLY,
      remaining: MAX_SUPPLY
    };
  }
  
  try {
    const eagle = new Contract(ADDRESSES.EAGLE, EAGLE_ABI, provider);
    const currentSupply = await eagle.totalSupply();
    const isMaxReached = currentSupply >= MAX_SUPPLY;
    const remaining = isMaxReached ? 0n : MAX_SUPPLY - currentSupply;
    
    return {
      isMaxReached,
      currentSupply,
      maxSupply: MAX_SUPPLY,
      remaining
    };
  } catch (err: any) {
    console.error('Check max supply failed:', err);
    return {
      isMaxReached: false,
      currentSupply: 0n,
      maxSupply: MAX_SUPPLY,
      remaining: MAX_SUPPLY
    };
  }
}, [getProvider]);
```

**Export the function** (add to return statement around line 440):
```typescript
return {
  // Existing exports...
  previewDeposit,
  previewRedeem,
  depositWLFI,
  redeemEAGLE,
  getBalances,
  checkAllowance,
  approveToken,
  loading,
  error,
  isConnected: !!address,
  
  // NEW: Add this line
  checkMaxSupply,
};
```

### B. Update ComposerPanel Component

**File**: `frontend/src/components/ComposerPanel.tsx`

**Add state** (after line 30):
```typescript
const [maxSupplyInfo, setMaxSupplyInfo] = useState<any>(null);
const [isMaxSupplyReached, setIsMaxSupplyReached] = useState(false);
```

**Import the function** (line 22, add to destructuring):
```typescript
const {
  previewDeposit,
  previewRedeem,
  depositWLFI,
  redeemEAGLE,
  getBalances,
  checkAllowance,
  approveToken,
  checkMaxSupply,  // ADD THIS
  loading,
  error,
  isConnected
} = useEagleComposer();
```

**Add useEffect** (after line 37):
```typescript
// Check max supply on mount and when switching tabs
useEffect(() => {
  if (isConnected && activeTab === 'deposit') {
    checkMaxSupply().then(info => {
      setMaxSupplyInfo(info);
      setIsMaxSupplyReached(info.isMaxReached);
    });
  }
}, [isConnected, activeTab, checkMaxSupply]);
```

**Add warning banner** (after line 161, before Balance Display):
```typescript
{/* Max Supply Warning - only show for deposits */}
{activeTab === 'deposit' && isMaxSupplyReached && (
  <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800/50 rounded-xl p-4 mb-4 animate-pulse">
    <div className="flex items-start gap-3">
      <div className="text-2xl">🚫</div>
      <div className="flex-1">
        <h4 className="font-bold text-red-800 dark:text-red-200 text-sm mb-1">
          Deposits Disabled
        </h4>
        <p className="text-xs text-red-700 dark:text-red-300">
          Maximum supply of {(Number(maxSupplyInfo?.maxSupply || 0n) / 1e18).toLocaleString()} EAGLE has been reached.
        </p>
        <p className="text-xs text-red-600 dark:text-red-400 mt-2">
          You can still redeem EAGLE tokens for WLFI.
        </p>
      </div>
    </div>
  </div>
)}
```

**Update deposit button** (line 268, update disabled condition):
```typescript
<NeoButton
  onClick={needsApproval ? handleApprove : (activeTab === 'deposit' ? handleDeposit : handleRedeem)}
  disabled={
    loading || 
    !inputAmount || 
    parseFloat(inputAmount) <= 0 || 
    (activeTab === 'deposit' && isMaxSupplyReached)  // ADD THIS
  }
  className="w-full"
>
  {loading 
    ? 'Processing...'
    : needsApproval
      ? `Approve ${activeTab === 'deposit' ? 'WLFI' : 'EAGLE'}`
      : activeTab === 'deposit' && isMaxSupplyReached
        ? 'Deposits Disabled (Max Supply Reached)'  // ADD THIS
        : activeTab === 'deposit'
          ? 'Deposit'
          : 'Redeem'
  }
</NeoButton>
```

**Update info section** (line 283, add max supply info):
```typescript
{activeTab === 'deposit' ? (
  <>
    <p>• Converts WLFI → vEAGLE → EAGLE in one transaction</p>
    <p>• Includes vault deposit fee + wrapper fee</p>
    <p>• EAGLE can be used for cross-chain operations</p>
    {maxSupplyInfo && !isMaxSupplyReached && (
      <p>• Remaining supply: {(Number(maxSupplyInfo.remaining) / 1e18).toLocaleString()} EAGLE</p>
    )}
    {isMaxSupplyReached && (
      <p className="text-red-500 dark:text-red-400">⚠️ Max supply reached - deposits disabled</p>
    )}
  </>
) : (
  <>
    <p>• Converts EAGLE → vEAGLE → WLFI in one transaction</p>
    <p>• Includes wrapper fee + vault withdrawal fee</p>
    <p>• Receive WLFI directly in your wallet</p>
  </>
)}
```

---

## Testing Checklist

### Fix #1: Bottom Navigation
- [ ] Test on iPhone SE (375px width)
- [ ] Test on iPhone 12 (390px)
- [ ] Test on iPhone 14 Pro Max (430px)
- [ ] Test in MetaMask mobile browser
- [ ] Verify no overlap with browser bottom bar
- [ ] Verify still accessible on all screens

### Fix #2: Max Supply Block
- [ ] Deposits are blocked when supply >= 50M
- [ ] Warning banner shows clearly
- [ ] Button shows "Deposits Disabled"
- [ ] Redeem still works normally
- [ ] Supply info shows correctly when < 50M
- [ ] No errors in console

---

## Deployment Steps

### 1. Checkout v1/main branch or pull latest
```bash
git checkout v1/main
# OR
git pull v1 main
```

### 2. Make the changes
- Edit `frontend/src/components/FloorIndicator.tsx`
- Edit `frontend/src/hooks/useEagleComposer.ts`
- Edit `frontend/src/components/ComposerPanel.tsx`

### 3. Test locally
```bash
cd frontend
npm run dev
```

### 4. Build for production
```bash
npm run build
```

### 5. Deploy
```bash
# If using Vercel
vercel --prod

# Or push to main to trigger auto-deploy
git add frontend/
git commit -m "fix: bottom navigation spacing and add max supply check"
git push origin main
```

---

## Expected Results

### Before
- ❌ Bottom nav overlaps with MetaMask bar
- ❌ Users can deposit even when max supply reached
- ❌ No warning about max supply

### After
- ✅ Bottom nav has proper spacing (112px from bottom)
- ✅ Deposits blocked when 50M EAGLE reached
- ✅ Clear warning banner explains why
- ✅ Redeem functionality still works
- ✅ Shows remaining supply when available

---

## Rollback Plan

If issues arise:

```bash
# Revert the changes
git revert HEAD

# Or redeploy previous version
git checkout <previous-commit-hash>
vercel --prod
```

---

**Created**: December 8, 2025  
**Status**: Ready to Implement  
**Priority**: High (UX + Supply Limit)

---

## Quick Summary

**2 Simple Changes:**
1. Change `bottom-20` to `bottom-28` in FloorIndicator.tsx (1 line)
2. Add max supply check to useEagleComposer and ComposerPanel (~50 lines total)

**Total Time**: ~15 minutes to implement + test

