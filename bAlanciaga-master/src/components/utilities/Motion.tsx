/* eslint-disable */
import React, { useState, useMemo, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text, Line } from '@react-three/drei'
import * as THREE from 'three'
import { MAINSYMBOLS } from '../../utils/setting';
// import utils from '../../utils/setting';
// import { fetchLiquidityConcentration } from '../../utils/graphQueries';
// import {
//   DEFAULT_CAMERA_POSITION as CAMERA_POSITION,
//   calculateAxisValues as computeAxisValues,
//   calculateLiquidityHeight as computeLiquidityHeight,
//   calculateTickFromSlider as computeTickFromSlider
// } from '../../utils/visualizationUtils';

// Constants
const MAX_TICK = 887272;
const MIN_TICK = -887272;

// Helper functions
const formatTickPrice = (tick: number): string => {
  try {
    const price = Math.pow(1.0001, tick);
    return price.toFixed(4);
  } catch (error) {
    console.error('Error formatting tick price:', error);
    return '0.00';
  }
};

const calculateTokenRatios = (currentTick: number, lowerTick: number, upperTick: number): { depositedToken: number, hermes: number } => {
  try {
    // Ensure ticks are within safe bounds
    const safeLowerTick = Math.max(MIN_TICK, Math.min(MAX_TICK, lowerTick));
    const safeUpperTick = Math.max(MIN_TICK, Math.min(MAX_TICK, upperTick));
    const safeCurrentTick = Math.max(MIN_TICK, Math.min(MAX_TICK, currentTick));

    if (safeCurrentTick <= safeLowerTick) {
      return { depositedToken: 100, hermes: 0 };
    } else if (safeCurrentTick >= safeUpperTick) {
      return { depositedToken: 0, hermes: 100 };
    }

    const position = (safeCurrentTick - safeLowerTick) / (safeUpperTick - safeLowerTick);
    const hermes = Math.round(position * 100);
    const depositedToken = 100 - hermes;
    return { depositedToken, hermes };
  } catch (error) {
    console.error('Error calculating token ratios:', error);
    return { depositedToken: 100, hermes: 0 };
  }
};

const calculateLiquidityRange = (lowerTick: number, upperTick: number): number => {
  try {
    // Convert ticks to prices
    const lowerPrice = Math.pow(1.0001, lowerTick);
    const upperPrice = Math.pow(1.0001, upperTick);
    
    // Calculate price range as percentage
    const priceRange = ((upperPrice - lowerPrice) / lowerPrice) * 100;
    
    // Return the range percentage, with a minimum of 0.01%
    return Math.max(0.01, Math.min(999.99, priceRange));
  } catch (error) {
    console.error("Error calculating liquidity range:", error);
    return 0;
  }
};

