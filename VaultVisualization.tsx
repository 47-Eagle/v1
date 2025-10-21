// @ts-nocheck - React Three Fiber JSX elements are not fully typed
import React, { useState, useCallback, useMemo, useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Text, Line } from "@react-three/drei"
import * as THREE from "three"
import { Info } from "lucide-react"
import { useLivePoolData, getRevertFinanceUrl } from "./useLivePoolData"

// WLFI/USD1 Pool Configuration  
const WLFI_PRICE_USD = 4.80
const CURRENT_TICK = Math.floor(Math.log(WLFI_PRICE_USD) / Math.log(1.0001))

const formatNumber = (num: number, decimals = 2) => {
  if (num >= 1e9) return (num / 1e9).toFixed(decimals) + "B"
  if (num >= 1e6) return (num / 1e6).toFixed(decimals) + "M"
  if (num >= 1e3) return (num / 1e3).toFixed(decimals) + "K"
  return num.toFixed(decimals)
}

const formatPercent = (num: number) => `${num.toFixed(1)}%`

const tickToPrice = (tick: number) => Math.pow(1.0001, tick)

  const AxisLabels = React.memo(({ size }) => {
  const ticks = useMemo(
    () => [CURRENT_TICK - 40000, CURRENT_TICK - 20000, CURRENT_TICK, CURRENT_TICK + 20000, CURRENT_TICK + 40000],
    [],
  )
  return (
    <>
      {ticks.map((tick, index) => (
        <Text
          key={index}
          position={[((tick - CURRENT_TICK) / 80000) * size, -0.5, size / 2 + 0.5]}
          color="white"
          fontSize={0.3}
          anchorX="center"
          anchorY="top"
        >
          ${formatNumber(tickToPrice(tick))}
        </Text>
      ))}
      <Text position={[0, -1, size / 2 + 1]} color="white" fontSize={0.4} anchorX="center" anchorY="top">
        Price Range (USD/WLFI)
      </Text>
      <Text
        position={[-size / 2 - 1, size / 4, 0]}
        color="white"
        fontSize={0.4}
        anchorY="middle"
        rotation={[0, 0, Math.PI / 2]}
      >
        Liquidity Weight
      </Text>
      <Text
        position={[0, 0, -size / 2 - 1]}
        color="white"
        fontSize={0.4}
        anchorX="center"
        anchorY="top"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        Position Depth
      </Text>
    </>
  )
})

  const AxisIndicators = React.memo(({ size }) => {
  const axisColor = new THREE.Color(0x808080)
  return (
    <group>
      <Line points={[[-size / 2 - 1, 0, 0], [size / 2 + 1, 0, 0]]} color={axisColor} />
      <Line points={[[0, 0, 0], [0, size / 2 + 1, 0]]} color={axisColor} />
      <Line points={[[0, 0, -size / 2 - 1], [0, 0, size / 2 + 1]]} color={axisColor} />
    </group>
  )
})

