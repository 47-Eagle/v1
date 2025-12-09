const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress, getAccount } = require('@solana/spl-token');

async function checkBalance() {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const wallet = new PublicKey('7Qi3WW7q4kmqXcMBca76b3WjNMdRmjjjrpG5FTc8htxY');
  const mint = new PublicKey('9yiFPjapx5sr5UZELtmfVZK6dnMgQVfzWGL8XB6dbonk');

  try {
    const ata = await getAssociatedTokenAddress(mint, wallet);
    console.log('ATA:', ata.toString());

    const account = await getAccount(connection, ata);
    console.log('Raw amount:', account.amount.toString());
    console.log('Amount as number:', Number(account.amount));
    console.log('With 5 decimals:', Number(account.amount) / Math.pow(10, 5));
    console.log('With 9 decimals (wrong):', Number(account.amount) / Math.pow(10, 9));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

checkBalance();
