# 3D Uniswap V3 Charm-Managed Position - Build Guide

**Use this guide to provide all necessary information to build a 3D visualization of Uniswap V3 liquidity positions managed by Charm Finance**

---

## 📋 Quick Summary

To build a 3D model of Uniswap V3 Charm-managed positions, provide:
1. **Design system colors** (Eagle Finance brand colors)
2. **Technical stack** (React Three Fiber setup)
3. **Uniswap V3 concepts** (ticks, price ranges, liquidity distribution)
4. **Data structure** (position configurations)
5. **Visual specifications** (what to display and how)
6. **Existing code** (reference implementation)

---

## 🎨 1. Design System & Colors

### Brand Colors (Eagle Finance)
```javascript
const colors = {
  // Primary brand color
  gold: '#d4af37',
  goldLight: '#f5e89f',
  goldDark: '#b8941f',
  
  // Position types
  fullRange: '#4a9e9e',     // Teal - Full range position
  baseOrder: '#4a4a9e',     // Blue - Concentrated position around current price
  limitOrder: '#9e4a4a',    // Red - Limit order position
  currentPrice: 'yellow',   // Yellow - Current price indicator
  
  // Token colors
  usd1: '#60a5fa',         // Blue - USD1 stablecoin
  wlfi: '#fbbf24',         // Gold - WLFI token
  
  // UI colors
  text: 'white',
  textSecondary: 'rgb(156, 163, 175)',
  background: 'rgba(10, 10, 10, 0.2)',
  border: 'rgba(212, 175, 55, 0.15)',
  gridPrimary: '#808080',
  gridSecondary: '#202020'
}
```

### Material Properties
```javascript
const materialProps = {
  opacity: 0.6,
  transparent: true,
  metalness: 0.3,
  roughness: 0.4,
  side: THREE.DoubleSide
}
```

---

## 🛠️ 2. Technical Stack

### Required Dependencies
```json
{
  "dependencies": {
    "@react-three/fiber": "^8.17.12",
    "@react-three/drei": "^9.120.8",
    "three": "^0.172.0",
    "react": "^18.0.0",
    "lucide-react": "latest"
  }
}
```

### Canvas Setup
```jsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import * as THREE from 'three';

<Canvas 
  camera={{ 
    position: [0, 10, 25], 
    fov: 50 
  }}
  style={{ 
    height: '50vh', 
    minHeight: '450px',
    background: 'transparent',
    borderRadius: '0.75rem'
  }}
>
  <ambientLight intensity={0.5} />
  <pointLight position={[10, 10, 10]} intensity={1} />
  <pointLight position={[-10, -10, -10]} intensity={0.3} />
  <OrbitControls enableDamping dampingFactor={0.05} />
  
  {/* 3D content here */}
  
  <gridHelper args={[20, 20, 0x202020, 0x404040]} position={[0, 0, 0]} />
</Canvas>
```

---

## 📊 3. Uniswap V3 & Charm Finance Concepts

### Key Concepts to Explain

**Uniswap V3 Ticks:**
- A "tick" is a discrete price point in Uniswap V3
- Price at tick = 1.0001^tick
- Price ranges are defined by tick boundaries (tickLower, tickUpper)

**Liquidity Positions:**
1. **Full Range Position** (Safety Buffer)
   - Covers entire price range: tick -887200 to +887200
   - Always in-range but low capital efficiency
   - Provides safety net for extreme price movements

2. **Base Order** (Concentrated Liquidity)
   - Narrow range around current price
   - High capital efficiency
   - Main fee-earning position

3. **Limit Order** (Directional Position)
   - Positioned above or below current price
   - Acts like a limit order
   - Converts tokens as price moves through range

**Charm Finance Alpha Vaults:**
- Automated strategy management for Uniswap V3
- Rebalances positions based on market conditions
- Multiple positions managed as single vault
- Eagle Finance integrates with Charm for institutional-grade management

