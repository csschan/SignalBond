#!/bin/bash
# Deploy SignalBond contract to Arc Testnet
#
# Prerequisites:
#   1. Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup
#   2. Set environment variables:
#      export PRIVATE_KEY="your_deployer_private_key"
#      export ARC_RPC_URL="https://rpc-testnet.arc.network"
#   3. Get testnet USDC from Arc faucet
#
# Usage:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh

set -e

ARC_RPC_URL="${ARC_RPC_URL:-https://rpc-testnet.arc.network}"
TREASURY_ADDRESS="${TREASURY_ADDRESS:-$DEPLOYER_ADDRESS}"

if [ -z "$PRIVATE_KEY" ]; then
  echo "Error: PRIVATE_KEY not set"
  echo "Export your deployer private key: export PRIVATE_KEY=0x..."
  exit 1
fi

echo "=== Deploying SignalBond to Arc Testnet ==="
echo "RPC: $ARC_RPC_URL"

# Navigate to contracts dir
cd "$(dirname "$0")/../contracts"

# If USDC_ADDRESS is not set, deploy a mock USDC for testing
if [ -z "$USDC_ADDRESS" ]; then
  echo ""
  echo "--- Deploying Mock USDC (for testnet) ---"
  USDC_ADDRESS=$(forge create MockUSDC.sol:MockUSDC \
    --rpc-url "$ARC_RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --json | jq -r '.deployedTo')
  echo "Mock USDC deployed: $USDC_ADDRESS"
fi

# Get deployer address for treasury
DEPLOYER_ADDRESS=$(cast wallet address "$PRIVATE_KEY")
TREASURY="${TREASURY_ADDRESS:-$DEPLOYER_ADDRESS}"

echo ""
echo "--- Deploying SignalBond ---"
echo "USDC: $USDC_ADDRESS"
echo "Treasury: $TREASURY"

SIGNALBOND_ADDRESS=$(forge create SignalBond.sol:SignalBond \
  --rpc-url "$ARC_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --constructor-args "$USDC_ADDRESS" "$TREASURY" \
  --json | jq -r '.deployedTo')

echo ""
echo "=== Deployment Complete ==="
echo "SignalBond: $SIGNALBOND_ADDRESS"
echo "USDC:       $USDC_ADDRESS"
echo "Treasury:   $TREASURY"
echo ""
echo "Add these to your .env file:"
echo "  NEXT_PUBLIC_SIGNALBOND_CONTRACT=$SIGNALBOND_ADDRESS"
echo "  NEXT_PUBLIC_USDC_CONTRACT=$USDC_ADDRESS"
echo "  ARC_ENABLED=true"
echo "  ARC_OPERATOR_PRIVATE_KEY=$PRIVATE_KEY"
