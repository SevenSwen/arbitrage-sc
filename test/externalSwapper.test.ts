import { ethers, waffle } from 'hardhat'
import { BigNumber, BigNumberish, constants } from 'ethers'
import { expect } from 'chai'
import { swapperFixture, tokensFixture, uniswapFixture} from "./shared/fixtures"

import {ExternalSwapper, UniswapV2Factory, UniswapV2Router02, WETH9, MockERC20} from '../typechain'

const createFixtureLoader = waffle.createFixtureLoader

describe('test', () => {
    const [wallet, alice, other] = waffle.provider.getWallets()

    let uniswapFactory: UniswapV2Factory
    let sushiswapFactory: UniswapV2Factory
    let weth9: WETH9
    let uniswapRouter: UniswapV2Router02
    let sushiswapRouter: UniswapV2Router02
    let externalSwapper: ExternalSwapper
    let token0: MockERC20
    let token1: MockERC20
    let token2: MockERC20

    let loadFixture: ReturnType<typeof createFixtureLoader>

    before('create fixture loader', async () => {
        loadFixture = createFixtureLoader([wallet])
    })

    beforeEach('deploy contracts', async () => {
        ({
            token0,
            token1,
            token2
        } = await tokensFixture([wallet], waffle.provider))

    //     ({externalSwapper} = await swapperFixture([wallet], waffle.provider))
    //     ({
    //         weth9,
    //         uniswapFactory,
    //         uniswapRouter,
    //         sushiswapFactory,
    //         sushiswapRouter
    //     } = await uniswapFixture([wallet], waffle.provider))
    })

    it('test', async () => {

    })
})
