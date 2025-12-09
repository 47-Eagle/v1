// Test script to verify historical data fetching
async function testHistoricalData() {
  console.log('Testing historical data fetching...');

  const query = `
    query GetVault($address: ID!) {
      vault(id: $address) {
        id
        totalAssets
        totalSupply
        sharePrice
        snapshots(orderBy: timestamp, orderDirection: desc, first: 10) {
          timestamp
          totalAssets
          totalSupply
          sharePrice
          usd1StrategyTVL
          wethStrategyTVL
          liquidWLFI
          liquidUSD1
        }
      }
    }
  `;

  try {
    const response = await fetch('https://api.studio.thegraph.com/query/64373/47-eagle/v0.0.2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { address: '0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953'.toLowerCase() }
      })
    });

    const result = await response.json();
    console.log('API Response:', JSON.stringify(result, null, 2));

    if (result.data?.vault?.snapshots) {
      console.log(`✅ Found ${result.data.vault.snapshots.length} historical snapshots`);
      if (result.data.vault.snapshots.length > 0) {
        console.log('Sample snapshot:', result.data.vault.snapshots[0]);
      }
    } else {
      console.log('❌ No historical snapshots found');
    }
  } catch (error) {
    console.error('❌ Error fetching historical data:', error);
  }
}

testHistoricalData();
