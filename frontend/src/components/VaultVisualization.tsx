// Comprehensive 3D Pool Visualization with All Positions
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Text } from "@react-three/drei"
import { useState, useEffect, useMemo } from "react"
import { CONTRACTS } from '../config/contracts'
import { UniswapBadge, CharmBadge } from './tech-stack'
import { useCharmVaultData } from '../hooks/useCharmVaultData'

const WLFI_PRICE_USD = 0.127
const CURRENT_TICK = Math.floor(Math.log(WLFI_PRICE_USD) / Math.log(1.0001))

// WLFI/USD1 Pool on Uniswap V3 (1% fee tier)
const POOL_ADDRESS = '0xf9f5e6f7a44ee10c72e67bded6654afaf4d0c85d'

// Fetch Revert Finance pool analytics (better data!)
const fetchRevertFinanceData = async () => {
  try {
    const response = await fetch(
      `/api/revert-finance?pool=${POOL_ADDRESS}&days=30&network=mainnet`
    );
    const result = await response.json();
    
    if (result.success && result.data) {
      const latestDay = result.data[result.data.length - 1]
      
      // Calculate 7-day average APR (more accurate than single day)
      const last7Days = result.data.slice(-7)
      const validDays = last7Days.filter((d: any) => d.fees_apr > 0)
      const avgAPR = validDays.length > 0
        ? validDays.reduce((sum: number, d: any) => sum + d.fees_apr, 0) / validDays.length
        : 0
      
      // Calculate 7-day average volume
      const avgVolume = last7Days.reduce((sum: number, d: any) => sum + d.volume_usd, 0) / 7
      
      // Use max APR from last 7 days for "best case" display
      const maxAPR = Math.max(...last7Days.map((d: any) => d.fees_apr))
      
      console.log('[VaultViz] Revert Finance Data (7-day):', {
        currentTVL: `$${latestDay.tvl_usd.toFixed(2)}`,
        avgAPR: `${avgAPR.toFixed(2)}%`,
        maxAPR: `${maxAPR.toFixed(2)}%`,
        avgVolume: `$${avgVolume.toFixed(2)}/day`,
        todayAPR: `${latestDay.fees_apr.toFixed(2)}%`
      })
      
      return { 
        success: true, 
        data: result.data, 
        latest: latestDay,
        avgAPR,
        maxAPR,
        avgVolume
      }
    }
  } catch (error) {
    console.error('Error fetching Revert Finance data:', error);
  }
  return null;
}

// Fetch Charm Finance vault configuration
const fetchCharmData = async () => {
  try {
    const query = `
      query GetVault($address: ID!) {
        vault(id: $address) {
          baseLower
          baseUpper
          limitLower
          limitUpper
          fullRangeWeight
          pool { tick }
        }
      }
    `;

    const response = await fetch('https://stitching-v2.herokuapp.com/1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { address: CONTRACTS.CHARM_VAULT.toLowerCase() }
      })
    });

    const result = await response.json();
    return result.data?.vault || null;
  } catch (error) {
    console.error('Error fetching Charm data:', error);
    return null;
  }
}

interface VaultVisualizationProps {
  currentPrice?: number;
}