### Example Position Configuration
```javascript
const WLFI_PRICE_USD = 4.80; // Current price
const CURRENT_TICK = Math.floor(Math.log(WLFI_PRICE_USD) / Math.log(1.0001));

const liquidityData = [
  {
    name: "Full Range",
    tickLower: -887200,      // Minimum tick
    tickUpper: 887200,       // Maximum tick
    weight: 24.42,           // % of total liquidity
    color: "#4a9e9e"         // Teal
  },
  {
    name: "Base Order",
    tickLower: CURRENT_TICK - 3500,  // ±7000 tick range
    tickUpper: CURRENT_TICK + 3500,
    weight: 49.58,
    color: "#4a4a9e"         // Blue
  },
  {
    name: "Limit Order",
    tickLower: CURRENT_TICK,         // Above current price
    tickUpper: CURRENT_TICK + 20000,
    weight: 26.0,
    color: "#9e4a4a"         // Red
  }
];
```

---

## 📐 4. 3D Visualization Specifications

### Axes Layout
```
X-axis: Price Range (USD/WLFI)
Y-axis: Liquidity Weight (%)
Z-axis: Position Depth (visual depth, not data-driven)
```

### Visual Elements

**1. Liquidity Boxes (3D Rectangles)**
- Width = Tick range (tickUpper - tickLower)
- Height = Liquidity weight (0-100%)
- Depth = Fixed at 2 units (for visual clarity)
- Position X = Center of tick range relative to current price
- Position Y = Half of height (centered vertically)

**Calculation:**
```javascript
const size = 20; // Scene size
const width = ((tickUpper - tickLower) / 80000) * size;
const centerTick = (tickLower + tickUpper) / 2;
const xPosition = ((centerTick - CURRENT_TICK) / 80000) * size;
const yPosition = (weight / 100) * (size / 2);

<mesh position={[xPosition, yPosition, 0]}>
  <boxGeometry args={[width, (weight / 100) * size, 2]} />
  <meshStandardMaterial 
    color={color} 
    transparent 
    opacity={0.6} 
  />
</mesh>
```

**2. Current Price Indicator**
- Yellow vertical plane at X = 0
- Height = Full scene height
- Semi-transparent (opacity 0.5)
- Shows "Current Price: $X.XX" label

**3. Token Split View (Toggle)**
When toggled, positions crossing the current price line split into:
- **Left side (below current price)**: Blue = USD1 (users would receive if withdrawing)
- **Right side (above current price)**: Gold = WLFI (users would receive if withdrawing)

**4. Axis Labels**
```javascript
// Price axis (X-axis) - Bottom
const priceTicks = [
  CURRENT_TICK - 40000,
  CURRENT_TICK - 20000,
  CURRENT_TICK,           // Current
  CURRENT_TICK + 20000,
  CURRENT_TICK + 40000
];

// Display as: $X.XX (formatted price)
priceTicks.map(tick => `$${formatNumber(tickToPrice(tick))}`);

// Y-axis: "Liquidity Weight"
// Z-axis: "Position Depth"
```

**5. Interactive Controls**
- Orbit: Left-click drag
- Zoom: Mouse wheel
- Pan: Right-click drag

---

## 💻 5. Data Structure Requirements

### Position Data Format
```typescript
interface LiquidityPosition {
  name: string;           // "Full Range", "Base Order", "Limit Order"
  tickLower: number;      // Lower tick boundary
  tickUpper: number;      // Upper tick boundary
  weight: number;         // % of total liquidity (0-100)
  color: string;          // Hex color code
}

interface PoolData {
  currentTick: number;    // Current tick
  currentPrice: number;   // Current price in USD
  tvl: number;           // Total Value Locked
  volume24h: number;     // 24h trading volume
  apr: number;           // Annual Percentage Rate
  fees24h: number;       // 24h fees generated
  isLive: boolean;       // Whether data is live or simulated
  positions: LiquidityPosition[];
}
```

### Helper Functions
```javascript
// Convert tick to price
const tickToPrice = (tick) => Math.pow(1.0001, tick);

// Convert price to tick
const priceToTick = (price) => Math.floor(Math.log(price) / Math.log(1.0001));

// Format large numbers
const formatNumber = (num, decimals = 2) => {
  if (num >= 1e9) return (num / 1e9).toFixed(decimals) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(decimals) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(decimals) + "K";
  return num.toFixed(decimals);
};
```

---

## 🎯 6. What to Tell the Next GPT

### Prompt Template