const formatCurrency = (
  initialUsdValue: number,
  maxValue: number,
  rangeProgress: number
): string => {
  const currentValue = initialUsdValue + (maxValue - initialUsdValue) * rangeProgress;

  // Determine the formatted value with suffixes
  let formattedValue: string;

  if (currentValue >= 1_000_000) {
    formattedValue = (currentValue / 1_000_000).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + 'M'; // Millions
  } else if (currentValue >= 1_000) {
    formattedValue = (currentValue / 1_000).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + 'K'; // Thousands
  } else {
    formattedValue = currentValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  return formattedValue;
}

const calculatePositionValue = (
  initialAmount: string,
  currentTick: number,
  lowerTick: number,
  upperTick: number,
  initialUsdValue: number
): string => {
  console.log("Calculating position value...", {
    initialAmount,
    currentTick,
    lowerTick,
    upperTick,
    initialUsdValue,
  });
  try {
    if (!initialAmount || initialUsdValue <= 0) return '$0.00';

    // Ensure ticks are within safe bounds
    const safeLowerTick = Math.max(MIN_TICK, Math.min(MAX_TICK, lowerTick));
    const safeUpperTick = Math.max(MIN_TICK, Math.min(MAX_TICK, upperTick));
    const safeCurrentTick = Math.max(MIN_TICK, Math.min(MAX_TICK, currentTick));

    // Calculate position in range (0 to 1)
    const rangeProgress = Math.max(0, Math.min(1, 
      (safeCurrentTick - safeLowerTick) / (safeUpperTick - safeLowerTick)
    ));

    // Calculate value based on position in range
    const maxValue = initialUsdValue * 1.5; // 50% potential increase
    console.log("Currency:");
    const currency = formatCurrency(initialUsdValue, maxValue, rangeProgress);
    return currency;
  } catch (error) {
    console.error('Error calculating position value:', error);
    return '$0.00';
  }
};

const calculateHeight = (amount: string): number => {
  try {
    if (!amount || amount === "0") {
      return 0.5; // Minimum height for zero liquidity
    }

    // Convert amount to number
    const amountNum = parseFloat(amount);
    
    // Scale the height based on the amount
    // Using log scale to handle large ranges of values
    const baseHeight = Math.log10(amountNum + 1) * 5;
    
    // Ensure minimum and maximum heights
    const minHeight = 0.5;
    const maxHeight = 50;
    
    return Math.max(minHeight, Math.min(maxHeight, baseHeight));
  } catch (error) {
    console.error('Error calculating height:', error);
    return 0.5; // Default minimum height
  }
};

// Add interface for main props
interface MainProps {
  currentTick: number;
  lowerTick: number;
  upperTick: number;
  amount: string;
  calculatedAPR: string;
  initialUsdValue: number;
  selectedToken?: {
    name: string;
    symbol: string;
    logoURI?: string;
    address?: string;
    decimals?: number;
  } | null;
  chainId: number;
  v2PairAddress?: string;
}

// Add component interfaces
interface LiquidityPositionProps {
  position: [number, number, number];
  width: number;
  height: number;
  depth: number;
  color: string | THREE.Color;
  index: number;
  currentPricePosition: number;
}

interface AxisIndicatorsProps {
  size: number;
}

// Add component implementations
const GridFloor = React.memo(() => {
  return (
    <group>
      {/* Main grid on the floor */}
      <gridHelper 
        args={[120, 30, 0x303030, 0x505050]} 
        position={[60, 0, 30]}  // Center grid
        rotation={[0, 0, 0]}
      />
      {/* Additional grid for better visibility */}
      <gridHelper 
        args={[120, 15, 0x404040, 0x606060]} 
        position={[60, 0, 30]}  // Center grid
        rotation={[0, 0, 0]}
      />
    </group>
  );
});

const AxisIndicators = React.memo<AxisIndicatorsProps>(({ size }) => {
  const axisColor = new THREE.Color(0x808080);
  
  return (
    <group>
      {/* X axis (Price) */}
      <Line
        points={[[0, 0, 0], [120, 0, 0]]}
        color={axisColor}
        lineWidth={1.5}
      />

      {/* Y axis (Liquidity) */}
      <Line
        points={[[0, 0, 0], [0, size * 0.8, 0]]}
        color={axisColor}
        lineWidth={1.5}
      />

      {/* Z axis */}
      <Line
        points={[[0, 0, 0], [0, 0, 60]]}
        color={axisColor}
        lineWidth={1.5}
      />

      {/* Axis labels - More friendly */}
      <Text 
        position={[110, -1, 0]}
        color="#60A5FA" 
        fontSize={2.2}
        anchorX="right" 
        anchorY="top"
        rotation={[0, -Math.PI, 0]}
      >
        Price Range →
      </Text>

      <Text
        position={[-2, size * 0.7, 0]}
        color="#10B981"
        fontSize={2.2}
        anchorY="middle"
        anchorX="right"
        rotation={[0, -Math.PI, -Math.PI / 2]}
      >
        ↑ Amount
      </Text>
    </group>
  );
});

const LiquidityPosition = React.memo<LiquidityPositionProps>(
  ({ width, height, currentPricePosition }) => {
    // Ensure valid dimensions
    const safeWidth = Math.max(0.001, width);
    const safeHeight = Math.max(0.001, height);
    const fixedDepth = 20; // Fixed depth for both tokens
    
    // Calculate widths based on current price position
    const safePricePosition = Math.max(0, Math.min(1, currentPricePosition));
    const leftWidth = Math.max(0.001, safeWidth * (1 - safePricePosition));
    const rightWidth = Math.max(0.001, safeWidth * safePricePosition);
    
    return (
      <group>
        {/* Left side - Deposited Token */}
        {leftWidth > 0.001 && (
          <group position={[leftWidth/2, safeHeight/2, 0]}>
            <mesh>
              <boxGeometry args={[leftWidth, safeHeight, fixedDepth]} />
              <meshStandardMaterial 
                color="#60A5FA" 
                transparent 
                opacity={0.4}
                metalness={0.5}
                roughness={0.5}
              />
            </mesh>
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(leftWidth, safeHeight, fixedDepth)]} />
              <lineBasicMaterial color="#60A5FA" linewidth={3} />
            </lineSegments>
          </group>
        )}

        {/* Right side - EAGLE */}
        {rightWidth > 0.001 && (
          <group position={[leftWidth + rightWidth/2, safeHeight/2, 0]}>
            <mesh>
              <boxGeometry args={[rightWidth, safeHeight, fixedDepth]} />
              <meshStandardMaterial 
                color="#FFD700" 
                transparent 
                opacity={0.4}
                metalness={0.5}
                roughness={0.5}
              />
            </mesh>
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(rightWidth, safeHeight, fixedDepth)]} />
              <lineBasicMaterial color="#FFD700" linewidth={3} />
            </lineSegments>
          </group>
        )}
      </group>
    );
  }
);

