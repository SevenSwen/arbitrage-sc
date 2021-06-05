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
        await token1.approve(uniswapRouter.address, ethers.utils.parseUnits('10', '9'))
        await uniswapRouter.addLiquidity(
            token0.address,
            token1.address,
            ethers.utils.parseEther('250000'), // 1 WBTC = 25000 DAI
            ethers.utils.parseUnits('10', '9'),
            0,
            0,
            alice.address,
            1923572523, // TODO: change to now
        )

        await token0.approve(sushiswapRouter.address, ethers.utils.parseEther('350000'))
        await token1.approve(sushiswapRouter.address, ethers.utils.parseUnits('10', '9'))
        await sushiswapRouter.addLiquidity(
            token0.address,
            token1.address,
            ethers.utils.parseEther('350000'), // 1 WBTC = 35,000 DAI
            ethers.utils.parseUnits('10', '9'),
            0,
            0,
            alice.address,
            1923572523, // TODO: change to now
        )
        expect(await token0.balanceOf(externalSwapper.address)).to.equal(ethers.utils.parseEther('0'))
        expect(await token1.balanceOf(externalSwapper.address)).to.equal(ethers.utils.parseEther('0'))

        const amount = ethers.utils.parseUnits('0.87', '9');
        const amountRequired = (await uniswapRouter.getAmountsIn(amount, [token0.address, token1.address]))[0];

        await externalSwapper.connect(alice).flashLoan({
            tokenIn: token1.address,
            tokenOut: token0.address,
            pair: await uniswapFactory.getPair(token0.address, token1.address),
            routerOut: sushiswapRouter.address,
            amountRequired: amountRequired,
            amount: amount,
            deadline: 1923572523, // TODO: change to now
        })

        expect(await token1.balanceOf(externalSwapper.address)).to.equal(ethers.utils.parseEther('0'))
        const balance = await token0.balanceOf(externalSwapper.address);
        console.log('profit:', ethers.utils.formatEther(balance));
    })

    it('test', async () => {
        await token0.approve(uniswapRouter.address, ethers.utils.parseEther('479096246133.332078885965615880'))
        await token1.approve(uniswapRouter.address, ethers.utils.parseEther('2035.106916166573058792'))
        await uniswapRouter.addLiquidity(
            token0.address,
            token1.address,
            ethers.utils.parseEther('479096246133.332078885965615880'),
            ethers.utils.parseEther('2035.106916166573058792'),
            0,
            0,
            alice.address,
            1923572523, // TODO: change to now
        )

        await token0.approve(sushiswapRouter.address, ethers.utils.parseEther('50340792.388814552382923537'))
        await token1.approve(sushiswapRouter.address, ethers.utils.parseEther('0.091072766630374925'))
        await sushiswapRouter.addLiquidity(
            token0.address,
            token1.address,
            ethers.utils.parseEther('50340792.388814552382923537'),
            ethers.utils.parseEther('0.091072766630374925'),
            0,
            0,
            alice.address,
            1923572523, // TODO: change to now
        )
        expect(await token0.balanceOf(externalSwapper.address)).to.equal(ethers.utils.parseEther('0'))
        expect(await token1.balanceOf(externalSwapper.address)).to.equal(ethers.utils.parseEther('0'))

        const amount = ethers.utils.parseEther('17402539.933738453216109790');
        const amountRequired = (await sushiswapRouter.getAmountsIn(amount, [token1.address, token0.address]))[0];

        await externalSwapper.connect(alice).flashLoan({
            tokenIn: token0.address,
            tokenOut: token1.address,
            pair: await sushiswapFactory.getPair(token0.address, token1.address),
            routerOut: uniswapRouter.address,
            amountRequired: amountRequired,
            amount: amount,
            deadline: 1923572523, // TODO: change to now
        })

        expect(await token0.balanceOf(externalSwapper.address)).to.equal(ethers.utils.parseEther('0'))
        const balance = await token1.balanceOf(externalSwapper.address);
        console.log('profit:', ethers.utils.formatEther(balance));
    })
})
