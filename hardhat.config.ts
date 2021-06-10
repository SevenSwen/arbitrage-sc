import 'hardhat-typechain'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import "solidity-coverage"
import "hardhat-gas-reporter"
import './scripts/copy-uniswap-v3-artifacts.ts'
import "@nomiclabs/hardhat-etherscan"
import 'hardhat-deploy'
import 'hardhat-deploy-ethers'
import fs from 'fs';
import dotenv from 'dotenv'
dotenv.config()
const mnemonic = fs.readFileSync('.secret').toString().trim();

export default {
    networks: {
        hardhat: {
            allowUnlimitedContractSize: false,
        },
        mainnet: {
            url: `https://mainnet.infura.io/v3/${process.env.INFURA_ID}`,
            chainId: 1,
            gas: 800000,
            gasPrice: 7000000000,
            accounts: {mnemonic: mnemonic}
        },
        rinkeby: {
            url: `https://rinkeby.infura.io/v3/${process.env.INFURA_ID}`,
            accounts: {mnemonic: mnemonic}
        },
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },
    solidity: {
        version: '0.8.3',
        settings: {
            optimizer: {
                enabled: true,
                runs: 999999,
            },
            metadata: {
                // do not include the metadata hash, since this is machine dependent
                // and we want all generated code to be deterministic
                // https://docs.soliditylang.org/en/v0.7.6/metadata.html
                bytecodeHash: 'none',
            },
        },
    },
    namedAccounts: {
        deployer: 0,
    },
    paths: {
        sources: 'contracts',
    },
}