const CurrentPricePlane = React.memo(({ size, showTokenBreakdown, tokenBreakdown, poolData, baseOrderWidth, limitOrderWeight, baseOrderWeight, fullRangeWeight }) => {
  const currentTick = poolData?.currentTick || CURRENT_TICK;
  const currentPrice = poolData?.currentPrice || WLFI_PRICE_USD;
  
  return (
    <group>
      <mesh position={[0, size / 2, 0]}>
        <boxGeometry args={[0.1, size, 2]} />
        <meshStandardMaterial color="yellow" transparent opacity={0.5} />
      </mesh>
      {/* Configuration Text - centered, color-coded */}
      <group position={[0, 0, size / 2 + 0.3]}>
        <Text position={[0, 1.8, 0]} color="#d4af37" fontSize={0.28} anchorX="center" anchorY="bottom" fontWeight="bold">
          CURRENT CONFIGURATION
        </Text>
        <Text position={[0, 1.25, 0]} color="yellow" fontSize={0.22} anchorX="center" anchorY="bottom">
          Current Price: ${currentPrice.toFixed(2)}
        </Text>
        <Text position={[0, 0.8, 0]} color="rgba(255,255,255,0.8)" fontSize={0.18} anchorX="center" anchorY="bottom">
          Price Range: ${(tickToPrice(currentTick - baseOrderWidth/2)).toFixed(2)} - ${(tickToPrice(currentTick + baseOrderWidth/2)).toFixed(2)}
        </Text>
        <Text position={[0, 0.4, 0]} color="rgba(255,255,255,0.7)" fontSize={0.16} anchorX="center" anchorY="bottom">
          Fee Tier: 0.30%
        </Text>
        <Text position={[0, 0.05, 0]} color="rgb(74, 222, 128)" fontSize={0.18} anchorX="center" anchorY="bottom" fontWeight="bold">
          Active Capital: {(baseOrderWeight + limitOrderWeight).toFixed(1)}%
        </Text>
        <Text position={[0, -0.3, 0]} color="rgb(96, 165, 250)" fontSize={0.18} anchorX="center" anchorY="bottom" fontWeight="bold">
          Safety Buffer: {fullRangeWeight.toFixed(1)}%
        </Text>
      </group>
      
      {/* Token Split Indicators */}
      {showTokenBreakdown && (
        <>
          {/* Left side - USD1 */}
          <group position={[-size / 3, size / 2 - 2, 0]}>
            <Text 
              position={[0, 0, 0]} 
              color="#60a5fa" 
              fontSize={1.2} 
              anchorX="center" 
              anchorY="middle"
              fontWeight="bold"
            >
              USD1
            </Text>
            <Text 
              position={[0, -1.0, 0]} 
              color="#60a5fa" 
              fontSize={0.8} 
              anchorX="center" 
              anchorY="middle"
            >
              {tokenBreakdown.usd1Percent.toFixed(1)}%
            </Text>
            <Text 
              position={[0, -1.8, 0]} 
              color="white" 
              fontSize={0.4} 
              anchorX="center" 
              anchorY="middle"
            >
              {formatNumber(tokenBreakdown.usd1Amount, 0)} tokens
            </Text>
            <Text 
              position={[0, -2.4, 0]} 
              color="white" 
              fontSize={0.4} 
              anchorX="center" 
              anchorY="middle"
            >
              ${formatNumber(tokenBreakdown.usd1Value, 2)}
            </Text>
          </group>

          {/* Right side - WLFI */}
          <group position={[size / 3, size / 2 - 2, 0]}>
            <Text 
              position={[0, 0, 0]} 
              color="#fbbf24" 
              fontSize={1.2} 
              anchorX="center" 
              anchorY="middle"
              fontWeight="bold"
            >
              WLFI
            </Text>
            <Text 
              position={[0, -1.0, 0]} 
              color="#fbbf24" 
              fontSize={0.8} 
              anchorX="center" 
              anchorY="middle"
            >
              {tokenBreakdown.wlfiPercent.toFixed(1)}%
            </Text>
            <Text 
              position={[0, -1.8, 0]} 
              color="white" 
              fontSize={0.4} 
              anchorX="center" 
              anchorY="middle"
            >
              {formatNumber(tokenBreakdown.wlfiAmount, 2)} tokens
            </Text>
            <Text 
              position={[0, -2.4, 0]} 
              color="white" 
              fontSize={0.4} 
              anchorX="center" 
              anchorY="middle"
            >
              ${formatNumber(tokenBreakdown.wlfiValue, 2)}
            </Text>
          </group>
        </>
      )}
    </group>
  )
})

