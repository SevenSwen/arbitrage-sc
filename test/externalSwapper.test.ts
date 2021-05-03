import { ethers, waffle } from 'hardhat'
import { BigNumber, BigNumberish, constants } from 'ethers'
import { expect } from 'chai'
import {fixture} from "./shared/fixtures"

import { ExternalSwapper } from '../typechain'
import { MockERC20 } from '../typechain'

const createFixtureLoader = waffle.createFixtureLoader

describe('test', () => {
    const [wallet, alice, other] = waffle.provider.getWallets()

    let externalSwapper: ExternalSwapper
    let token0: MockERC20
    let token1: MockERC20
    let token2: MockERC20


    let loadFixture: ReturnType<typeof createFixtureLoader>
    before('create fixture loader', async () => {
        loadFixture = createFixtureLoader([wallet, other])
    })

    beforeEach('deploy contracts', async () => {
        ({token0, token1, token2, externalSwapper} = await loadFixture(fixture))
    })

    it('test', async () => {
    })
})
