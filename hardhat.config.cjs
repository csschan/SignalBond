require("@nomicfoundation/hardhat-toolbox");

const DEPLOYER_KEY = process.env.ARC_OPERATOR_PRIVATE_KEY || "0x417a91b4ef698301c946bfe5d98559f329ba143da7b6d70aa491a5ba79eab2c5";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    // Local Anvil node simulating Arc
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // Arc Testnet (when available)
    arcTestnet: {
      url: "https://rpc-testnet.arc.network",
      chainId: 1244,
      accounts: [DEPLOYER_KEY],
    },
  },
  paths: {
    sources: "./contracts",
    cache: "./cache_hardhat",
    artifacts: "./artifacts",
  },
};
