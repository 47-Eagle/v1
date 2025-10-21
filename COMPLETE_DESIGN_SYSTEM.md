# 47 Eagle Finance - Complete Design System Documentation

**Use this guide to replicate the exact styling on any repository**

---

## 📋 Table of Contents

1. [Framework & Setup](#framework--setup)
2. [Color Palette](#color-palette)
3. [Typography System](#typography-system)
4. [Component Library](#component-library)
5. [3D Visualizations](#3d-visualizations)
6. [Animations & Transitions](#animations--transitions)
7. [Loading Screen](#loading-screen)
8. [Navigation & Layout](#navigation--layout)
9. [Responsive Design](#responsive-design)
10. [Package Dependencies](#package-dependencies)
11. [Quick Start Template](#quick-start-template)

---

## 🚀 Framework & Setup

### Platform
- **Framework**: Docusaurus 3.9.1
- **Language**: TypeScript
- **CSS**: Custom CSS with CSS Variables
- **3D Library**: React Three Fiber + Three.js
- **UI Components**: Radix UI primitives

### Configuration
```typescript
// docusaurus.config.ts key settings
{
  title: '47 Eagle Finance',
  tagline: 'Omnichain DeFi infrastructure powered by LayerZero OVault Standard',
  favicon: 'img/eagle-favicon.ico',
  url: 'https://47-eagle.github.io',
  baseUrl: '/',
  
  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
    navbar: {
      height: 64,
    }
  }
}
```

---

## 🎨 Color Palette

### Brand Colors
```css
/* Primary Golden Brand */
--brand-gold: #d4af37;              /* Main brand color */
--brand-gold-dark: #b8941f;         /* Darker variant */
--brand-gold-darker: #a0800d;       /* Even darker - for links in light mode */
--brand-gold-darkest: #8a6f00;      /* Darkest - maximum contrast */
--brand-gold-light: #e2c55f;        /* Light variant */
--brand-gold-lighter: #edd577;      /* Lighter variant */
--brand-gold-lightest: #f5e89f;     /* Lightest - for highlights */

/* Use Cases:
   - #d4af37: Buttons, accents, 3D elements, logos
   - #a0800d: Links in light mode (better contrast)
   - #f5e89f: Links in dark mode (brighter for visibility)
*/
```

### Neutral Palette
```css
/* Light Mode Grays */
--eagle-white: #ffffff;
--eagle-gray-50: #fafafa;          /* Backgrounds, surfaces */
--eagle-gray-100: #f5f5f5;         /* Card backgrounds */
--eagle-gray-200: #e5e5e5;         /* Borders */
--eagle-gray-300: #d4d4d4;         /* Borders (hover) */
--eagle-gray-400: #a3a3a3;         /* Secondary text */
--eagle-gray-500: #737373;         /* Muted text */
--eagle-gray-600: #525252;         /* Body text */
--eagle-gray-700: #404040;         /* Dark borders (dark mode) */
--eagle-gray-800: #262626;         /* Headings, surfaces (dark mode) */
--eagle-gray-900: #171717;         /* Background (dark mode) */
--eagle-black: #0a0a0a;            /* Main background (dark mode), headings (light mode) */
```

### Theme-Specific Colors

**Light Mode:**
```css
--ifm-background-color: #ffffff;
--ifm-background-surface-color: #fafafa;
--ifm-heading-color: #0a0a0a;        /* Pure black for maximum contrast */
--ifm-font-color-base: #262626;      /* Dark gray for body text */
--ifm-font-color-secondary: #525252; /* Medium gray for secondary text */
--ifm-link-color: #a0800d;           /* Darker gold for better contrast */
--ifm-link-hover-color: #8a6f00;     /* Even darker on hover */
--border-color: #e5e5e5;
--border-color-hover: #d4d4d4;
```

**Dark Mode:**
```css
--ifm-background-color: #0a0a0a;
--ifm-background-surface-color: #171717;
--ifm-heading-color: #ffffff;        /* Pure white for maximum contrast */
--ifm-font-color-base: #e5e5e5;      /* Bright gray for readability */
--ifm-font-color-secondary: #a3a3a3;
--ifm-link-color: #f5e89f;           /* Bright gold for visibility */
--ifm-link-hover-color: #fffacd;     /* Even brighter on hover */
--border-color: #404040;
--border-color-hover: #525252;
```

### 3D Visualization Colors
```javascript
{
  // Liquidity Position Types
  fullRange: '#6366f1',      // Elegant Indigo
  baseOrder: '#d4af37',      // Eagle Golden (brand)
  limitOrder: '#8b5cf6',     // Royal Purple
  currentPrice: '#d4af37',   // Golden accent with glow
  
  // Material Properties
  opacity: 0.75,
  emissiveIntensity: 0.2,
  metalness: 0.3,
  roughness: 0.4
}
```

### Status & UI Colors
```css
--success: #10b981;      /* Green - Active, Live */
--info: #3b82f6;         /* Blue - Informational */
--warning: #fbbf24;      /* Yellow - Warning */
--error: #ef4444;        /* Red - Error, Danger */
--pending: #a855f7;      /* Purple - Coming Soon, Pending */
```

---

## ✍️ Typography System

### Font Families
```css
/* Import from Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

/* Font stacks */
--ifm-font-family-base: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--ifm-font-family-monospace: 'JetBrains Mono', 'SF Mono', 'Courier New', monospace;
```

### Font Sizes
```css
--text-xs: 0.75rem;      /* 12px - Fine print */
--text-sm: 0.875rem;     /* 14px - Secondary text */
--text-base: 1rem;       /* 16px - Body text */
--text-lg: 1.125rem;     /* 18px - Large body */
--text-xl: 1.25rem;      /* 20px - Subheadings */
--text-2xl: 1.5rem;      /* 24px - H3 */
--text-3xl: 2rem;        /* 32px - H2 */
--text-4xl: 2.5rem;      /* 40px - H1 */
--text-5xl: 3.5rem;      /* 56px - Hero titles */
```

### Font Weights
```css
--ifm-font-weight-light: 300;
--ifm-font-weight-normal: 400;
--ifm-font-weight-medium: 500;
--ifm-font-weight-semibold: 600;
--ifm-font-weight-bold: 700;
--ifm-font-weight-black: 900;
```

### Heading Styles
```css
h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
  letter-spacing: -0.02em;  /* Tighter for better readability */
  color: var(--ifm-heading-color);
}

h1 { font-size: 2.5rem; }   /* 40px */
h2 { font-size: 2rem; }     /* 32px */
h3 { font-size: 1.5rem; }   /* 24px */
h4 { font-size: 1.25rem; }  /* 20px */
h5 { font-size: 1.125rem; } /* 18px */
h6 { font-size: 1rem; }     /* 16px */
```

### Text Rendering
```css
* {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-feature-settings: 'kern' 1, 'liga' 1;
  letter-spacing: -0.01em;
  line-height: 1.75;
}
```

---

## 🧩 Component Library

### 1. Glassmorphism Card
```css
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  padding: 1.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-card:hover {
  border-color: rgba(212, 175, 55, 0.4);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  transform: translateY(-2px);
}
```

### 2. Button Styles

**Primary Button:**
```css
.button--primary {
  background: #d4af37;
  color: white;
  border: 1px solid #d4af37;
  border-radius: 8px;
  padding: 0.625rem 1.25rem;
  font-weight: 500;
  font-size: 0.9375rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.button--primary:hover {
  background: #b8941f;
  border-color: #b8941f;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
}

.button--primary:active {
  transform: translateY(0);
}
```

**Glass Button (Secondary):**
```css
.glass-button {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 6px;
  padding: 0.875rem 2.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.9);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-button:hover {
  border-color: rgba(212, 175, 55, 0.5);
  box-shadow: 0 6px 24px rgba(212, 175, 55, 0.2);
  transform: translateY(-2px);
}
```

### 3. Metric/Info Card
```css
.metric-card {
  background: rgba(10, 10, 10, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 0.75rem;
  padding: 1.5rem;
  backdrop-filter: blur(8px);
}

.metric-card-title {
  font-size: 0.875rem;
  color: #e2c55f;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.metric-card-value {
  font-size: 2rem;
  font-weight: 600;
  background: linear-gradient(135deg, #f6d55c 0%, #d4af37 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### 4. Feature Card
```css
.feature-card {
  padding: 1.5rem;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 1rem;
  border: 1px solid rgba(59, 130, 246, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.feature-card:hover {
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.15);
  transform: translateY(-4px);
}

.feature-card h3 {
  color: #3b82f6;
  margin-top: 0;
  font-weight: 600;
}
```

### 5. Admonitions (Info Boxes)
```css
.admonition {
  border-radius: 8px;
  border-left-width: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  padding: 1rem 1.5rem;
  margin: 1.5rem 0;
}

/* Tip */
.admonition-tip {
  border-left-color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

/* Info */
.admonition-info {
  border-left-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}

/* Warning */
.admonition-warning {
  border-left-color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
}

/* Danger */
.admonition-danger {
  border-left-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}
```

### 6. Code Blocks
```css
/* Inline code */
code {
  background: var(--eagle-gray-100);
  border: 1px solid var(--eagle-gray-300);
  border-radius: 4px;
  padding: 0.15rem 0.4rem;
  font-size: 0.875em;
  color: #0a0a0a;
  font-weight: 500;
  font-family: var(--ifm-font-family-monospace);
}

[data-theme='dark'] code {
  background: #1a1a1a;
  border-color: #525252;
  color: #ffffff;
}

/* Code blocks */
.prism-code {
  border-radius: 12px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  padding: 1rem;
}

[data-theme='dark'] .prism-code {
  background: #0f0f0f !important;
  border-color: #525252;
}
```

---

## 🎮 3D Visualizations

### Canvas Setup (React Three Fiber)
```jsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';

<Canvas
  camera={{ 
    position: [15, 15, 15], 
    fov: 50 
  }}
  style={{ 
    background: 'linear-gradient(to bottom, rgb(10,10,10), rgb(23,23,23))',
    borderRadius: '0.75rem',
    height: '600px'
  }}
>
  {/* Background */}
  <color attach="background" args={['#0a0a0a']} />
  <fog attach="fog" args={['#0a0a0a', 25, 60]} />
  
  {/* Lighting */}
  <ambientLight intensity={0.6} />
  <directionalLight position={[10, 10, 5]} intensity={0.8} />
  <pointLight position={[-10, -10, -5]} intensity={0.3} color="#d4af37" />
  <spotLight position={[0, 20, 0]} intensity={0.4} color="#f6d55c" />
  
  {/* Grid */}
  <Grid
    args={[20, 20]}
    cellSize={1}
    cellThickness={0.5}
    cellColor="#d4af37"
    sectionSize={5}
    sectionThickness={1}
    sectionColor="#d4af37"
    fadeDistance={30}
    fadeStrength={1}
  />
  
  {/* Controls */}
  <OrbitControls
    enableDamping
    dampingFactor={0.05}
    rotateSpeed={0.5}
    zoomSpeed={0.8}
  />
</Canvas>
```

### Material Properties
```javascript
// For 3D liquidity positions
const positionMaterial = {
  color: '#d4af37',           // Base color
  opacity: 0.75,
  transparent: true,
  emissive: '#d4af37',        // Self-illumination
  emissiveIntensity: 0.2,
  metalness: 0.3,             // Slight metallic look
  roughness: 0.4,             // Not too shiny
  side: THREE.DoubleSide
};
```

### Axis Labels & Grid
```javascript
{
  axis: {
    lineColor: '#d4af37',
    labelColor: '#f6d55c',
    fontSize: 14,
    fontFamily: 'Inter'
  },
  grid: {
    primaryColor: '#d4af37',
    secondaryColor: '#262626',
    size: 20,
    divisions: 20
  }
}
```

---

## 🎬 Animations & Transitions

### Standard Transitions
```css
/* Fast - for button interactions */
--duration-fast: 0.15s;
--ease-fast: cubic-bezier(0.4, 0, 0.2, 1);

/* Base - for most interactions */
--duration-base: 0.3s;
--ease-base: cubic-bezier(0.4, 0, 0.2, 1);

/* Slow - for elegant effects */
--duration-slow: 0.8s;
--ease-slow: cubic-bezier(0.4, 0, 0.2, 1);

/* Page transitions */
--duration-page: 1.5s;
```

### Common Animations

**Fade In:**
```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

body {
  animation: fadeIn 0.6s ease-out;
}
```

**Slide Up:**
```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

article {
  animation: slideUp 0.8s ease-out;
}
```

**Shimmer/Gradient Shift:**
```css
@keyframes shimmer {
  0%, 100% { 
    background-position: 0% 50%; 
  }
  50% { 
    background-position: 100% 50%; 
  }
}

.shimmer-effect {
  background-size: 200% 200%;
  animation: shimmer 3s ease-in-out infinite;
}
```

**Wave (Liquid Effect):**
```css
@keyframes wave {
  0%, 100% { 
    transform: translateX(0);
    opacity: 0.7;
  }
  50% { 
    transform: translateX(10px);
    opacity: 1;
  }
}
```

**Floating:**
```css
@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.floating-element {
  animation: float 3s ease-in-out infinite;
}
```

**Pulse:**
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
```

### Hover Effects
```css
/* Standard hover lift */
.hover-lift {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.hover-lift:hover {
  transform: translateY(-2px);
}

/* Glow on hover */
.hover-glow:hover {
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
}
```

---

## ⏳ Loading Screen

### HTML Structure
```html
<div class="eagle-loading-screen">
  <div class="eagle-loading-content">
    <!-- Eagle Logo -->
    <div class="eagle-logo-container">
      <img src="https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy" alt="Eagle" class="eagle-logo" />
    </div>
    
    <!-- Progress Percentage -->
    <div class="eagle-progress-container">
      <div class="eagle-progress-percentage" id="loading-percentage">0%</div>
      <div class="eagle-progress-label">Loading</div>
    </div>
    
    <!-- Progress Bar -->
    <div class="eagle-progress-bar-container">
      <div class="eagle-progress-bar" id="progress-bar">
        <div class="eagle-progress-glow"></div>
      </div>
    </div>
    
    <!-- Loading Dots -->
    <div class="eagle-loading-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>
</div>
```

### Styles
```css
.eagle-loading-screen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%);
  opacity: 1;
  transition: opacity 0.8s ease-out;
}

.eagle-loading-screen.fade-out {
  opacity: 0;
  pointer-events: none;
}

/* Eagle Logo */
.eagle-logo {
  width: 120px;
  height: 120px;
  color: #d4af37;
  filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.5));
  animation: eagleFloat 3s ease-in-out infinite;
}

/* Percentage Display */
.eagle-progress-percentage {
  font-size: 4rem;
  font-weight: 900;
  background: linear-gradient(135deg, #d4af37 0%, #f5e89f 50%, #d4af37 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientShift 3s ease infinite;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

/* Progress Bar */
.eagle-progress-bar {
  height: 6px;
  background: linear-gradient(90deg, #d4af37 0%, #f5e89f 50%, #d4af37 100%);
  background-size: 200% 100%;
  border-radius: 3px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: shimmer 2s ease-in-out infinite;
}

/* Loading Dots */
.eagle-loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d4af37;
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
}

.eagle-loading-dots span:nth-child(1) { animation-delay: 0s; }
.eagle-loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.eagle-loading-dots span:nth-child(3) { animation-delay: 0.4s; }
```

---

## 🧭 Navigation & Layout

### Navbar
```css
.navbar {
  height: 64px;
  background: var(--ifm-background-color);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

[data-theme='dark'] .navbar {
  background: #0a0a0a;
  border-bottom-color: #404040;
}

.navbar__logo {
  height: 32px;
  width: auto;
  filter: brightness(0) invert(1); /* Make logo white */
}

.navbar__link {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--ifm-font-color-base);
  transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0.5rem 1rem;
}

.navbar__link:hover,
.navbar__link--active {
  color: var(--ifm-color-primary);
}
```

### Sidebar
```css
.sidebar {
  width: 280px;
  background: var(--ifm-background-surface-color);
  border-right: 1px solid var(--border-color);
  padding: 2rem 0;
}

[data-theme='dark'] .sidebar {
  background: #0a0a0a;
  border-right-color: #404040;
}

.menu__link {
  font-size: 0.9375rem;
  font-weight: 400;
  color: var(--ifm-font-color-base);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.menu__link:hover {
  background: var(--eagle-gray-100);
  color: var(--ifm-heading-color);
}

[data-theme='dark'] .menu__link:hover {
  background: #1a1a1a;
  color: #ffffff;
}

.menu__link--active {
  background: var(--ifm-color-primary-darker);
  color: white;
  font-weight: 600;
}

[data-theme='dark'] .menu__link--active {
  background: var(--ifm-link-color);
  color: #0a0a0a;
}
```

### Footer
```css
.footer {
  background: var(--ifm-background-surface-color);
  border-top: 1px solid var(--border-color);
  padding: 3rem 0;
}

.footer__title {
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ifm-heading-color);
  margin-bottom: 1rem;
}

.footer__link-item {
  font-size: 0.9375rem;
  color: var(--ifm-font-color-base);
  transition: color 0.2s;
}

.footer__link-item:hover {
  color: var(--ifm-link-color);
  text-decoration: underline;
}
```

### Footer Navigation Structure
```jsx
// Docusaurus footer configuration (docusaurus.config.ts)
footer: {
  style: 'dark',
  links: [
    {
      title: 'Legal',
      items: [
        {
          label: 'Terms & Conditions',
          href: 'https://docs.47eagle.com/user/terms-of-service',
        },
        {
          label: 'Privacy Policy',
          href: 'https://docs.47eagle.com/user/privacy-policy',
        },
        {
          label: 'Risk Disclosures',
          href: 'https://docs.47eagle.com/user/risk-disclosures',
        },
      ],
    },
    // ... other footer sections
  ],
  copyright: `Copyright © ${new Date().getFullYear()} 47 Eagle Finance`,
}
```

---

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile */
@media (max-width: 640px) { 
  /* ... mobile styles ... */ 
}

/* Tablet */
@media (max-width: 996px) { 
  /* ... tablet styles ... */ 
}

/* Desktop */
@media (min-width: 997px) { 
  /* ... desktop styles ... */ 
}

/* Wide Desktop */
@media (min-width: 1400px) { 
  /* ... large screen styles ... */ 
}
```

### Mobile Adaptations
```css
@media (max-width: 996px) {
  /* Reduce navbar padding */
  .navbar__inner {
    padding: 0 1rem;
  }
  
  /* Reduce heading sizes */
  .markdown h1 {
    font-size: 2rem;
  }
  
  .markdown h2 {
    font-size: 1.5rem;
  }
  
  /* Stack cards */
  .feature-grid {
    grid-template-columns: 1fr;
  }
  
  /* Reduce loading screen elements */
  .eagle-logo-container {
    width: 80px;
    height: 80px;
  }
  
  .eagle-progress-percentage {
    font-size: 3rem;
  }
}
```

### Mobile Navigation Fix
```css
/* IMPORTANT: Fix for mobile navigation bar opening behind main content */
.navbar-sidebar {
  z-index: 1000 !important;  /* Ensure sidebar is above main content */
}

.navbar-sidebar__backdrop {
  z-index: 999 !important;   /* Backdrop behind sidebar but above content */
}

.main-wrapper {
  z-index: 1;                /* Main content stays below navigation */
  position: relative;
}

/* Prevent scroll when mobile menu is open */
body.navbar-sidebar--show {
  overflow: hidden;
}
```

---

## 📦 Package Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "@docusaurus/core": "3.9.1",
    "@docusaurus/preset-classic": "3.9.1",
    "@docusaurus/theme-mermaid": "3.9.1",
    
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    
    "@react-three/fiber": "^8.17.12",
    "@react-three/drei": "^9.120.8",
    "@react-three/postprocessing": "^3.0.4",
    "three": "^0.172.0",
    "@types/three": "^0.172.0",
    
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-slider": "^1.2.2",
    "@radix-ui/react-slot": "^1.1.1",
    
    "framer-motion": "^12.23.22",
    "recharts": "^2.15.0",
    
    "prism-react-renderer": "^2.1.0",
    "dotenv": "^17.2.3"
  },
  "devDependencies": {
    "@docusaurus/module-type-aliases": "3.9.1",
    "@docusaurus/tsconfig": "3.9.1",
    "@docusaurus/types": "3.9.1",
    "typescript": "~5.2.2"
  }
}
```

### Installation Commands
```bash
# Initialize Docusaurus project
npx create-docusaurus@latest my-website classic --typescript

# Install 3D visualization dependencies
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing @types/three

# Install UI components
npm install @radix-ui/react-label @radix-ui/react-slider @radix-ui/react-slot

# Install additional utilities
npm install framer-motion recharts clsx tailwind-merge class-variance-authority
```

---

## 🚀 Quick Start Template

### Minimal Page with Eagle Theme
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eagle Finance Theme</title>
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  
  <style>
    :root {
      --brand-gold: #d4af37;
      --brand-gold-dark: #b8941f;
      --background: #0a0a0a;
      --surface: #171717;
      --text: #e5e5e5;
      --text-secondary: #a3a3a3;
      --border: rgba(212, 175, 55, 0.2);
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: var(--background);
      color: var(--text);
      line-height: 1.75;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    h1, h2, h3 {
      color: white;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    
    h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    
    .glass-card {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(10px);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
      margin: 1.5rem 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .glass-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      border-color: rgba(212, 175, 55, 0.4);
    }
    
    .button {
      background: var(--brand-gold);
      color: white;
      border: none;
      border-radius: 6px;
      padding: 0.75rem 1.5rem;
      font-weight: 500;
      font-size: 0.9375rem;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: inline-block;
      text-decoration: none;
    }
    
    .button:hover {
      background: var(--brand-gold-dark);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(212, 175, 55, 0.3);
    }
    
    .golden-text {
      color: var(--brand-gold);
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>47 Eagle Finance</h1>
    <p class="golden-text">Omnichain DeFi Infrastructure</p>
    
    <div class="glass-card">
      <h2>Glass Card Example</h2>
      <p>This is a glassmorphism card with Eagle Finance styling. It has a subtle blur effect and golden border accent.</p>
      <button class="button">Learn More</button>
    </div>
    
    <div class="glass-card">
      <h3>Key Features</h3>
      <ul>
        <li>Modern minimalist design</li>
        <li>Golden brand accents (#d4af37)</li>
        <li>Glassmorphism effects</li>
        <li>Dark theme by default</li>
        <li>Smooth animations</li>
      </ul>
    </div>
  </div>
</body>
</html>
```

---

## 📐 Spacing & Layout System

### Spacing Scale
```css
--space-xs: 0.25rem;   /* 4px */
--space-sm: 0.5rem;    /* 8px */
--space-md: 1rem;      /* 16px */
--space-lg: 1.5rem;    /* 24px */
--space-xl: 2rem;      /* 32px */
--space-2xl: 3rem;     /* 48px */
--space-3xl: 4rem;     /* 64px */
```

### Border Radius
```css
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 12px;
--radius-2xl: 16px;
--radius-3xl: 24px;
--radius-full: 9999px;
```

### Shadows
```css
/* Light Mode */
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 8px rgba(0, 0, 0, 0.08);
--shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 12px 24px rgba(0, 0, 0, 0.12);

/* Dark Mode */
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.3);
--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.4);
--shadow-md: 0 4px 8px rgba(0, 0, 0, 0.5);

/* Golden Glow */
--shadow-gold: 0 0 20px rgba(212, 175, 55, 0.2);
--shadow-gold-strong: 0 0 30px rgba(212, 175, 55, 0.4);
```

---

## 🎯 Design Principles

### 1. Minimalism First
- Clean, spacious, uncluttered layouts
- Strategic use of whitespace
- Only essential elements visible
- Hidden complexity (progressive disclosure)

### 2. Golden Accents
- Brand color (#d4af37) used sparingly but effectively
- Highlights important elements (CTAs, active states)
- Creates visual hierarchy
- Maintains premium feel

### 3. High Contrast
- Pure black (#0a0a0a) vs pure white (#ffffff) in dark mode
- WCAG AAA compliance for text
- Clear distinction between elements
- Readable at all screen sizes

### 4. Glassmorphism
- Subtle transparency and blur
- Creates depth without heavy shadows
- Modern, elegant appearance
- Works well with dark backgrounds

### 5. Smooth Transitions
- cubic-bezier(0.4, 0, 0.2, 1) easing
- 0.3s for most interactions
- Transform instead of position changes
- Reduced motion support

### 6. Mobile-First
- Responsive by default
- Touch-friendly targets (min 44x44px)
- Readable text sizes
- **Fixed navigation z-index issues**

---

## 🔧 Critical Implementation Notes

### 1. Mobile Navigation Fix
**PROBLEM**: Left navigation bar opens behind the main page on mobile.

**SOLUTION**:
```css
.navbar-sidebar {
  z-index: 1000 !important;
}

.navbar-sidebar__backdrop {
  z-index: 999 !important;
}

.main-wrapper {
  z-index: 1;
  position: relative;
}
```

### 2. Contrast in Light Mode
Always use darker shades for better readability:
- Headings: #0a0a0a (pure black)
- Body text: #262626 (very dark gray)
- Links: #a0800d (darker gold)
- Secondary text: #525252

### 3. Loading Screen Optimization
- Show immediately (no delay)
- Animate smoothly (0.8s fade out)
- Remove from DOM after fade
- Prevent layout shift

### 4. Font Loading
- Use font-display: swap
- Preconnect to Google Fonts
- System font stack as fallback

### 5. 3D Performance
- Use lower poly counts on mobile
- Limit particle effects
- Implement LOD (Level of Detail)
- Dispose of geometries properly

---

## 📝 CSS Custom Properties Reference

Complete list of all CSS variables:

```css
:root {
  /* Brand Colors */
  --ifm-color-primary: #d4af37;
  --ifm-color-primary-dark: #b8941f;
  --ifm-color-primary-darker: #a0800d;
  --ifm-color-primary-darkest: #8a6f00;
  --ifm-color-primary-light: #e2c55f;
  --ifm-color-primary-lighter: #edd577;
  --ifm-color-primary-lightest: #f5e89f;
  
  /* Neutrals */
  --eagle-white: #ffffff;
  --eagle-gray-50: #fafafa;
  --eagle-gray-100: #f5f5f5;
  --eagle-gray-200: #e5e5e5;
  --eagle-gray-300: #d4d4d4;
  --eagle-gray-400: #a3a3a3;
  --eagle-gray-500: #737373;
  --eagle-gray-600: #525252;
  --eagle-gray-700: #404040;
  --eagle-gray-800: #262626;
  --eagle-gray-900: #171717;
  --eagle-black: #0a0a0a;
  
  /* Typography */
  --ifm-font-family-base: 'Inter', system-ui, sans-serif;
  --ifm-font-family-monospace: 'JetBrains Mono', monospace;
  --ifm-font-size-base: 16px;
  --ifm-line-height-base: 1.75;
  --ifm-font-weight-light: 300;
  --ifm-font-weight-normal: 400;
  --ifm-font-weight-medium: 500;
  --ifm-font-weight-semibold: 600;
  --ifm-font-weight-bold: 700;
  
  /* Layout */
  --ifm-navbar-height: 64px;
  --ifm-sidebar-width: 280px;
  --ifm-spacing-horizontal: 1.5rem;
  --ifm-spacing-vertical: 1.5rem;
  
  /* Borders */
  --border-color: #e5e5e5;
  --border-color-hover: #d4d4d4;
  --border-radius: 8px;
  --border-radius-lg: 12px;
  --border-radius-xl: 16px;
  
  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 12px 24px rgba(0, 0, 0, 0.12);
  
  /* Transitions */
  --transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Theme (Light Mode) */
  --ifm-background-color: #ffffff;
  --ifm-background-surface-color: #fafafa;
  --ifm-heading-color: #0a0a0a;
  --ifm-font-color-base: #262626;
  --ifm-font-color-secondary: #525252;
  --ifm-link-color: #a0800d;
  --ifm-link-hover-color: #8a6f00;
}

/* Dark Mode Overrides */
[data-theme='dark'] {
  --ifm-background-color: #0a0a0a;
  --ifm-background-surface-color: #171717;
  --ifm-heading-color: #ffffff;
  --ifm-font-color-base: #e5e5e5;
  --ifm-font-color-secondary: #a3a3a3;
  --ifm-link-color: #f5e89f;
  --ifm-link-hover-color: #fffacd;
  --border-color: #404040;
  --border-color-hover: #525252;
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.5);
}
```

---

## ✅ Implementation Checklist

Use this checklist when implementing the theme on a new project:

### Setup
- [ ] Install Docusaurus 3.9.1
- [ ] Install required dependencies (React Three Fiber, Radix UI, etc.)
- [ ] Set up TypeScript configuration
- [ ] Configure docusaurus.config.ts

### Colors
- [ ] Set primary brand color to #d4af37
- [ ] Implement neutral gray palette
- [ ] Configure dark mode with high contrast colors
- [ ] Add status colors (success, info, warning, error)

### Typography
- [ ] Import Inter and JetBrains Mono fonts
- [ ] Set font sizes and weights
- [ ] Configure heading styles with letter-spacing: -0.02em
- [ ] Enable font smoothing and ligatures

### Components
- [ ] Create glassmorphism card styles
- [ ] Style primary and secondary buttons
- [ ] Implement metric/info cards
- [ ] Add feature card styles
- [ ] Configure admonition boxes
- [ ] Style code blocks with proper contrast

### Layout
- [ ] Style navbar (64px height, golden logo filter)
- [ ] Configure sidebar (280px width)
- [ ] Style footer
- [ ] **FIX: Mobile navigation z-index** (critical!)

### 3D Visualizations
- [ ] Set up React Three Fiber canvas
- [ ] Configure lighting (ambient, directional, point, spot)
- [ ] Add golden grid
- [ ] Configure material properties (metalness, roughness, emissive)

### Animations
- [ ] Add page transitions (fadeIn, slideUp)
- [ ] Implement loading screen with progress bar
- [ ] Add hover effects (translateY, box-shadow)
- [ ] Configure smooth cubic-bezier easing

### Responsive
- [ ] Test on mobile (< 640px)
- [ ] Test on tablet (< 996px)
- [ ] Test on desktop (> 997px)
- [ ] **Verify mobile navigation works properly**

### Performance
- [ ] Optimize font loading (preconnect, font-display: swap)
- [ ] Minimize CSS (remove unused styles)
- [ ] Optimize 3D scenes (lower poly counts on mobile)
- [ ] Enable code splitting

### Accessibility
- [ ] Ensure WCAG AAA contrast ratios
- [ ] Add focus states (2px solid outline)
- [ ] Support prefers-reduced-motion
- [ ] Test with screen reader

---

## 🎨 Logo & Brand Assets

### Logo URL
```
https://tomato-abundant-urial-204.mypinata.cloud/ipfs/bafybeigzyatm2pgrkqbnskyvflnagtqli6rgh7wv7t2znaywkm2pixmkxy
```

### Logo Usage
```css
/* Navbar - White filter */
.navbar__logo {
  height: 32px;
  filter: brightness(0) invert(1);
}

/* Loading Screen - Golden glow */
.eagle-logo {
  width: 120px;
  height: 120px;
  color: #d4af37;
  filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.5));
}

/* Light Mode - Dark logo */
[data-theme='light'] .eagle-logo {
  color: #5a4a0a;
  filter: drop-shadow(0 0 15px rgba(90, 74, 10, 0.3));
}
```

### Favicon
- Size: 32x32, 192x192, 512x512
- Format: ICO and PNG
- Include in `/static/img/` directory

---

## 🔗 Additional Resources

### Documentation
- Docusaurus: https://docusaurus.io
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber
- Radix UI: https://www.radix-ui.com
- Three.js: https://threejs.org

### Design Tools
- Color Contrast Checker: https://webaim.org/resources/contrastchecker/
- CSS Gradient Generator: https://cssgradient.io
- Glassmorphism Generator: https://hype4.academy/tools/glassmorphism-generator

### Fonts
- Inter: https://fonts.google.com/specimen/Inter
- JetBrains Mono: https://fonts.google.com/specimen/JetBrains+Mono

---

## 🎉 Final Notes

This design system creates a **modern, premium, professional** look with:
- ✨ Elegant golden accents
- 🌑 Beautiful dark theme
- ☀️ High-contrast light mode
- 📱 Mobile-first responsive design
- 🎨 Glassmorphism effects
- 🚀 Smooth animations
- ♿ WCAG AAA accessibility

**Copy the relevant sections to replicate this theme on your new project!**

---

**Created by 47 Eagle Finance Development Team**
**Last Updated: October 2025**

