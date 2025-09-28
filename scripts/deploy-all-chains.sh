#!/bin/bash

# 🦅 Eagle Vault Multi-Chain Deployment Script
# Deploys and configures LayerZero V2 on all target chains

echo "🦅 EAGLE VAULT MULTI-CHAIN DEPLOYMENT"
echo "======================================"

# Configuration
NETWORKS=("ethereum" "arbitrum" "base" "bsc")
SCRIPT="scripts/deploy-and-configure-complete.ts"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if hardhat is available
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx is not available. Please install Node.js and npm.${NC}"
    exit 1
fi

# Check if hardhat config exists
if [ ! -f "hardhat.config.ts" ]; then
    echo -e "${RED}❌ hardhat.config.ts not found. Run this script from the project root.${NC}"
    exit 1
fi

# Function to deploy on a single network
deploy_network() {
    local network=$1
    echo -e "\n${BLUE}🌐 Deploying on $network...${NC}"
    echo "----------------------------------------"
    
    # Run deployment
    if npx hardhat run "$SCRIPT" --network "$network"; then
        echo -e "${GREEN}✅ $network deployment successful${NC}"
        return 0
    else
        echo -e "${RED}❌ $network deployment failed${NC}"
        return 1
    fi
}

# Function to verify configuration
verify_network() {
    local network=$1
    echo -e "\n${YELLOW}🔍 Verifying $network configuration...${NC}"
    echo "----------------------------------------"
    
    if npx hardhat run "scripts/verify-layerzero-config.ts" --network "$network"; then
        echo -e "${GREEN}✅ $network verification successful${NC}"
        return 0
    else
        echo -e "${RED}❌ $network verification failed${NC}"
        return 1
    fi
}

# Main deployment loop
echo -e "\n${BLUE}Phase 1: Deploying contracts on all chains${NC}"
echo "=============================================="

failed_networks=()
successful_networks=()

for network in "${NETWORKS[@]}"; do
    if deploy_network "$network"; then
        successful_networks+=("$network")
    else
        failed_networks+=("$network")
    fi
done

# Report deployment results
echo -e "\n${BLUE}DEPLOYMENT SUMMARY${NC}"
echo "=================="
echo -e "${GREEN}✅ Successful: ${successful_networks[*]}${NC}"
if [ ${#failed_networks[@]} -gt 0 ]; then
    echo -e "${RED}❌ Failed: ${failed_networks[*]}${NC}"
fi

# Phase 2: Configuration (only if some deployments succeeded)
if [ ${#successful_networks[@]} -gt 1 ]; then
    echo -e "\n${BLUE}Phase 2: Configuring LayerZero cross-chain settings${NC}"
    echo "=================================================="
    
    echo -e "${YELLOW}⚠️  Re-running deployment to configure cross-chain settings...${NC}"
    
    config_failed=()
    for network in "${successful_networks[@]}"; do
        if deploy_network "$network"; then
            echo -e "${GREEN}✅ $network configuration updated${NC}"
        else
            config_failed+=("$network")
        fi
    done
    
    if [ ${#config_failed[@]} -gt 0 ]; then
        echo -e "${RED}⚠️  Configuration failed on: ${config_failed[*]}${NC}"
    fi
fi

# Phase 3: Verification
if [ ${#successful_networks[@]} -gt 0 ]; then
    echo -e "\n${BLUE}Phase 3: Verifying configurations${NC}"
    echo "=================================="
    
    verification_failed=()
    for network in "${successful_networks[@]}"; do
        if verify_network "$network"; then
            echo -e "${GREEN}✅ $network verification passed${NC}"
        else
            verification_failed+=("$network")
        fi
    done
    
    # Final status
    echo -e "\n${BLUE}FINAL STATUS${NC}"
    echo "============"
    
    if [ ${#verification_failed[@]} -eq 0 ] && [ ${#failed_networks[@]} -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL CHAINS DEPLOYED AND CONFIGURED SUCCESSFULLY!${NC}"
        echo -e "${GREEN}✅ Your Eagle Vault system is ready for production.${NC}"
        
        echo -e "\n${BLUE}📋 Next Steps:${NC}"
        echo "1. Test cross-chain transfers between chains"
        echo "2. Transfer ownership to final controllers"
        echo "3. Set up monitoring and alerting"
        echo "4. Update frontend with new contract addresses"
        
        # Show deployed addresses
        if [ -f "deployed-addresses.json" ]; then
            echo -e "\n${BLUE}📄 Deployed Addresses:${NC}"
            cat deployed-addresses.json
        fi
        
    else
        echo -e "${RED}⚠️  DEPLOYMENT INCOMPLETE${NC}"
        if [ ${#failed_networks[@]} -gt 0 ]; then
            echo -e "${RED}❌ Failed networks: ${failed_networks[*]}${NC}"
        fi
        if [ ${#verification_failed[@]} -gt 0 ]; then
            echo -e "${RED}❌ Verification failed: ${verification_failed[*]}${NC}"
        fi
        
        echo -e "\n${YELLOW}🔧 Recommended Actions:${NC}"
        echo "1. Check network RPC endpoints in hardhat.config.ts"
        echo "2. Ensure sufficient ETH balance on all chains"
        echo "3. Verify private key has correct permissions"
        echo "4. Re-run: bash scripts/deploy-all-chains.sh"
    fi
fi

# Create deployment summary
cat > "deployment-summary.txt" << EOF
Eagle Vault Deployment Summary
==============================
Date: $(date)
Networks: ${NETWORKS[*]}
Successful: ${successful_networks[*]}
Failed: ${failed_networks[*]}
Verification Failed: ${verification_failed[*]}

Status: $([ ${#failed_networks[@]} -eq 0 ] && [ ${#verification_failed[@]} -eq 0 ] && echo "SUCCESS" || echo "INCOMPLETE")
EOF

echo -e "\n${BLUE}📄 Summary saved to deployment-summary.txt${NC}"

# Exit with appropriate code
if [ ${#failed_networks[@]} -eq 0 ] && [ ${#verification_failed[@]} -eq 0 ]; then
    exit 0
else
    exit 1
fi