export default function VaultVisualization({ currentPrice = WLFI_PRICE_USD }: VaultVisualizationProps) {
  const size = 30  // Increased for better visibility
  const [revertData, setRevertData] = useState<any>(null)
  const [hoveredTick, setHoveredTick] = useState<number | null>(null)
  
  // Fetch real on-chain Charm vault data
  const charmData = useCharmVaultData()
  const loading = charmData.loading

  useEffect(() => {
    // Fetch Revert Finance data for APR/volume metrics
    fetchRevertFinanceData().then((revert) => {
      setRevertData(revert)
    })
  }, [])

  const positions = useMemo(() => {
    // Weights are now correctly calculated in the hook:
    // - Full range: from contract (e.g., 74%)
    // - Base/Limit: split the remaining 26% based on tick widths
    //   * Base = 2000 ticks → gets 1/3 of 26% = ~8.67%
    //   * Limit = 4000 ticks → gets 2/3 of 26% = ~17.33%
    //   * Total = 74% + 8.67% + 17.33% = 100% ✅
    let fullWeight = charmData.loading ? 47 : charmData.fullRangeWeight
    let baseWeight = charmData.loading ? 29 : charmData.baseWeight
    let limitWeight = charmData.loading ? 24 : charmData.limitWeight

    // Debug: Log what we received
    console.log('[VaultViz] Raw weights from hook:', {
      fullWeight,
      baseWeight,
      limitWeight,
      loading: charmData.loading
    });

    // Critical safety check: convert basis points to percentage if needed
    if (Math.abs(fullWeight) > 100) {
      console.warn('[VaultViz] Full weight is in basis points, converting:', fullWeight);
      fullWeight = fullWeight / 100;
    }
    if (Math.abs(baseWeight) > 100) {
      console.warn('[VaultViz] Base weight is in basis points, converting:', baseWeight);
      baseWeight = baseWeight / 100;
    }
    if (Math.abs(limitWeight) > 100) {
      console.warn('[VaultViz] Limit weight is in basis points, converting:', limitWeight);
      limitWeight = limitWeight / 100;
    }
    
    // CRITICAL: Ensure all weights are positive (no negative percentages!)
    fullWeight = Math.abs(fullWeight);
    baseWeight = Math.abs(baseWeight);
    limitWeight = Math.abs(limitWeight);
    
    // Ensure no NaN values
    if (isNaN(fullWeight)) fullWeight = 74;
    if (isNaN(baseWeight)) baseWeight = 8.67;
    if (isNaN(limitWeight)) limitWeight = 17.33;

    console.log('[VaultViz] After conversion and safety checks:', {
      fullWeight,
      baseWeight,
      limitWeight,
      total: fullWeight + baseWeight + limitWeight
    });

    const currentTickValue = charmData.loading ? CURRENT_TICK : charmData.currentTick

    // Use real tick ranges from Charm vault contract
    const baseLower = charmData.loading ? (currentTickValue - 2100) : charmData.baseTickLower
    const baseUpper = charmData.loading ? (currentTickValue + 2100) : charmData.baseTickUpper
    
    let limitLower = charmData.loading ? currentTickValue : charmData.limitTickLower
    let limitUpper = charmData.loading ? (currentTickValue + 12000) : charmData.limitTickUpper
    
    // Ensure limit order is adjacent to current price for better visualization
    if (limitUpper < currentTickValue) {
      limitUpper = currentTickValue
    } else if (limitLower > currentTickValue) {
      limitLower = currentTickValue
    }

    const result = [
      { name: "Full Range", tickLower: -887200, tickUpper: 887200, weight: fullWeight, color: "#4a9e9e" },
      { name: "Base Order", tickLower: baseLower, tickUpper: baseUpper, weight: baseWeight, color: "#4a4a9e" },
      { name: "Limit Order", tickLower: limitLower, tickUpper: limitUpper, weight: limitWeight, color: "#9e4a4a" },
    ]

    const totalWeight = fullWeight + baseWeight + limitWeight;

    console.log('[VaultViz] Position Weights:', {
      fullRange: `${fullWeight.toFixed(1)}%`,
      base: `${baseWeight.toFixed(1)}%`,
      limit: `${limitWeight.toFixed(1)}%`,
      total: `${totalWeight.toFixed(1)}%`,
      isValid: totalWeight >= 99 && totalWeight <= 101
    })
    
    // Validation check
    if (totalWeight < 99 || totalWeight > 101) {
      console.error('[VaultViz] WARNING: Total allocation is not 100%!', {
        total: totalWeight,
        breakdown: { fullWeight, baseWeight, limitWeight }
      });
    }

    console.log('[VaultViz] Position Ranges:', {
      base: `${baseLower} to ${baseUpper}`,
      limit: `${limitLower} to ${limitUpper}`,
      currentTick: currentTickValue
    })

    return result
  }, [charmData])

  // Generate tick-by-tick liquidity distribution from positions
  const tickDistribution = useMemo(() => {
    const TICK_SPACING = 400 // Wider spacing for better visualization
    const RANGE = 60000 // Narrower range focused on active positions
    const currentTickValue = charmData.loading ? CURRENT_TICK : charmData.currentTick
    
    const tickBars: Array<{ tick: number; liquidity: number }> = []
    
    // For each tick in the range, calculate total liquidity
    for (let tick = currentTickValue - RANGE/2; tick <= currentTickValue + RANGE/2; tick += TICK_SPACING) {
      let liquidityAtTick = 0
      
      // Check each position to see if this tick is covered
      // Skip full range for now as it dominates the visualization
      positions.forEach(pos => {
        if (pos.name !== "Full Range" && tick >= pos.tickLower && tick <= pos.tickUpper) {
          liquidityAtTick += pos.weight
        }
      })
      
      // Add a small portion of full range for reference
      const fullRangePos = positions.find(p => p.name === "Full Range")
      if (fullRangePos && tick >= fullRangePos.tickLower && tick <= fullRangePos.tickUpper) {
        liquidityAtTick += fullRangePos.weight * 0.15 // Scale down full range to 15% for visibility
      }
      
      if (liquidityAtTick > 0) {
        tickBars.push({ tick, liquidity: liquidityAtTick })
      }
    }
    
    console.log(`[VaultViz] Tick Distribution: ${tickBars.length} bars (range: ${currentTickValue - RANGE/2} to ${currentTickValue + RANGE/2})`)
    return tickBars
  }, [positions, charmData])

  const usedTick = charmData.loading ? CURRENT_TICK : charmData.currentTick

  return (
    <div className="w-full">
      <div className="bg-black/40 border border-white/5 rounded-xl overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-white/5 bg-black/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="text-xs sm:text-sm font-semibold text-white mb-0.5 sm:mb-1 truncate">3D Capital Allocation</h4>
              <p className="text-[10px] sm:text-xs text-gray-400 truncate">Liquidity distribution across price ranges</p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <UniswapBadge />
              <CharmBadge />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96 bg-black/20">
            <div className="text-center">
              <svg className="animate-spin w-8 h-8 mx-auto mb-3 text-yellow-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-xs text-gray-300">Loading Charm Finance vault data...</p>
            </div>
          </div>
        ) : charmData.error ? (
          <div className="flex items-center justify-center h-96 bg-black/20">
            <div className="text-center max-w-md px-4">
              <svg className="w-12 h-12 mx-auto mb-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-400 mb-2">Error loading vault data</p>
              <p className="text-xs text-gray-400">{charmData.error}</p>
              <p className="text-xs text-gray-500 mt-2">Displaying fallback data</p>
            </div>
          </div>
        ) : (
          <div className="h-96 sm:h-[500px] md:h-[600px] lg:h-[700px] xl:h-[800px]" style={{ background: '#000' }}>
            <Canvas camera={{ position: [0, 8, 50], fov: 60 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <pointLight position={[-10, -10, -10]} intensity={0.3} />
              <OrbitControls enableDamping dampingFactor={0.05} />

              {/* Current Price Indicator */}
              <mesh position={[0, size / 3, 0]}>
                <boxGeometry args={[0.1, size * 0.7, 2]} />
                <meshStandardMaterial color="yellow" transparent opacity={0.5} />
              </mesh>

              {/* Price Label */}
              <Text position={[0, 1, size / 2 + 2]} color="yellow" fontSize={0.8} anchorX="center">
                ${currentPrice.toFixed(4)}
              </Text>

              {/* Revert Finance Metrics in 3D Space */}
              {revertData && (
                <group position={[-size/2 + 2, size/2 - 1, size/2 + 0.5]}>
                  <Text position={[0, 1.2, 0]} color="#60a5fa" fontSize={0.3} anchorX="left" fontWeight="bold">
                    POOL ANALYTICS
                  </Text>
                  <Text position={[0, 0.7, 0]} color="white" fontSize={0.25} anchorX="left">
                    TVL: ${revertData.latest?.tvl_usd.toFixed(2) || '0'}
                  </Text>
                  <Text position={[0, 0.4, 0]} color="#10b981" fontSize={0.25} anchorX="left" fontWeight="bold">
                    7d Avg APR: {revertData.avgAPR?.toFixed(1) || '0'}%
                  </Text>
                  <Text position={[0, 0.1, 0]} color="#F2D57C" fontSize={0.25} anchorX="left">
                    Max APR: {revertData.maxAPR?.toFixed(1) || '0'}%
                  </Text>
                  <Text position={[0, -0.2, 0]} color="white" fontSize={0.25} anchorX="left">
                    Avg Vol: ${revertData.avgVolume?.toFixed(0) || '0'}/day
                  </Text>
                  <Text position={[0, -0.5, 0]} color="rgba(255,255,255,0.5)" fontSize={0.18} anchorX="left">
                    Last 7 days
                  </Text>
                  <Text position={[0, -0.8, 0]} color="#10b981" fontSize={0.18} anchorX="left">
                    via Revert Finance
                  </Text>
                </group>
              )}

              {/* Tick-by-Tick Liquidity Bars with Interactive Hover */}
              {tickDistribution.map((bar, i) => {
                const TICK_WIDTH = (200 / 80000) * size
                const x = ((bar.tick - usedTick) / 80000) * size
                // Reduced height scaling for better visibility
                const height = (bar.liquidity / 100) * (size / 3)
                const y = height / 2
                
                const isHovered = hoveredTick === bar.tick
                
                // Color gradient based on distance from current price
                const distanceFromCurrent = Math.abs(bar.tick - usedTick)
                const normalizedDistance = Math.min(distanceFromCurrent / 40000, 1)
                
                const r = Math.floor(16 + normalizedDistance * 139)
                const g = Math.floor(185 - normalizedDistance * 83)
                const b = Math.floor(129 + normalizedDistance * 112)
                const baseColor = `rgb(${r}, ${g}, ${b})`
                const color = isHovered ? '#F2D57C' : baseColor // Primary Gold when hovered

                // Calculate tick price for display
                const tickPrice = Math.pow(1.0001, bar.tick)

                return (
                  <group key={`tick-${i}`}>
                    <mesh 
                      position={[x, y, 0]}
                      onPointerOver={(e) => {
                        e.stopPropagation()
                        setHoveredTick(bar.tick)
                        document.body.style.cursor = 'pointer'
                      }}
                      onPointerOut={() => {
                        setHoveredTick(null)
                        document.body.style.cursor = 'default'
                      }}
                    >
                      <boxGeometry args={[TICK_WIDTH, height, isHovered ? 5 : 3]} />
                      <meshStandardMaterial 
                        color={color} 
                        transparent 
                        opacity={isHovered ? 0.95 : 0.7}
                        emissive={color}
                        emissiveIntensity={isHovered ? 0.8 : 0.3} // Enhanced glow for hover
                      />
                    </mesh>
                    
                    {/* Hover Tooltip */}
                    {isHovered && (
                      <group position={[x, height + 2.5, 0]}>
                        <Text
                          position={[0, 1.2, 0]}
                          color="#F2D57C"
                          fontSize={0.7}
                          anchorX="center"
                          anchorY="middle"
                          fontWeight="bold"
                        >
                          Tick {bar.tick}
                        </Text>
                        <Text
                          position={[0, 0.4, 0]}
                          color="white"
                          fontSize={0.5}
                          anchorX="center"
                          anchorY="middle"
                        >
                          Price: ${tickPrice.toFixed(6)}
                        </Text>
                        <Text
                          position={[0, -0.4, 0]}
                          color="#10b981"
                          fontSize={0.5}
                          anchorX="center"
                          anchorY="middle"
                          fontWeight="bold"
                        >
                          {bar.liquidity.toFixed(1)}% Liquidity
                        </Text>
                      </group>
                    )}
                  </group>
                )
              })}
              
              {/* Position Labels (on top of bars) */}
              {positions.map((pos, i) => {
                const centerTick = (pos.tickLower + pos.tickUpper) / 2
                const x = ((centerTick - usedTick) / 80000) * size
                const heightMultiplier = pos.name === "Full Range" ? 0.15 : 1.0
                const visualHeight = (pos.weight / 100) * (size / 2) * heightMultiplier

                return (
                  <group key={`label-${i}`}>
                    <Text 
                      position={[x, visualHeight + 1, 0]} 
                      color="white" 
                      fontSize={0.8}
                      anchorX="center"
                    >
                      {pos.name}
                    </Text>
                    <Text 
                      position={[x, visualHeight + 2, 0]} 
                      color={pos.color} 
                      fontSize={0.7}
                      anchorX="center"
                      fontWeight="bold"
                    >
                      {pos.weight.toFixed(1)}%
                    </Text>
                  </group>
                )
              })}

              <gridHelper args={[40, 40, 0x202020, 0x404040]} />
            </Canvas>
          </div>
        )}

        {/* Legend */}
        <div className="p-3 sm:p-4 border-t border-white/5 bg-black/20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs mb-3">
            {positions.map((pos, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: pos.color }}></div>
                <div className="min-w-0 flex-1">
                  <div className="text-white font-medium truncate">{pos.name}</div>
                  <div className="text-gray-400 text-[10px] sm:text-xs">{pos.weight.toFixed(1)}% of capital</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-500 mb-2 sm:mb-3">
            Total Allocation: {positions.reduce((sum, pos) => sum + pos.weight, 0).toFixed(1)}%
            {(positions.reduce((sum, pos) => sum + pos.weight, 0) < 95 || positions.reduce((sum, pos) => sum + pos.weight, 0) > 105) && (
              <span className="text-[#FFE7A3] ml-2 block sm:inline mt-1 sm:mt-0">⚠️ Warning: Total should be ~100%</span>
            )}
          </div>
          {revertData && (
            <div className="pt-3 sm:pt-4 border-t border-white/5">
              <div className="text-xs sm:text-sm text-gray-300">
                <div className="text-gray-300 font-semibold text-sm sm:text-base mb-2">
                  POOL ANALYTICS
                  <span className="text-[10px] sm:text-xs text-gray-500 font-normal ml-2">(Last 7 days)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-black/30 rounded-lg p-2 sm:p-3 border border-white/5">
                    <div className="text-[10px] sm:text-xs text-gray-500 mb-1">TVL</div>
                    <div className="text-sm sm:text-base font-bold text-white">
                      ${revertData.latest?.tvl_usd.toFixed(2) || '0'}
                    </div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2 sm:p-3 border border-white/5">
                    <div className="text-[10px] sm:text-xs text-gray-500 mb-1">7d Avg APR</div>
                    <div className="text-sm sm:text-base font-bold text-white">
                      {revertData.avgAPR?.toFixed(1) || '0'}%
                    </div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2 sm:p-3 border border-white/5">
                    <div className="text-[10px] sm:text-xs text-gray-500 mb-1">Max APR</div>
                    <div className="text-sm sm:text-base font-bold text-white">
                      {revertData.maxAPR?.toFixed(1) || '0'}%
                    </div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2 sm:p-3 border border-white/5">
                    <div className="text-[10px] sm:text-xs text-gray-500 mb-1">Avg Vol</div>
                    <div className="text-sm sm:text-base font-bold text-white">
                      ${revertData.avgVolume?.toFixed(0) || '0'}/day
                    </div>
                  </div>
                </div>
                <div className="text-[9px] sm:text-[10px] text-gray-600 mt-2 text-center">
                  via Revert Finance
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