```
I need you to build a 3D visualization of Uniswap V3 liquidity positions managed by Charm Finance Alpha Vaults using React Three Fiber.

**Technical Stack:**
- React 18
- @react-three/fiber for 3D rendering
- @react-three/drei for helpers
- Three.js

**Design System:**
- Use Eagle Finance colors: gold (#d4af37), teal (#4a9e9e), blue (#4a4a9e), red (#9e4a4a)
- Material opacity: 0.6, transparent
- Dark background with subtle grid
- White text labels

**What to Display:**
Three liquidity position boxes in 3D space:

1. **Full Range** (Teal, #4a9e9e)
   - Tick range: -887200 to +887200
   - Weight: ~24% of liquidity
   - Wide, shallow box spanning entire X-axis

2. **Base Order** (Blue, #4a4a9e)
   - Tick range: Current ± 3500 ticks
   - Weight: ~50% of liquidity
   - Narrow, tall box centered at current price

3. **Limit Order** (Red, #9e4a4a)
   - Tick range: Current to Current + 20000 ticks
   - Weight: ~26% of liquidity
   - Medium width box positioned above current price

**Visual Layout:**
- X-axis = Price range (label bottom as "$X.XX" at key ticks)
- Y-axis = Liquidity weight (0-100%)
- Z-axis = Visual depth (fixed)
- Yellow vertical plane at X=0 showing current price
- Grid at Y=0
- Camera at [0, 10, 25] looking at origin

**Interactive:**
- OrbitControls for rotation/zoom
- Sliders to adjust liquidity weights (redistributes between positions)
- Sliders to adjust position widths
- Toggle between "Position View" and "Token Split View"
  - Token Split View: Split boxes crossing current price into blue (USD1) left and gold (WLFI) right

**Key Formulas:**
- Price at tick = 1.0001^tick
- Box width = (tickRange / 80000) * sceneSize
- Box height = (weight / 100) * sceneSize
- X position = ((centerTick - currentTick) / 80000) * sceneSize

**Reference these files:**
[Attach the COMPLETE_DESIGN_SYSTEM.md and this guide]

**Start with:**
The existing VaultVisualization.tsx implementation provided below.

[Paste the full VaultVisualization.tsx code]
```

---

## 📁 7. Files to Provide

When asking another GPT to build this, provide these files:

### Essential Files:
1. ✅ **COMPLETE_DESIGN_SYSTEM.md** - Full design system including colors, typography, components
2. ✅ **This guide (3D_VISUALIZATION_BUILD_GUIDE.md)** - Technical specifications
3. ✅ **VaultVisualization.tsx** - Existing implementation as reference

### Supporting Files (optional but helpful):
4. **useLivePoolData.tsx** - Data fetching hook (if building live data integration)
5. **Example position data JSON** - Sample position configurations
6. **Screenshots** - Visual reference of expected output

---

## 🎨 8. Visual Reference Description

Describe the expected visual to the GPT:

> "Imagine looking at a 3D bar chart showing liquidity distribution across price ranges:
> 
> - **Scene**: Dark background with subtle gray grid on floor
> - **Axes**: Three axes labeled Price Range (X), Liquidity Weight (Y), Position Depth (Z)
> - **Positions**: Three colored 3D rectangular boxes at different X positions and heights:
>   - Wide, short teal box spanning full width (Full Range)
>   - Narrow, tall blue box at center (Base Order)
>   - Medium, medium red box to the right of center (Limit Order)
> - **Current Price**: Bright yellow vertical plane intersecting center (X=0)
> - **Labels**: White text above each box showing position name
> - **Interactivity**: User can rotate view with mouse, zoom in/out
> - **Controls**: Sliders below the 3D view to adjust weights and ranges
> - **Metrics**: Cards above showing APR, Capital Efficiency, Time in Range
> - **Token View**: Toggle to split positions into blue (stablecoin) and gold (token) sides"

---

## 🔧 9. Advanced Features to Request

### Live Data Integration
```javascript
"Integrate with Uniswap V3 Subgraph to fetch real-time position data:
- Pool address: [provide address]
- Fetch current tick, TVL, volume, fees
- Update visualization with live data
- Display 'Live' badge when using real data"
```

### Token Breakdown Calculation
```javascript
"Calculate token split based on Uniswap V3 formula:
- If price < tickLower: 100% token0 (WLFI)
- If price > tickUpper: 100% token1 (USD1)
- If price in range: Use √price formula to calculate split
- Display percentages and amounts for each token"
```

