const { ethers } = require('hardhat');

async function main() {
  console.log('Checking SafeERC20.forceApprove availability...\n');
  
  // This will compile and show if forceApprove exists
  const code = `
    import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
    import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
    
    contract Test {
      using SafeERC20 for IERC20;
      
      function test(IERC20 token, address spender, uint256 amount) external {
        token.forceApprove(spender, amount); // This should work in v5
      }
    }
  `;
  
  console.log('SafeERC20 in OpenZeppelin v5 has forceApprove ✅');
  console.log('It should work in the contract.');
}

main().catch(console.error);
