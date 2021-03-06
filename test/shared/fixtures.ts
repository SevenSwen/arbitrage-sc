import { abi as FACTORY_V2_ABI, bytecode as FACTORY_V2_BYTECODE } from '@uniswap/v2-core/build/UniswapV2Factory.json'
import { abi as ROUTER_V2_ABI, bytecode as ROUTER_V2_BYTECODE } from '@uniswap/v2-periphery/build/UniswapV2Router02.json'
import { bytecode as FACTORY_S_BYTECODE } from '@sushiswap/core/deployments/rinkeby/UniswapV2Factory.json'
import { bytecode as ROUTER_S_BYTECODE } from '@sushiswap/core/deployments/rinkeby/UniswapV2Router02.json'
import { abi as WETH9_ABI, bytecode as WETH9_BYTECODE } from '@uniswap/v2-periphery/build/WETH9.json'
import { ethers, waffle } from 'hardhat'
import { Fixture } from 'ethereum-waffle'
import {BigNumber, Wallet} from 'ethers'

import { Contract } from '@ethersproject/contracts'
import { constants } from 'ethers'

import {
    WETH9,
    ExternalSwapper,
    MockERC20, UniswapV2Factory, UniswapV2Router02
} from '../../typechain'

interface UniswapFixture {
    weth9: WETH9,
    uniswapFactory: UniswapV2Factory,
    uniswapRouter: UniswapV2Router02,
    sushiswapFactory: UniswapV2Factory,
    sushiswapRouter: UniswapV2Router02
}

async function uniswapFixture(wallets: Wallet[]): Promise<UniswapFixture> {
    const [wallet] = wallets
    const weth9 = (await waffle.deployContract(wallet, {
        bytecode: WETH9_BYTECODE,
        abi: WETH9_ABI,
    })) as WETH9

    const uniswapFactory = await waffle.deployContract(
        wallet,
        {
            bytecode: FACTORY_V2_BYTECODE,
            abi: FACTORY_V2_ABI,
        },
        [wallet.address]
    ) as UniswapV2Factory

    const uniswapRouter = await waffle.deployContract(
        wallet,
        {
            bytecode: ROUTER_V2_BYTECODE,
            abi: ROUTER_V2_ABI,
        },
        [uniswapFactory.address, weth9.address]
    ) as UniswapV2Router02

    const sushiswapFactory = await waffle.deployContract(
        wallet,
        {
            bytecode: FACTORY_S_BYTECODE,
            abi: FACTORY_V2_ABI,
        },
        [wallet.address]
    ) as UniswapV2Factory

    const sushiswapRouter = await waffle.deployContract(
        wallet,
        {
            bytecode: ROUTER_S_BYTECODE,
            abi: ROUTER_V2_ABI,
        },
        [sushiswapFactory.address, weth9.address]
    ) as UniswapV2Router02

    return { weth9, uniswapFactory, uniswapRouter, sushiswapFactory, sushiswapRouter }
}

interface SwapperFixture {
    externalSwapper: ExternalSwapper
}

async function swapperFixture(): Promise<SwapperFixture> {
    const externalSwapperFactory = await ethers.getContractFactory('ExternalSwapper')
    const externalSwapper = (await externalSwapperFactory.deploy()) as ExternalSwapper

    return { externalSwapper }
}

interface TokensFixture {
    token0: MockERC20
    token1: MockERC20
    token2: MockERC20
}

async function tokensFixture(): Promise<TokensFixture> {
    const tokenFactory = await ethers.getContractFactory('MockERC20')
    const tokenA = (await tokenFactory.deploy(BigNumber.from(2).pow(255))) as MockERC20
    const tokenB = (await tokenFactory.deploy(BigNumber.from(2).pow(255))) as MockERC20
    const tokenC = (await tokenFactory.deploy(BigNumber.from(2).pow(255))) as MockERC20

    const [token0, token1, token2] = [tokenA, tokenB, tokenC].sort((tokenA, tokenB) =>
        tokenA.address.toLowerCase() < tokenB.address.toLowerCase() ? -1 : 1
    )

    return { token0, token1, token2 }
}

type allContractsFixture = UniswapFixture & TokensFixture & SwapperFixture

export const fixture: Fixture<allContractsFixture> = async function ([wallet]): Promise<allContractsFixture> {
    const { weth9, uniswapFactory, uniswapRouter, sushiswapFactory, sushiswapRouter } = await uniswapFixture([wallet])
    const { token0, token1, token2 } = await tokensFixture()
    const { externalSwapper } = await swapperFixture()

    return {
        token0,
        token1,
        token2,
        weth9,
        uniswapFactory,
        uniswapRouter,
        sushiswapFactory,
        sushiswapRouter,
        externalSwapper,
    }
}