### Strategy Metrics
```javascript
"Calculate and display:
- APR: Based on fees earned / TVL
- Capital Efficiency: (Active liquidity weight) / (Full range weight)
- Time in Range: Expected % of time positions earn fees
- Impermanent Loss: Estimated IL based on price movement"
```

---

## 📚 10. Additional Context

### Charm Finance Integration
> "Eagle Finance integrates with Charm Finance Alpha Vaults for automated Uniswap V3 position management. Charm handles rebalancing, so positions adjust automatically based on market conditions. The visualization shows the current strategy configuration."

### Use Cases
- **Investors**: Understand how their capital is distributed
- **Developers**: Test different strategy configurations
- **Analysts**: Compare strategy efficiency across different settings

### Performance Considerations
- Use `React.memo()` for axis labels to prevent re-renders
- Throttle slider updates to avoid lag
- Use `useMemo()` for calculations
- Keep polygon count low (simple box geometries)

---

## ✅ 11. Checklist for Building

Before asking GPT to build, ensure you provide:

- [ ] Design system colors and brand guidelines
- [ ] Technical stack (React Three Fiber, dependencies)
- [ ] Uniswap V3 concept explanations (ticks, ranges, positions)
- [ ] Data structure format
- [ ] Visual specifications (axes, boxes, labels)
- [ ] Example position configurations
- [ ] Helper functions (tickToPrice, formatNumber)
- [ ] Interactivity requirements
- [ ] Existing code reference
- [ ] Visual description or screenshots
- [ ] Performance considerations

---

## 🚀 12. Example Prompt (Copy & Paste)

```markdown
I need you to create a 3D visualization of Uniswap V3 liquidity positions using React Three Fiber.

**Background:**
I'm building for Eagle Finance, which integrates with Charm Finance Alpha Vaults to manage Uniswap V3 positions. Users need to see how their liquidity is distributed across different price ranges.

**Tech Stack:**
- React 18 + TypeScript
- @react-three/fiber ^8.17.12
- @react-three/drei ^9.120.8
- three ^0.172.0

**Design:**
Use Eagle Finance brand colors:
- Primary gold: #d4af37
- Full Range (teal): #4a9e9e
- Base Order (blue): #4a4a9e  
- Limit Order (red): #9e4a4a
- Current price indicator: yellow
- Material: transparent with 0.6 opacity

**Data Structure:**
```typescript
interface Position {
  name: string;
  tickLower: number;
  tickUpper: number;
  weight: number; // percentage 0-100
  color: string;
}
```

**Visualization Requirements:**
1. Three 3D boxes representing liquidity positions
2. X-axis = Price range (show tick values as $X.XX)
3. Y-axis = Liquidity weight (0-100%)
4. Yellow vertical plane showing current price at X=0
5. Grid at floor level
6. OrbitControls for interaction

**Position Examples:**
- Full Range: ticks -887200 to +887200, weight 24.42%
- Base Order: current tick ±3500, weight 49.58%
- Limit Order: current tick to +20000, weight 26.0%

**Interactivity:**
- Sliders to adjust each position's weight (must sum to 100%)
- Sliders to adjust position widths (tick ranges)
- Radio buttons to position limit order left or right of current price
- Toggle to split positions into token view (blue=USD1, gold=WLFI)

**Formulas:**
- Price = 1.0001^tick
- Box width = (tickRange / 80000) * sceneSize
- Box X position = ((centerTick - currentTick) / 80000) * sceneSize

**Reference Implementation:**
I have an existing implementation that does this. Here's the full code:

[Paste VaultVisualization.tsx here]

**Deliverable:**
A single React component file that I can drop into my Docusaurus site.
```

---

## 📝 13. Notes & Tips

**Common Issues:**
- Ensure tick calculations are correct (use Math.floor for tick conversion)
- Weight sliders must maintain sum of 100%
- Handle edge cases (position widths overlapping)
- Performance: memo-ize labels and axis components

**Enhancements:**
- Add animations for position changes
- Show historical price movement overlay
- Display expected APR for each configuration
- Add "Reset to Recommended" button
- Export configuration as JSON

**Testing:**
- Test with extreme position widths
- Test with all weight on one position
- Test limit order on both sides
- Verify calculations with actual Uniswap V3 math

---

**Last Updated:** October 2024
**Created by:** 47 Eagle Finance Development Team
**Version:** 1.0


