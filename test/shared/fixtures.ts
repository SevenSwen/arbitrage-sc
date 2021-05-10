import { abi as FACTORY_V2_ABI, bytecode as FACTORY_V2_BYTECODE } from '@uniswap/v2-core/build/UniswapV2Factory.json'
import { abi as ROUTER_V2_ABI, bytecode as ROUTER_V2_BYTECODE } from '@uniswap/v2-periphery/build/UniswapV2Router02.json'
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

export const uniswapFixture: Fixture<UniswapFixture> = async ([wallet]) => {
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
            bytecode: FACTORY_V2_BYTECODE,
            abi: FACTORY_V2_ABI,
        },
        [wallet.address]
    ) as UniswapV2Factory

    const sushiswapRouter = await waffle.deployContract(
        wallet,
        {
            bytecode: ROUTER_V2_BYTECODE,
            abi: ROUTER_V2_ABI,
        },
        [uniswapFactory.address, weth9.address]
    ) as UniswapV2Router02

    return { weth9, uniswapFactory, uniswapRouter, sushiswapFactory, sushiswapRouter }
}

interface SwapperFixture {
    externalSwapper: ExternalSwapper
}

export const swapperFixture: Fixture<SwapperFixture> = async ([wallet]) => {
    const externalSwapperFactory = await ethers.getContractFactory('ExternalSwapper')
    const externalSwapper = (await externalSwapperFactory.deploy()) as ExternalSwapper

    return { externalSwapper }
}

interface TokensFixture {
    token0: MockERC20
    token1: MockERC20
    token2: MockERC20
}

export const tokensFixture: Fixture<TokensFixture> = async ([wallet]) => {
    const tokenFactory = await ethers.getContractFactory('MockERC20')
    const tokenA = (await tokenFactory.deploy(BigNumber.from(2).pow(255))) as MockERC20
    const tokenB = (await tokenFactory.deploy(BigNumber.from(2).pow(255))) as MockERC20
    const tokenC = (await tokenFactory.deploy(BigNumber.from(2).pow(255))) as MockERC20

    const [token0, token1, token2] = [tokenA, tokenB, tokenC].sort((tokenA, tokenB) =>
        tokenA.address.toLowerCase() < tokenB.address.toLowerCase() ? -1 : 1
    )

    return { token0, token1, token2 }
}
