// Mint test USDC to any address
// Usage: npx hardhat run scripts/mint-usdc.cjs --network localhost
// Set MINT_TO env var to target address, defaults to Anvil account #1

const hre = require("hardhat");

async function main() {
  const usdcAddress = process.env.NEXT_PUBLIC_USDC_CONTRACT;
  if (!usdcAddress) {
    console.error("Set NEXT_PUBLIC_USDC_CONTRACT in .env first");
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  const usdc = await hre.ethers.getContractAt("MockUSDC", usdcAddress, deployer);

  // Anvil default accounts to fund
  const targets = process.env.MINT_TO
    ? [process.env.MINT_TO]
    : [
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Anvil #1
        "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Anvil #2
        "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // Anvil #3
      ];

  const amount = hre.ethers.parseUnits("1000", 6); // 1000 USDC each

  for (const addr of targets) {
    await usdc.mint(addr, amount);
    const bal = await usdc.balanceOf(addr);
    console.log(`Minted 1000 USDC to ${addr} (balance: ${hre.ethers.formatUnits(bal, 6)} USDC)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
