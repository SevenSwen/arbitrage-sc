// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.3;

import {IUniswapV2Callee} from '@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol';
import {IUniswapV2Router02} from '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import {IUniswapV2Pair} from '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import {TransferHelper} from '@uniswap/lib/contracts/libraries/TransferHelper.sol';

contract ExternalSwapper is IUniswapV2Callee {
    struct InputPackage {
        address tokenIn;
        address tokenOut;
        address factoryIn;
        address routerOut;
        uint256 amount;
        uint256 deadline;
    }

    struct Params {
        address pair;
        address token0;
        address token1;
        uint256 amount0;
        uint256 amount1;
        bytes data;
    }

    address private _permissionedPairAddress = address(0);

    constructor() {}

    receive() external payable {}

    function flashLoan(InputPackage calldata package) external {
        _permissionedPairAddress = address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            hex'ff',
                            package.factoryIn,
                            keccak256(abi.encodePacked(package.tokenIn, package.tokenOut)),
                            hex'96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f' // init code hash
                        )
                    )
                )
            )
        );
        Params memory params;
        params.pair = _permissionedPairAddress;
        (params.token0, params.token1) = package.tokenIn < package.tokenOut
            ? (package.tokenIn, package.tokenOut)
            : (package.tokenOut, package.tokenIn);
        params.amount0 = package.tokenIn == params.token0 ? package.amount : 0;
        params.amount1 = package.tokenIn == params.token1 ? package.amount : 0;
        params.data = abi.encode(package.routerOut, package.deadline);

        IUniswapV2Pair(params.pair).swap(params.amount0, params.amount1, address(this), params.data);
    }

    function uniswapV2Call(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external override {
        assert(sender == address(this));
        assert(msg.sender == _permissionedPairAddress);

        (address routerOut, uint256 deadline) = abi.decode(data, (address, uint256));

        Params memory params;
        params.pair = msg.sender;
        IUniswapV2Pair pair = IUniswapV2Pair(params.pair);
        params.token0 = pair.token0();
        params.token1 = pair.token1();
        address[] memory _path = new address[](2);

        if (amount0 == 0) {
            _path[0] = params.token1;
            _path[1] = params.token0;
            params.amount0 = amount1;
        } else {
            _path[0] = params.token1;
            _path[1] = params.token0;
            params.amount0 = amount0;
        }

        TransferHelper.safeApprove(_path[0], routerOut, params.amount0);
        uint256 amountRequired;
        {
            (uint256 reserve0, uint256 reserve1, ) = pair.getReserves();
            (uint256 reserveA, uint256 reserveB) =
                _path[1] == params.token0 ? (reserve0, reserve1) : (reserve1, reserve0); // TODO: may be replace reserve0, reserve1
            uint256 numerator = reserveA * params.amount0 * 1000;
            uint256 denominator = (reserveB - params.amount0) * 997;
            amountRequired = (numerator / denominator) + 1;
        }
        uint256 amountReceived =
            IUniswapV2Router02(routerOut).swapExactTokensForTokens(
                params.amount0,
                0,
                _path,
                address(this),
                block.timestamp + deadline
            )[1];
        require(amountReceived > amountRequired, 'profit < 0');
        TransferHelper.safeTransfer(_path[1], params.pair, amountRequired);
    }
}
