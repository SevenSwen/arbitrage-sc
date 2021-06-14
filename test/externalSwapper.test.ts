import { ethers, waffle } from 'hardhat'
import { BigNumber, BigNumberish, constants, utils } from 'ethers'
import { expect } from 'chai'
import { fixture } from "./shared/fixtures"

import {ExternalSwapper, UniswapV2Factory, UniswapV2Router02, WETH9, MockERC20} from '../typechain'

const createFixtureLoader = waffle.createFixtureLoader

describe('test', () => {
    const [wallet, alice, bob, other] = waffle.provider.getWallets()

    let uniswapFactory: UniswapV2Factory
    let sushiswapFactory: UniswapV2Factory
    let weth9: WETH9
    let uniswapRouter: UniswapV2Router02
    let sushiswapRouter: UniswapV2Router02
    let externalSwapper: ExternalSwapper
    let token0: MockERC20
    let token1: MockERC20
    let token2: MockERC20
    let now: number

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
        now = (new Date()).getTime() / 1000 | 0
        await uniswapRouter.addLiquidity(
            token0.address,
            token1.address,
            ethers.utils.parseEther('250000'), // 1 WBTC = 25000 DAI
            ethers.utils.parseUnits('10', '9'),
            0,
            0,
            alice.address,
            BigNumber.from(now + 60),
        )

        await token0.approve(sushiswapRouter.address, ethers.utils.parseEther('350000'))
        await token1.approve(sushiswapRouter.address, ethers.utils.parseUnits('10', '9'))
        now = (new Date()).getTime() / 1000 | 0
        await sushiswapRouter.addLiquidity(
            token0.address,
            token1.address,
            ethers.utils.parseEther('350000'), // 1 WBTC = 35,000 DAI
            ethers.utils.parseUnits('10', '9'),
            0,
            0,
            alice.address,
            BigNumber.from(now + 60),
        )
        expect(await token0.balanceOf(externalSwapper.address)).to.equal(ethers.utils.parseEther('0'))
        expect(await token1.balanceOf(externalSwapper.address)).to.equal(ethers.utils.parseEther('0'))

        const amount = ethers.utils.parseUnits('0.87', '9');
        const amountRequired = (await uniswapRouter.getAmountsIn(amount, [token0.address, token1.address]))[0];

        now = (new Date()).getTime() / 1000 | 0
        await externalSwapper.setBackend(bob.address)
        await externalSwapper.connect(bob).flashLoan({
            tokenIn: token1.address,
            tokenOut: token0.address,
            pair: await uniswapFactory.getPair(token0.address, token1.address),
            routerOut: sushiswapRouter.address,
            amountRequired: amountRequired,
            amount: amount,
            deadline: BigNumber.from(now + 60),
        })

        expect(await token1.balanceOf(externalSwapper.address)).to.equal(ethers.utils.parseEther('0'))
        const balance = await token0.balanceOf(externalSwapper.address);
        console.log('profit:', ethers.utils.formatEther(balance));
    })

    // https://etherscan.io/tx/0x3f909b671aeb3a528cb8104d99579765b739c2babcd7e8f5835c9a1855fc9523
    it('test from real tx (flashLoan)', async () => {
        await token0.approve(uniswapRouter.address, ethers.utils.parseEther('479096246133.332078885965615880'))
        await token1.approve(uniswapRouter.address, ethers.utils.parseEther('2035.106916166573058792'))
        now = (new Date()).getTime() / 1000 | 0
        await uniswapRouter.addLiquidity(
            token0.address,
            token1.address,
            ethers.utils.parseEther('479096246133.332078885965615880'),
            ethers.utils.parseEther('2035.106916166573058792'),
            0,
            0,
            alice.address,
            BigNumber.from(now + 60),
        )

        await token0.approve(sushiswapRouter.address, ethers.utils.parseEther('50340792.388814552382923537'))
        await token1.approve(sushiswapRouter.address, ethers.utils.parseEther('0.091072766630374925'))
        now = (new Date()).getTime() / 1000 | 0
        await sushiswapRouter.addLiquidity(
            token0.address,
            token1.address,
            ethers.utils.parseEther('50340792.388814552382923537'),
            ethers.utils.parseEther('0.091072766630374925'),
            0,
            0,
            alice.address,
            BigNumber.from(now + 60),
        )
        expect(await token0.balanceOf(externalSwapper.address)).to.equal(ethers.utils.parseEther('0'))
        expect(await token1.balanceOf(externalSwapper.address)).to.equal(ethers.utils.parseEther('0'))

        const amount = ethers.utils.parseEther('17402539.933738453216109790');
        const amountRequired = (await sushiswapRouter.getAmountsIn(amount, [token1.address, token0.address]))[0];
        now = (new Date()).getTime() / 1000 | 0
        await externalSwapper.setBackend(bob.address)
        await externalSwapper.connect(bob).flashLoan({
            tokenIn: token0.address,
            tokenOut: token1.address,
            pair: await sushiswapFactory.getPair(token0.address, token1.address),
            routerOut: uniswapRouter.address,
            amountRequired: amountRequired,
            amount: amount,
            deadline: BigNumber.from(now + 60),
        })

        expect(await token0.balanceOf(externalSwapper.address)).to.equal(ethers.utils.parseEther('0'))
        const balance = await token1.balanceOf(externalSwapper.address);
        console.log('profit:', ethers.utils.formatEther(balance));
    })

    // https://etherscan.io/tx/0xc21363337c9bb52d3038bfcd120d61eeec73942ba1463baf6a02956271dfab40
    it('test from real tx (multiSwap)', async () => {
        await token0.approve(uniswapRouter.address, ethers.utils.parseEther('3753002.738921300505782258'))
        await token1.approve(uniswapRouter.address, ethers.utils.parseEther('79.389201604508242487'))
        now = (new Date()).getTime() / 1000 | 0
        await uniswapRouter.addLiquidity(
            token0.address,
            token1.address,
            ethers.utils.parseEther('3753002.738921300505782258'),
            ethers.utils.parseEther('79.389201604508242487'),
            0,
            0,
            alice.address,
            BigNumber.from(now + 60),
        )

        await token0.approve(sushiswapRouter.address, ethers.utils.parseEther('17002728.918517552694596352'))
        await token1.approve(sushiswapRouter.address, ethers.utils.parseEther('373.743792711080418675'))
        now = (new Date()).getTime() / 1000 | 0
        await sushiswapRouter.addLiquidity(
            token0.address,
            token1.address,
            ethers.utils.parseEther('17002728.918517552694596352'),
            ethers.utils.parseEther('373.743792711080418675'),
            0,
            0,
            alice.address,
            BigNumber.from(now + 60),
        )
        expect(await token0.balanceOf(externalSwapper.address)).to.equal(ethers.utils.parseEther('0'))
        expect(await token1.balanceOf(externalSwapper.address)).to.equal(ethers.utils.parseEther('0'))

        const amount = ethers.utils.parseEther('1.058427570000000128')
        await token1.transfer(bob.address, amount)
        await token1.connect(bob).approve(externalSwapper.address, amount)

        const amountUniRequired = (await uniswapRouter.getAmountsOut(amount, [token1.address, token0.address]))[1];
        const amountSushiRequired = (await sushiswapRouter.getAmountsOut(amountUniRequired, [token0.address, token1.address]))[1];

        const pairUni = await uniswapFactory.getPair(token0.address, token1.address)
        const pairSushi = await sushiswapFactory.getPair(token0.address, token1.address)
        now = (new Date()).getTime() / 1000 | 0

        await externalSwapper.setBackend(bob.address)
        await externalSwapper.connect(bob).multiSwap({
            amountIn: amount,
            tokenIn: token1.address,
            pairs: [pairUni, pairSushi],
            amountsOut: [amountUniRequired, amountSushiRequired],
            deadline: BigNumber.from(now + 60),
        })

        expect(await token1.balanceOf(externalSwapper.address)).to.equal(ethers.utils.parseEther('0'))
        const balance = await token0.balanceOf(externalSwapper.address);
        console.log('profit:', ethers.utils.formatEther(balance));
    })

    it('test gerReward functions', async () => {
        expect(await token0.balanceOf(externalSwapper.address)).to.equal(ethers.utils.parseEther('0'))
        expect(await waffle.provider.getBalance(externalSwapper.address)).to.equal(ethers.utils.parseEther('0'))

        await token0.transfer(externalSwapper.address, ethers.utils.parseEther('100'))
        await wallet.sendTransaction({
            to: externalSwapper.address,
            value: ethers.utils.parseEther("1.0")
        })

        expect(await token0.balanceOf(externalSwapper.address)).to.equal(ethers.utils.parseEther('100'))
        expect(await waffle.provider.getBalance(externalSwapper.address)).to.equal(ethers.utils.parseEther('1.0'))

        await externalSwapper["getReward(address)"](token0.address);
        await externalSwapper["getReward(uint256)"](ethers.utils.parseEther('1.0'))

        expect(await token0.balanceOf(externalSwapper.address)).to.equal(ethers.utils.parseEther('0'))
        expect(await waffle.provider.getBalance(externalSwapper.address)).to.equal(ethers.utils.parseEther('0'))
    })
})