// Add display names
GridFloor.displayName = 'GridFloor';
AxisIndicators.displayName = 'AxisIndicators';
LiquidityPosition.displayName = 'LiquidityPosition';

// Add this after the imports
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[500px] w-full flex items-center justify-center bg-[#111111] rounded-lg">
          <div className="text-center">
            <p className="text-red-400 mb-2">Failed to load visualization</p>
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Export the main visualization component
export default function InteractiveLiquidityVisualization(props: MainProps) {
  const { currentTick, lowerTick, upperTick, amount, calculatedAPR, selectedToken } = props;
  const [mounted, setMounted] = useState(false);
  const [simulatedTick, setSimulatedTick] = useState(lowerTick);
  const [tokenRatios, setTokenRatios] = useState({ depositedToken: 100, hermes: 0 });

  // Simple calculations only

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (selectedToken && lowerTick !== undefined && upperTick !== undefined) {
      const ratios = calculateTokenRatios(simulatedTick, lowerTick, upperTick);
      setTokenRatios(ratios);
    }
  }, [simulatedTick, lowerTick, upperTick, selectedToken]);

  useEffect(() => {
    if (mounted && currentTick !== undefined) {
      setSimulatedTick(currentTick);
    }
  }, [currentTick, mounted]);

  const sliderValue = useMemo(() => {
    if (!upperTick || !lowerTick || upperTick === lowerTick) {
      return 0;
    }
    const progress = ((simulatedTick - lowerTick) / (upperTick - lowerTick)) * 100;
    return isNaN(progress) ? 0 : Math.max(0, Math.min(100, progress));
  }, [simulatedTick, lowerTick, upperTick]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && lowerTick !== undefined && upperTick !== undefined) {
      const newTick = lowerTick + ((upperTick - lowerTick) * value) / 100;
      setSimulatedTick(Math.round(newTick));
    }
  };

  if (!mounted) {
    return (
      <div className="h-[500px] w-full flex items-center justify-center bg-[#111111] rounded-lg">
        <div className="text-center">
          <p className="text-blue-400 mb-2">Loading visualization...</p>
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // Calculate arbitrage flow direction
  const arbDirection = tokenRatios.hermes > 50 ? 'right' : tokenRatios.hermes > 0 ? 'center' : 'left';

  return (
    <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-8 border border-gray-800/50 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">Triangular Arbitrage Strategy</h3>
          <p className="text-xs text-gray-500 mt-1">{amount || '0'} {selectedToken?.symbol || ''} → {calculatedAPR}% APR</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center animate-pulse">
          <span className="text-xl">⚡</span>
        </div>
      </div>

      {/* Triangular Diagram */}
      <div className="mb-8 relative">
        <div className="text-xs font-medium text-gray-400 mb-4 text-center">
          How Your Position Hedges Impermanent Loss
        </div>

        <div className="relative h-64 flex items-center justify-center">
          {/* Triangle points */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300">
            {/* Connecting lines */}
            <line x1="200" y1="40" x2="100" y2="220" 
              stroke="url(#gradient1)" strokeWidth="2" strokeDasharray="5,5" 
              className="animate-pulse" opacity="0.6"/>
            <line x1="200" y1="40" x2="300" y2="220" 
              stroke="url(#gradient2)" strokeWidth="2" strokeDasharray="5,5" 
              className="animate-pulse" opacity="0.6"/>
            <line x1="100" y1="220" x2="300" y2="220" 
              stroke="url(#gradient3)" strokeWidth="2" strokeDasharray="5,5" 
              className="animate-pulse" opacity="0.6"/>

            {/* Gradients */}
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
              <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
              <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>

            {/* Animated arrows showing flow */}
            {arbDirection === 'right' && (
              <>
                <path d="M 200 40 L 290 210" fill="none" stroke="#10B981" strokeWidth="3" opacity="0.8">
                  <animate attributeName="stroke-dasharray" from="0,10" to="10,0" dur="1s" repeatCount="indefinite"/>
                </path>
                <polygon points="290,210 285,200 295,200" fill="#10B981"/>
              </>
            )}
            {arbDirection === 'left' && (
              <>
                <path d="M 200 40 L 110 210" fill="none" stroke="#3B82F6" strokeWidth="3" opacity="0.8">
                  <animate attributeName="stroke-dasharray" from="0,10" to="10,0" dur="1s" repeatCount="indefinite"/>
                </path>
                <polygon points="110,210 105,200 115,200" fill="#3B82F6"/>
              </>
            )}
          </svg>

          {/* Top: Your Deposit */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-4 shadow-lg border border-purple-500/30 z-10 w-32">
            <div className="text-center">
              <div className="text-xs text-purple-200 mb-1">You Deposit</div>
              <div className="text-sm font-bold text-white">{selectedToken?.symbol || 'Token'}</div>
            </div>
          </div>

          {/* Bottom Left: V3 Position */}
          <div className="absolute bottom-0 left-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 shadow-lg border border-blue-500/30 z-10 w-32">
            <div className="text-center">
              <div className="text-xs text-blue-200 mb-1">Uniswap V3</div>
              <div className="text-lg font-bold text-white">{simulatedTick === lowerTick ? "100" : tokenRatios.depositedToken}%</div>
              <div className="text-xs text-blue-100 mt-1">Concentrated</div>
            </div>
          </div>

          {/* Bottom Right: V2 Hedge */}
          <div className="absolute bottom-0 right-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-4 shadow-lg border border-yellow-400/30 z-10 w-32">
            <div className="text-center">
              <div className="text-xs text-yellow-100 mb-1">Uniswap V2</div>
              <div className="text-lg font-bold text-white">{simulatedTick === lowerTick ? "0" : tokenRatios.hermes}%</div>
              <div className="text-xs text-yellow-100 mt-1">Hedge</div>
            </div>
          </div>

          {/* Center: Arbitrage indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-600 rounded-full p-3 shadow-lg border-2 border-green-400 z-20 animate-pulse">
            <div className="text-center">
              <div className="text-2xl">🔄</div>
            </div>
          </div>
        </div>

        {/* Explanation boxes */}
        <div className="grid grid-cols-3 gap-2 mt-6">
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2">
            <div className="text-xs text-purple-300 font-semibold">1. Deposit</div>
            <div className="text-xs text-gray-400 mt-1">Single token in</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
            <div className="text-xs text-blue-300 font-semibold">2. V3 LP</div>
            <div className="text-xs text-gray-400 mt-1">Earn fees</div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
            <div className="text-xs text-yellow-300 font-semibold">3. V2 Hedge</div>
            <div className="text-xs text-gray-400 mt-1">Reduce IL</div>
          </div>
        </div>
      </div>

      {/* Interactive Slider */}
      <div className="relative mb-6">
        <div className="text-xs text-gray-500 mb-2 text-center">Drag to simulate price movement →</div>
        <input
          type="range"
          min="0"
          max="100"
          value={sliderValue}
          onChange={handleSliderChange}
          className={`w-full h-3 bg-gradient-to-r from-blue-500/20 via-green-500/20 to-yellow-500/20 rounded-full appearance-none cursor-pointer backdrop-blur-sm
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-6
          [&::-webkit-slider-thumb]:h-6
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:shadow-blue-500/50
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-gray-800
          [&::-webkit-slider-thumb]:cursor-grab
          [&::-webkit-slider-thumb]:active:cursor-grabbing
          [&::-webkit-slider-thumb]:hover:scale-110
          [&::-webkit-slider-thumb]:transition-transform
          [&::-moz-range-thumb]:w-6
          [&::-moz-range-thumb]:h-6
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-white
          [&::-moz-range-thumb]:border-2
          [&::-moz-range-thumb]:border-gray-800
          [&::-moz-range-thumb]:cursor-grab
          [&::-moz-range-thumb]:shadow-lg`}
        />
        <div className="flex justify-between mt-2 px-1">
          <span className="text-xs text-gray-500">Price ↓</span>
          <span className="text-xs text-gray-400 font-semibold">Current</span>
          <span className="text-xs text-gray-500">Price ↑</span>
        </div>
      </div>

      {/* Bottom insight */}
      <div className="flex items-start gap-3 p-4 bg-green-500/5 border border-green-500/10 rounded-xl">
        <span className="text-lg">⚡</span>
        <div className="flex-1">
          <p className="text-xs font-semibold text-green-400 mb-1">The Magic</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            When price moves, arbitrageurs trade between V2 and V3, reducing your impermanent loss while you earn fees from both pools.
          </p>
        </div>
      </div>
    </div>
  );
}


