// Deploy SignalBond + MockUSDC to local Anvil node
// Usage: npx hardhat run scripts/deploy-local.cjs --network localhost

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");

  // 1. Deploy MockUSDC
  console.log("\n--- Deploying MockUSDC ---");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("MockUSDC deployed:", usdcAddress);

  // 2. Deploy SignalBond
  console.log("\n--- Deploying SignalBond ---");
  const SignalBond = await hre.ethers.getContractFactory("SignalBond");
  const signalBond = await SignalBond.deploy(usdcAddress, deployer.address);
  await signalBond.waitForDeployment();
  const signalBondAddress = await signalBond.getAddress();
  console.log("SignalBond deployed:", signalBondAddress);

  // 3. Mint test USDC to deployer (acts as agent)
  console.log("\n--- Minting test USDC ---");
  const mintAmount = hre.ethers.parseUnits("10000", 6); // 10,000 USDC
  await usdc.mint(deployer.address, mintAmount);
  console.log("Minted 10,000 USDC to deployer:", deployer.address);

  // 4. Approve SignalBond to spend deployer's USDC (for agent bond)
  await usdc.approve(signalBondAddress, hre.ethers.MaxUint256);
  console.log("Approved SignalBond to spend deployer USDC");

  // 5. Print env config
  console.log("\n========================================");
  console.log("Add these to your .env file:");
  console.log("========================================");
  console.log(`NEXT_PUBLIC_SIGNALBOND_CONTRACT=${signalBondAddress}`);
  console.log(`NEXT_PUBLIC_USDC_CONTRACT=${usdcAddress}`);
  console.log(`ARC_OPERATOR_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`);
  console.log(`ARC_ENABLED=true`);
  console.log("========================================");
  console.log("\nAnvil default account #0:");
  console.log("Address:  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  console.log("Key:      0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  console.log("USDC:     10,000");
  console.log("\nImport this key into MetaMask and add network:");
  console.log("  Network: Localhost 8545");
  console.log("  RPC:     http://127.0.0.1:8545");
  console.log("  Chain:   31337");
  console.log("  Token:   ETH");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
