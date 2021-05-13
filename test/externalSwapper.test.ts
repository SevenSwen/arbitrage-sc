import { ethers, waffle } from 'hardhat'
import { BigNumber, BigNumberish, constants, utils } from 'ethers'
import { expect } from 'chai'
import { fixture } from "./shared/fixtures"

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
            token2,
            weth9,
            uniswapFactory,
            uniswapRouter,
            sushiswapFactory,
            sushiswapRouter,
            externalSwapper,
        } = await fixture([wallet], waffle.provider))
    })

    it('run flash loan (wbtc-dai)', async () => {
        await token0.approve(uniswapRouter.address, ethers.utils.parseEther('250000'))
        await token1.approve(uniswapRouter.address, ethers.utils.parseEther('10'))
        await uniswapRouter.addLiquidity(
            token0.address,
            token1.address,
            ethers.utils.parseEther('250000'), // 1 WBTC = 25000 DAI
            ethers.utils.parseEther('10'),
            0,
            0,
            alice.address,
            1623572523, // TODO: change to now
        )

        await token0.approve(sushiswapRouter.address, ethers.utils.parseEther('350000'))
        await token1.approve(sushiswapRouter.address, ethers.utils.parseEther('10'))
        await sushiswapRouter.addLiquidity(
            token0.address,
            token1.address,
            ethers.utils.parseEther('350000'), // 1 WBTC = 35,000 DAI
            ethers.utils.parseEther('10'),
            0,
            0,
            alice.address,
            1623572523, // TODO: change to now
        )
        expect(await token0.balanceOf(alice.address)).to.equal(ethers.utils.parseEther('0'))
        expect(await token1.balanceOf(alice.address)).to.equal(ethers.utils.parseEther('0'))

        await externalSwapper.flashLoan({
            tokenIn: token0.address,
            tokenOut: token1.address,
            factoryIn: uniswapFactory.address,
            routerOut: sushiswapRouter.address,
            amount: ethers.utils.parseEther('0.87'),
            deadline: 1623572523, // TODO: change to now
        })

        expect(await token0.balanceOf(alice.address)).to.equal(ethers.utils.parseEther('0'))
        const balance = await token1.balanceOf(alice.address);
        console.log('(swap 1 WBTC) DAI balance:', ethers.utils.formatEther(balance));
    })

    it('test', async () => {

    })
})
