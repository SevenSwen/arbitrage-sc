import { BigNumber } from 'ethers'
import { ethers } from 'hardhat'

import { ExternalSwapper } from '../../typechain'
import { MockERC20 } from '../../typechain'

import { Fixture } from 'ethereum-waffle'

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

type allContractsFixture = SwapperFixture & TokensFixture


export const fixture: Fixture<allContractsFixture> = async function (): Promise<allContractsFixture> {
    const { externalSwapper } = await swapperFixture()
    const { token0, token1, token2 } = await tokensFixture()

    return {
        token0,
        token1,
        token2,
        externalSwapper,
    }
}