export default function VaultVisualization() {
  const size = 20
  
  // Fetch live pool data
  const { poolData, isLoading, error } = useLivePoolData('30'); // Using 0.3% pool

  // Toggle state for token breakdown view
  const [showTokenBreakdown, setShowTokenBreakdown] = useState(false)

  const [fullRangeWeight, setFullRangeWeight] = useState(24.42)
  const [baseOrderWeight, setBaseOrderWeight] = useState(49.58)
  const [limitOrderWeight, setLimitOrderWeight] = useState(26.0)
  const [baseOrderWidth, setBaseOrderWidth] = useState(7000)
  const [limitOrderWidth, setLimitOrderWidth] = useState(20000)
  const [limitOrderSide, setLimitOrderSide] = useState("right")
  
  // Update with real data when it loads
  useEffect(() => {
    if (poolData && poolData.positions.length >= 3) {
      // Use real position weights from the pool
      setFullRangeWeight(poolData.positions[0].weight);
      setBaseOrderWeight(poolData.positions[1].weight);
      setLimitOrderWeight(poolData.positions[2].weight);
      
      // Use real tick ranges
      const pos1Range = Math.abs(poolData.positions[1].tickUpper - poolData.positions[1].tickLower);
      const pos2Range = Math.abs(poolData.positions[2].tickUpper - poolData.positions[2].tickLower);
      
      if (pos1Range > 0) setBaseOrderWidth(pos1Range);
      if (pos2Range > 0) setLimitOrderWidth(pos2Range);
    }
  }, [poolData])

  const handleFullRangeWeightChange = useCallback(
    (value: number[]) => {
      setFullRangeWeight(value[0])
      const remaining = 100 - value[0]
      const ratio = baseOrderWeight / (baseOrderWeight + limitOrderWeight)
      setBaseOrderWeight(remaining * ratio)
      setLimitOrderWeight(remaining * (1 - ratio))
    },
    [baseOrderWeight, limitOrderWeight],
  )

  const handleBaseOrderWeightChange = useCallback(
    (value: number[]) => {
      setBaseOrderWeight(value[0])
      const remaining = 100 - fullRangeWeight - value[0]
      setLimitOrderWeight(remaining)
    },
    [fullRangeWeight],
  )

  const handleLimitOrderWeightChange = useCallback(
    (value: number[]) => {
      setLimitOrderWeight(value[0])
      const remaining = 100 - fullRangeWeight - value[0]
      setBaseOrderWeight(remaining)
    },
    [fullRangeWeight],
  )

  const handleBaseOrderWidthChange = useCallback((value: number[]) => {
    setBaseOrderWidth(value[0])
  }, [])

  const handleLimitOrderWidthChange = useCallback((value: number[]) => {
    setLimitOrderWidth(value[0])
  }, [])

  const handleLimitOrderSideChange = useCallback((value: string) => {
    setLimitOrderSide(value)
  }, [])

  const liquidityData = useMemo(
    () => [
      {
        name: "Full Range",
        tickLower: -887200,
        tickUpper: 887200,
        weight: fullRangeWeight,
        color: "#4a9e9e",
      },
      {
        name: "Base Order",
        tickLower: CURRENT_TICK - baseOrderWidth / 2,
        tickUpper: CURRENT_TICK + baseOrderWidth / 2,
        weight: baseOrderWeight,
        color: "#4a4a9e",
      },
      {
        name: "Limit Order",
        tickLower: limitOrderSide === "right" ? CURRENT_TICK : CURRENT_TICK - limitOrderWidth,
        tickUpper: limitOrderSide === "right" ? CURRENT_TICK + limitOrderWidth : CURRENT_TICK,
        weight: limitOrderWeight,
        color: "#9e4a4a",
      },
    ],
    [fullRangeWeight, baseOrderWeight, limitOrderWeight, baseOrderWidth, limitOrderWidth, limitOrderSide],
  )

  const estimatedAPR = useMemo(() => {
    // Use real APR if available
    if (poolData && poolData.apr > 0) {
      return poolData.apr;
    }
    // Otherwise calculate estimate
    const concentrationScore = (baseOrderWeight / baseOrderWidth) * 1000
    const baseAPR = 80 + concentrationScore * 2
    return Math.min(Math.max(baseAPR, 50), 250)
  }, [baseOrderWeight, baseOrderWidth, poolData])

  const timeInRange = useMemo(() => {
    const baseScore = (baseOrderWidth / 10000) * 50
    const fullRangeBonus = fullRangeWeight * 0.5
    return Math.min(Math.max(baseScore + fullRangeBonus, 40), 98)
  }, [baseOrderWidth, fullRangeWeight])

  // Calculate token breakdown at current price
  const tokenBreakdown = useMemo(() => {
    // Assume a sample liquidity amount (e.g., $10,000 total)
    const totalValueUSD = 10000
    const currentPrice = poolData?.currentPrice || WLFI_PRICE_USD
    
    // Weight the calculation based on where the limit order is positioned
    // If limit order is on the right (above current price), WLFI should be heavier
    // If limit order is on the left (below current price), USD1 should be heavier
    const limitOrderBoost = 1.5 // Multiplier for the side with the limit order
    
    // Calculate percentage split based on position ranges
    const liquidityPositions = liquidityData.map(pos => {
      const priceLower = tickToPrice(pos.tickLower)
      const priceUpper = tickToPrice(pos.tickUpper)
      let weight = pos.weight / 100
      
      // Apply extra weight if this is the limit order
      const isLimitOrder = pos.name === "Limit Order"
      if (isLimitOrder) {
        weight *= limitOrderBoost
      }
      
      let usd1Percent = 0
      let wlfiPercent = 0
      
      if (currentPrice <= priceLower) {
        // Price below range: 100% WLFI (waiting for price to rise)
        wlfiPercent = weight
      } else if (currentPrice >= priceUpper) {
        // Price above range: 100% USD1 (already converted)
        usd1Percent = weight
      } else {
        // Price in range: calculate split using Uniswap V3 formula
        const sqrtPriceLower = Math.sqrt(priceLower)
        const sqrtPriceUpper = Math.sqrt(priceUpper)
        const sqrtPriceCurrent = Math.sqrt(currentPrice)
        
        // Calculate relative position in range (0 to 1)
        const rangePosition = (sqrtPriceCurrent - sqrtPriceLower) / (sqrtPriceUpper - sqrtPriceLower)
        
        // Token split: more USD1 as price moves up through range
        usd1Percent = weight * rangePosition
        wlfiPercent = weight * (1 - rangePosition)
      }
      
      return { usd1Percent, wlfiPercent }
    })
    
    // Sum up all positions
    const totalUSD1Percent = liquidityPositions.reduce((sum, pos) => sum + pos.usd1Percent, 0)
    const totalWLFIPercent = liquidityPositions.reduce((sum, pos) => sum + pos.wlfiPercent, 0)
    
    // Normalize to 100%
    const total = totalUSD1Percent + totalWLFIPercent
    const normalizedUSD1 = total > 0 ? (totalUSD1Percent / total) * 100 : 50
    const normalizedWLFI = total > 0 ? (totalWLFIPercent / total) * 100 : 50
    
    // Calculate USD values
    const usd1Value = (normalizedUSD1 / 100) * totalValueUSD
    const wlfiValue = (normalizedWLFI / 100) * totalValueUSD
    
    // Calculate token amounts
    const usd1Amount = usd1Value / 1 // USD1 is $1
    const wlfiAmount = wlfiValue / currentPrice
    
    return {
      usd1Percent: normalizedUSD1,
      wlfiPercent: normalizedWLFI,
      usd1Value,
      wlfiValue,
      usd1Amount,
      wlfiAmount,
      currentPrice
    }
  }, [liquidityData, poolData])

  const cardStyle = {
    backgroundColor: 'rgba(10, 10, 10, 0.2)',
    border: '1px solid rgba(212, 175, 55, 0.15)',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    color: 'white',
    boxShadow: 'none',
    backdropFilter: 'none'
  }

  const cardHeaderStyle = {
    marginBottom: '0.75rem'
  }

  const cardTitleStyle = {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'rgb(156, 163, 175)',
    marginBottom: '0.5rem'
  }

  const metricValueStyle = {
    fontSize: '1.875rem',
    fontWeight: '700',
    lineHeight: '2.25rem',
    background: 'linear-gradient(135deg, #f6d55c 0%, #d4af37 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  }

  const metricSubtextStyle = {
    fontSize: '0.75rem',
    color: 'rgb(156, 163, 175)',
    marginTop: '0.25rem'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: 'auto', background: 'transparent', color: 'white' }}>
      <div style={{ padding: '0' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          {poolData && poolData.isLive && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0.75rem',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                color: '#10b981'
              }}>
                <div style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
                Live Pool Data
              </div>
            </div>
          )}
          {poolData && poolData.isLive && (
            <div style={{ 
              marginTop: '0.75rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              color: '#10b981'
            }}>
              Real-time data from Ethereum mainnet · TVL: ${formatNumber(poolData.tvl)} · 24h Volume: ${formatNumber(poolData.volume24h)} · 
              <a href={getRevertFinanceUrl('30')} target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', textDecoration: 'underline', marginLeft: '0.25rem' }}>
                View on Revert Finance →
              </a>
            </div>
          )}
        </div>

        {/* Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={cardTitleStyle}>Total APR</div>
            </div>
            <div>
              <div style={{ ...metricValueStyle, color: 'rgb(74, 222, 128)' }}>
                +{poolData?.apr ? poolData.apr.toFixed(1) : estimatedAPR.toFixed(1)}%
              </div>
              <p style={metricSubtextStyle}>
                {poolData?.isLive ? 'Live data from pool' : 'Based on current strategy'}
              </p>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={cardTitleStyle}>Capital Efficiency</div>
            </div>
            <div>
              <div style={{ ...metricValueStyle, color: 'rgb(251, 191, 36)' }}>
                {((baseOrderWeight + limitOrderWeight) / 100 * 3).toFixed(1)}x
              </div>
              <p style={metricSubtextStyle}>vs simple holding</p>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={cardTitleStyle}>Time in Range</div>
            </div>
            <div>
              <div style={{ ...metricValueStyle, color: 'rgb(192, 132, 252)' }}>{timeInRange.toFixed(1)}%</div>
              <p style={metricSubtextStyle}>Expected efficiency</p>
            </div>
          </div>

        </div>

        {/* Revert Finance Style Analytics */}
        {poolData?.isLive && (
          <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ 
                fontSize: '1.125rem', 
                fontWeight: '600',
                color: '#f6d55c'
              }}>Advanced Pool Analytics</span>
              <p style={{ fontSize: '0.875rem', color: 'rgb(161, 161, 161)', marginTop: '0.25rem' }}>
                Metrics inspired by <a href={getRevertFinanceUrl('30')} target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', textDecoration: 'underline' }}>Revert Finance</a>
              </p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgb(161, 161, 161)', marginBottom: '0.25rem' }}>
                  APR (excl. gas)
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#4ade80' }}>
                  +{poolData.aprExcludingGas ? poolData.aprExcludingGas.toFixed(2) : '0.00'}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgb(161, 161, 161)', marginTop: '0.25rem' }}>
                  Net returns after gas costs
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgb(161, 161, 161)', marginBottom: '0.25rem' }}>
                  24h Fees Generated
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#60a5fa' }}>
                  ${formatNumber(poolData.fees24h)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgb(161, 161, 161)', marginTop: '0.25rem' }}>
                  Trading fee revenue
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgb(161, 161, 161)', marginBottom: '0.25rem' }}>
                  Pool Reserves
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#c084fc' }}>
                  ${formatNumber(poolData.tvl)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgb(161, 161, 161)', marginTop: '0.25rem' }}>
                  Total value locked
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgb(161, 161, 161)', marginBottom: '0.25rem' }}>
                  Current Price
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fbbf24' }}>
                  ${poolData.currentPrice ? poolData.currentPrice.toFixed(4) : '0.00'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgb(161, 161, 161)', marginTop: '0.25rem' }}>
                  WLFI/USD1 rate
                </div>
              </div>
            </div>

            <div style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              backgroundColor: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.15)',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              color: 'rgb(161, 161, 161)'
            }}>
              <strong style={{ color: '#60a5fa' }}>Note:</strong> Calculations based on live Uniswap V3 Subgraph data. For full position analytics including IL tracking, PnL history, and backtesting, visit <a href={getRevertFinanceUrl('30')} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>Revert Finance</a>.
            </div>
          </div>
        )}

        {/* 3D Visualization */}
        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ 
                fontSize: '1.125rem', 
                fontWeight: '600',
                color: '#f6d55c'
              }}>3D Liquidity Position Visualization</span>
            <div style={{ position: 'relative', display: 'inline-block' }} className="group">
              <Info style={{ width: '1rem', height: '1rem', color: '#d4af37', cursor: 'help' }} />
              <div style={{
                position: 'absolute',
                left: 0,
                top: '1.5rem',
                width: '18rem',
                padding: '0.75rem',
                backgroundColor: 'rgba(10, 10, 10, 0.95)',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                borderRadius: '0.5rem',
                boxShadow: '0 10px 15px -3px rgba(212, 175, 55, 0.1)',
                opacity: 0,
                pointerEvents: 'none',
                zIndex: 10,
                fontSize: '0.875rem',
                transition: 'opacity 150ms',
                color: '#e2c55f'
              }} className="group-hover-tooltip">
                Rotate: Left click + drag · Zoom: Scroll · Pan: Right click + drag
              </div>
            </div>
            </div>
            <button
              onClick={() => setShowTokenBreakdown(!showTokenBreakdown)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: showTokenBreakdown ? '#10b981' : 'rgba(212, 175, 55, 0.2)',
                border: `1px solid ${showTokenBreakdown ? '#10b981' : '#d4af37'}`,
                borderRadius: '0.5rem',
                color: showTokenBreakdown ? 'white' : '#d4af37',
                fontWeight: '500',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 200ms',
                whiteSpace: 'nowrap'
              }}
            >
              {showTokenBreakdown ? 'Token View' : 'Position View'}
            </button>
          </div>
          <div style={{ height: '50vh', minHeight: '450px', background: 'transparent', borderRadius: '0.75rem', overflow: 'hidden', border: 'none' }}>
            <Canvas camera={{ position: [0, 10, 25], fov: 50 }}>
                  <ambientLight intensity={0.5} />
                  <pointLight position={[10, 10, 10]} intensity={1} />
                  <pointLight position={[-10, -10, -10]} intensity={0.3} />
              <OrbitControls enableDamping dampingFactor={0.05} />

              <AxisLabels size={size} />
              <AxisIndicators size={size} />
              <CurrentPricePlane 
                size={size} 
                showTokenBreakdown={showTokenBreakdown} 
                tokenBreakdown={tokenBreakdown}
                poolData={poolData}
                baseOrderWidth={baseOrderWidth}
                limitOrderWeight={limitOrderWeight}
                baseOrderWeight={baseOrderWeight}
                fullRangeWeight={fullRangeWeight}
              />

              {liquidityData.map((data, index) => {
                const width = ((data.tickUpper - data.tickLower) / 80000) * size
                const centerTick = (data.tickLower + data.tickUpper) / 2
                const position = [
                  ((centerTick - CURRENT_TICK) / 80000) * size,
                  (data.weight / 100) * (size / 2),
                  0,
                ]
                
                // Check if this box crosses the current price line
                const crossesCurrentPrice = showTokenBreakdown && 
                  data.tickLower < CURRENT_TICK && 
                  data.tickUpper > CURRENT_TICK
                
                if (crossesCurrentPrice) {
                  // Split the box into two parts: left (blue) and right (gold)
                  const leftTicks = CURRENT_TICK - data.tickLower
                  const rightTicks = data.tickUpper - CURRENT_TICK
                  const totalTicks = data.tickUpper - data.tickLower
                  
                  const leftWidth = (leftTicks / totalTicks) * width
                  const rightWidth = (rightTicks / totalTicks) * width
                  
                  const leftCenter = ((data.tickLower + CURRENT_TICK) / 2 - CURRENT_TICK) / 80000 * size
                  const rightCenter = ((CURRENT_TICK + data.tickUpper) / 2 - CURRENT_TICK) / 80000 * size
                  
                  const height = (data.weight / 100) * size
                  const yPos = (data.weight / 100) * (size / 2)
                  
                  return (
                    <group key={index}>
                      {/* Left side - USD1 (Blue) */}
                      <mesh position={[leftCenter, yPos, 0]}>
                        <boxGeometry args={[leftWidth, height, 2]} />
                        <meshStandardMaterial color="#60a5fa" transparent opacity={0.6} />
                      </mesh>
                      <lineSegments position={[leftCenter, yPos, 0]}>
                        <edgesGeometry args={[new THREE.BoxGeometry(leftWidth, height, 2)]} />
                        <lineBasicMaterial color="#60a5fa" linewidth={2} />
                      </lineSegments>
                      
                      {/* Right side - WLFI (Gold) */}
                      <mesh position={[rightCenter, yPos, 0]}>
                        <boxGeometry args={[rightWidth, height, 2]} />
                        <meshStandardMaterial color="#fbbf24" transparent opacity={0.6} />
                      </mesh>
                      <lineSegments position={[rightCenter, yPos, 0]}>
                        <edgesGeometry args={[new THREE.BoxGeometry(rightWidth, height, 2)]} />
                        <lineBasicMaterial color="#fbbf24" linewidth={2} />
                      </lineSegments>
                      
                      <Text
                        position={[position[0], yPos + height / 2 + 0.5, 0]}
                        color={data.color}
                        fontSize={0.4}
                        anchorX="center"
                        anchorY="bottom"
                        fillOpacity={showTokenBreakdown ? 0.2 : 1.0}
                      >
                        {data.name}
                      </Text>
                    </group>
                  )
                } else {
                  // Box is entirely on one side
                  let blockColor = data.color
                  if (showTokenBreakdown) {
                    if (data.tickUpper <= CURRENT_TICK) {
                      // Entirely left of yellow line = USD1
                      blockColor = '#60a5fa'
                    } else if (data.tickLower >= CURRENT_TICK) {
                      // Entirely right of yellow line = WLFI
                      blockColor = '#fbbf24'
                    }
                  }
                  
                  return (
                    <group key={index}>
                      <mesh position={position}>
                        <boxGeometry args={[width, (data.weight / 100) * size, 2]} />
                        <meshStandardMaterial color={blockColor} transparent opacity={0.6} />
                      </mesh>
                      <lineSegments position={position}>
                        <edgesGeometry args={[new THREE.BoxGeometry(width, (data.weight / 100) * size, 2)]} />
                        <lineBasicMaterial color={blockColor} linewidth={2} />
                      </lineSegments>
                      <Text
                        position={[position[0], position[1] + (data.weight / 100) * (size / 2) + 0.5, 0]}
                        color={showTokenBreakdown ? blockColor : data.color}
                        fontSize={0.4}
                        anchorX="center"
                        anchorY="bottom"
                        fillOpacity={showTokenBreakdown ? 0.2 : 1.0}
                      >
                        {data.name}
                      </Text>
                    </group>
                  )
                }
              })}

                  <gridHelper args={[20, 20, 0x202020, 0x404040]} position={[0, 0, 0]} />
            </Canvas>
          </div>
        </div>

        {/* Control Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          {/* Liquidity Weight Controls */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Liquidity Weight Distribution</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {liquidityData.map((data, index) => (
                <div key={index}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '1rem', height: '1rem', backgroundColor: data.color, borderRadius: '0.25rem' }} />
                      {data.name}
                    </label>
                    <span style={{ fontSize: '0.875rem', color: 'rgb(156, 163, 175)', fontFamily: 'monospace' }}>{formatPercent(data.weight)}</span>
                  </div>
                  <div style={{ height: '0.5rem', borderRadius: '9999px', backgroundColor: 'rgb(31, 41, 55)', overflow: 'hidden', marginBottom: '0.5rem' }}>
                    <div
                      style={{ height: '100%', width: `${data.weight}%`, backgroundColor: data.color, transition: 'all 300ms' }}
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={0.1}
                    value={data.weight}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value)
                      if (index === 0) {
                        const remaining = 100 - value
                        const ratio = baseOrderWeight / (baseOrderWeight + limitOrderWeight)
                        setFullRangeWeight(value)
                        setBaseOrderWeight(remaining * ratio)
                        setLimitOrderWeight(remaining * (1 - ratio))
                      } else if (index === 1) {
                        const remaining = 100 - fullRangeWeight - value
                        setBaseOrderWeight(value)
                        setLimitOrderWeight(remaining)
                      } else {
                        const remaining = 100 - fullRangeWeight - value
                        setLimitOrderWeight(value)
                        setBaseOrderWeight(remaining)
                      }
                    }}
                    style={{ width: '100%', marginTop: '0.5rem' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Position Range Controls */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Position Range Configuration</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Base Order Width</label>
                  <span style={{ fontSize: '0.875rem', color: 'rgb(156, 163, 175)', fontFamily: 'monospace' }}>
                    {baseOrderWidth} ticks (±{((Math.exp((baseOrderWidth / 2) * 0.0001) - 1) * 100).toFixed(1)}%)
                  </span>
                </div>
                <input
                  type="range"
                  min={200}
                  max={100000}
                  step={200}
                  value={baseOrderWidth}
                  onChange={(e) => setBaseOrderWidth(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
                <p style={{ fontSize: '0.75rem', color: 'rgb(156, 163, 175)', marginTop: '0.5rem' }}>Main liquidity concentration around current price</p>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Limit Order Width</label>
                  <span style={{ fontSize: '0.875rem', color: 'rgb(156, 163, 175)', fontFamily: 'monospace' }}>
                    {limitOrderWidth} ticks ({((Math.exp(limitOrderWidth * 0.0001) - 1) * 100).toFixed(1)}%)
                  </span>
                </div>
                <input
                  type="range"
                  min={200}
                  max={100000}
                  step={200}
                  value={limitOrderWidth}
                  onChange={(e) => setLimitOrderWidth(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
                <p style={{ fontSize: '0.75rem', color: 'rgb(156, 163, 175)', marginTop: '0.5rem' }}>Limit order position for price movements</p>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', display: 'block', marginBottom: '0.75rem' }}>Limit Order Placement</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1 }}>
                    <input
                      type="radio"
                      value="left"
                      checked={limitOrderSide === "left"}
                      onChange={(e) => setLimitOrderSide(e.target.value)}
                      style={{ width: '1rem', height: '1rem' }}
                    />
                    Below Price
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1 }}>
                    <input
                      type="radio"
                      value="right"
                      checked={limitOrderSide === "right"}
                      onChange={(e) => setLimitOrderSide(e.target.value)}
                      style={{ width: '1rem', height: '1rem' }}
                    />
                    Above Price
                  </label>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

VaultVisualization.displayName = "VaultVisualization"
