#!/bin/bash
# ============================================================
# Deploy SignalBond + MockUSDC to Arc Testnet
#
# Prerequisites:
#   1. Get test USDC from https://faucet.circle.com
#      - Connect wallet, select "Arc Testnet", request funds
#   2. Export your private key:
#      export PRIVATE_KEY="0x..."
#
# Usage:
#   chmod +x scripts/deploy-arc.sh
#   ./scripts/deploy-arc.sh
# ============================================================

set -e
cd "$(dirname "$0")/.."

source ~/.zshenv 2>/dev/null || true

RPC="https://rpc.testnet.arc.network"
PRIVATE_KEY="${PRIVATE_KEY:?Error: export PRIVATE_KEY=0x... first}"

DEPLOYER=$(cast wallet address "$PRIVATE_KEY" 2>/dev/null)
echo "Deployer: $DEPLOYER"
echo "RPC:      $RPC"
echo ""

# Check balance
BAL=$(cast balance $DEPLOYER --rpc-url $RPC 2>/dev/null)
echo "Balance:  $BAL wei"
if [ "$BAL" = "0" ]; then
  echo ""
  echo "ERROR: No balance! Get test USDC from https://faucet.circle.com"
  echo "  1. Go to https://faucet.circle.com"
  echo "  2. Connect wallet or paste address: $DEPLOYER"
  echo "  3. Select 'Arc Testnet'"
  echo "  4. Request funds"
  echo "  5. Re-run this script"
  exit 1
fi

echo ""
echo "=== Deploying MockUSDC ==="
USDC_ADDR=$(forge create contracts/MockUSDC.sol:MockUSDC \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['deployedTo'])")
echo "MockUSDC: $USDC_ADDR"

echo ""
echo "=== Deploying SignalBond ==="
SB_ADDR=$(forge create contracts/SignalBond.sol:SignalBond \
  --rpc-url $RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --constructor-args $USDC_ADDR $DEPLOYER \
  --json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['deployedTo'])")
echo "SignalBond: $SB_ADDR"

echo ""
echo "=== Minting 10,000 test USDC to deployer ==="
cast send $USDC_ADDR "mint(address,uint256)" $DEPLOYER 10000000000 \
  --rpc-url $RPC --private-key $PRIVATE_KEY 2>&1 | grep "status"

echo ""
echo "=== Approving SignalBond contract ==="
cast send $USDC_ADDR "approve(address,uint256)" $SB_ADDR \
  $(python3 -c "print(2**256-1)") \
  --rpc-url $RPC --private-key $PRIVATE_KEY 2>&1 | grep "status"

echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "============================================"
echo ""
echo "Update your .env with:"
echo ""
echo "NEXT_PUBLIC_SIGNALBOND_CONTRACT=$SB_ADDR"
echo "NEXT_PUBLIC_USDC_CONTRACT=$USDC_ADDR"
echo "ARC_OPERATOR_PRIVATE_KEY=$PRIVATE_KEY"
echo "ARC_ENABLED=true"
echo ""
echo "Explorer:"
echo "  MockUSDC:   https://testnet.arcscan.app/address/$USDC_ADDR"
echo "  SignalBond: https://testnet.arcscan.app/address/$SB_ADDR"
echo ""
echo "Then restart: npm run dev -- -p 4556"
