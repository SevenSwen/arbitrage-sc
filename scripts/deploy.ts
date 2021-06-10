import { ethers } from 'hardhat'

async function main() {
  // We get the contract to deploy
  const ExternalSwapper = await ethers.getContractFactory("ExternalSwapper");
  console.log("Deploying...");
  const externalSwapper = await ExternalSwapper.deploy();
  console.log("Deployed to:", externalSwapper.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
