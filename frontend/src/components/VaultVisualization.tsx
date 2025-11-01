// Comprehensive 3D Pool Visualization with All Positions
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Text } from "@react-three/drei"
import { useState, useEffect, useMemo } from "react"
import { CONTRACTS } from '../config/contracts'
import { UniswapBadge, CharmBadge } from './tech-stack'

const WLFI_PRICE_USD = 0.127
const CURRENT_TICK = Math.floor(Math.log(WLFI_PRICE_USD) / Math.log(1.0001))

// WLFI/USD1 Pool on Uniswap V3 (1% fee tier)
const POOL_ADDRESS = '0xf9f5e6f7a44ee10c72e67bded6654afaf4d0c85d'

// Fetch Revert Finance pool analytics (better data!)
const fetchRevertFinanceData = async () => {
  try {
    const response = await fetch(
      `https://api.revert.finance/v1/discover-pools/daily?pool=${POOL_ADDRESS}&days=30&network=mainnet`
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
  const size = 20
  const [charmData, setCharmData] = useState<any>(null)
  const [revertData, setRevertData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredTick, setHoveredTick] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      fetchCharmData(),
      fetchRevertFinanceData()
      // Skipping fetchPoolPositions() due to CORS issues with The Graph
    ]).then(([charm, revert]) => {
      if (charm) {
        console.log('[VaultViz] Charm Finance Data:')
        console.log('  baseLower:', charm.baseLower)
        console.log('  baseUpper:', charm.baseUpper)
        console.log('  limitLower:', charm.limitLower)
        console.log('  limitUpper:', charm.limitUpper)
        console.log('  fullRangeWeight:', charm.fullRangeWeight, '(', (parseFloat(charm.fullRangeWeight) / 10000).toFixed(2), '% )')
        console.log('  currentTick:', charm.pool?.tick)
      }
      setCharmData(charm)
      // setPoolData(pool) - Disabled for now
      setRevertData(revert)
      setLoading(false)
    })
  }, [])

  const positions = useMemo(() => {
    // Parse Charm data (fullRangeWeight is in basis points: 470000 = 47%)
    const fullWeight = charmData?.fullRangeWeight ? parseFloat(charmData.fullRangeWeight) / 10000 : 47
    
    // Calculate base and limit weights from remaining liquidity
    // Typical Charm strategy is ~55% base, ~45% limit of non-full-range
    const remainingWeight = 100 - fullWeight
    const baseWeight = remainingWeight * 0.55
    const limitWeight = remainingWeight * 0.45

    const currentTickValue = charmData?.pool?.tick || CURRENT_TICK

    // Use real tick ranges from Charm or defaults
    const baseLower = charmData?.baseLower ? parseInt(charmData.baseLower) : (currentTickValue - 2100)
    const baseUpper = charmData?.baseUpper ? parseInt(charmData.baseUpper) : (currentTickValue + 2100)
    
    // Limit order - make it adjacent to current price
    // If limitLower is less than current tick, it's a buy order (below price)
    // If limitLower is above current tick, it's a sell order (above price)
    let limitLower = charmData?.limitLower ? parseInt(charmData.limitLower) : currentTickValue
    let limitUpper = charmData?.limitUpper ? parseInt(charmData.limitUpper) : (currentTickValue + 12000)
    
    // Ensure limit order is adjacent to current price for better visualization
    if (limitUpper < currentTickValue) {
      // Below current price - adjust to touch current price
      limitUpper = currentTickValue
    } else if (limitLower > currentTickValue) {
      // Above current price - starts at current price
      limitLower = currentTickValue
    }

    const result = [
      { name: "Full Range", tickLower: -887200, tickUpper: 887200, weight: fullWeight, color: "#4a9e9e" },
      { name: "Base Order", tickLower: baseLower, tickUpper: baseUpper, weight: baseWeight, color: "#4a4a9e" },
      { name: "Limit Order", tickLower: limitLower, tickUpper: limitUpper, weight: limitWeight, color: "#9e4a4a" },
    ]

    console.log('[VaultViz] Position Weights:', {
      fullRange: fullWeight.toFixed(1) + '%',
      base: baseWeight.toFixed(1) + '%',
      limit: limitWeight.toFixed(1) + '%',
      total: (fullWeight + baseWeight + limitWeight).toFixed(1) + '%'
    })

    console.log('[VaultViz] Position Ranges:', {
      base: `${baseLower} to ${baseUpper}`,
      limit: `${limitLower} to ${limitUpper}`,
      currentTick: currentTickValue
    })

    return result
  }, [charmData])

  // Generate tick-by-tick liquidity distribution from positions
  const tickDistribution = useMemo(() => {
    const TICK_SPACING = 200 // Uniswap V3 1% pool spacing
    const RANGE = 80000 // Display range ±40k ticks from current
    const currentTickValue = charmData?.pool?.tick || CURRENT_TICK
    
    const tickBars: Array<{ tick: number; liquidity: number }> = []
    
    // For each tick in the range, calculate total liquidity
    for (let tick = currentTickValue - RANGE/2; tick <= currentTickValue + RANGE/2; tick += TICK_SPACING) {
      let liquidityAtTick = 0
      
      // Check each position to see if this tick is covered
      positions.forEach(pos => {
        if (tick >= pos.tickLower && tick <= pos.tickUpper) {
          liquidityAtTick += pos.weight
        }
      })
      
      if (liquidityAtTick > 0) {
        tickBars.push({ tick, liquidity: liquidityAtTick })
      }
    }
    
    console.log(`[VaultViz] Tick Distribution: ${tickBars.length} bars`)
    return tickBars
  }, [positions, charmData])

  const usedTick = charmData?.pool?.tick || CURRENT_TICK

  return (
    <div className="w-full">
      <div className="bg-black/40 border border-white/5 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-black/20">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-white mb-1">3D Capital Allocation</h4>
              <p className="text-xs text-gray-400">Liquidity distribution across price ranges</p>
            </div>
            <div className="flex items-center gap-2">
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
              <p className="text-xs text-gray-300">Loading position data...</p>
            </div>
          </div>
        ) : (
          <div style={{ height: '500px', background: '#000' }}>
            <Canvas camera={{ position: [0, 10, 25], fov: 50 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <pointLight position={[-10, -10, -10]} intensity={0.3} />
              <OrbitControls enableDamping dampingFactor={0.05} />

              {/* Current Price Indicator */}
              <mesh position={[0, size / 2, 0]}>
                <boxGeometry args={[0.1, size, 2]} />
                <meshStandardMaterial color="yellow" transparent opacity={0.5} />
              </mesh>

              {/* Price Label */}
              <Text position={[0, 1, size / 2 + 1]} color="yellow" fontSize={0.4} anchorX="center">
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
                  <Text position={[0, 0.1, 0]} color="#fbbf24" fontSize={0.25} anchorX="left">
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
                const height = (bar.liquidity / 100) * (size / 2)
                const y = height / 2
                
                const isHovered = hoveredTick === bar.tick
                
                // Color gradient based on distance from current price
                const distanceFromCurrent = Math.abs(bar.tick - usedTick)
                const normalizedDistance = Math.min(distanceFromCurrent / 40000, 1)
                
                const r = Math.floor(16 + normalizedDistance * 139)
                const g = Math.floor(185 - normalizedDistance * 83)
                const b = Math.floor(129 + normalizedDistance * 112)
                const baseColor = `rgb(${r}, ${g}, ${b})`
                const color = isHovered ? '#fbbf24' : baseColor // Gold when hovered

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
                      <boxGeometry args={[TICK_WIDTH, height, isHovered ? 3 : 1.5]} />
                      <meshStandardMaterial 
                        color={color} 
                        transparent 
                        opacity={isHovered ? 0.95 : 0.7}
                        emissive={color}
                        emissiveIntensity={isHovered ? 0.6 : 0.2}
                      />
                    </mesh>
                    
                    {/* Hover Tooltip */}
                    {isHovered && (
                      <group position={[x, height + 1.5, 0]}>
                        <Text
                          position={[0, 0.6, 0]}
                          color="#fbbf24"
                          fontSize={0.35}
                          anchorX="center"
                          anchorY="middle"
                          fontWeight="bold"
                        >
                          Tick {bar.tick}
                        </Text>
                        <Text
                          position={[0, 0.2, 0]}
                          color="white"
                          fontSize={0.25}
                          anchorX="center"
                          anchorY="middle"
                        >
                          Price: ${tickPrice.toFixed(6)}
                        </Text>
                        <Text
                          position={[0, -0.1, 0]}
                          color="#10b981"
                          fontSize={0.25}
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
                      position={[x, visualHeight + 0.5, 0]} 
                      color="white" 
                      fontSize={0.4}
                      anchorX="center"
                    >
                      {pos.name}
                    </Text>
                    <Text 
                      position={[x, visualHeight + 1.0, 0]} 
                      color={pos.color} 
                      fontSize={0.35}
                      anchorX="center"
                      fontWeight="bold"
                    >
                      {pos.weight.toFixed(1)}%
                    </Text>
                  </group>
                )
              })}

              <gridHelper args={[20, 20, 0x202020, 0x404040]} />
            </Canvas>
          </div>
        )}

        {/* Legend */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="grid grid-cols-3 gap-4 text-xs mb-3">
            {positions.map((pos, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: pos.color }}></div>
                <div>
                  <div className="text-white font-medium">{pos.name}</div>
                  <div className="text-gray-400">{pos.weight.toFixed(1)}% of capital</div>
                </div>
              </div>
            ))}
          </div>
          {revertData && (
            <div className="pt-3 border-t border-white/5">
              <div className="text-xs text-gray-400">
                <span className="text-blue-400 font-semibold">Pool Analytics (7-day):</span>{' '}
                TVL ${revertData.latest?.tvl_usd.toFixed(2) || '0'} • 
                Avg APR {revertData.avgAPR?.toFixed(1) || '0'}% • 
                Max APR {revertData.maxAPR?.toFixed(1) || '0'}% • 
                Avg Vol ${revertData.avgVolume?.toFixed(0) || '0'}/day
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
