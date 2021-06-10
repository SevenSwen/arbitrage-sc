// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.3;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IUniswapV2Callee} from '@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol';
import {IUniswapV2Router02} from '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import {IUniswapV2Pair} from '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import {IUniswapV2Factory} from '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';
import {TransferHelper} from '@uniswap/lib/contracts/libraries/TransferHelper.sol';

contract ExternalSwapper is IUniswapV2Callee, Ownable {
    struct InputPackage {
        address tokenIn;
        address tokenOut;
        address pair;
        address routerOut;
        uint256 amountRequired;
        uint256 amount;
        uint256 deadline;
    }

    struct ParamsLoan {
        address pair;
        address token0;
        address token1;
        uint256 amount0;
        uint256 amount1;
        bytes data;
    }

    struct ParamsCallback {
        address pairIn;
        address pairOut;
        uint256 amount;
        uint256 amountRequired;
    }

    address private _permissionedPairAddress = address(0);

    modifier ensure(uint deadline) {
        require(deadline >= block.timestamp, 'deadline');
        _;
    }

    receive() external payable {}

    function getReward(IERC20 token) external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        token.transfer(msg.sender, balance);
    }

    function flashLoan(InputPackage calldata package) external ensure(package.deadline) {
        address _pairAddress = package.pair;
        IUniswapV2Pair _pair = IUniswapV2Pair(_pairAddress);

        _permissionedPairAddress = _pairAddress;
        ParamsLoan memory params;
        params.pair = _pairAddress;
        (params.token0, params.token1) = (_pair.token0(), _pair.token1());
        (params.amount0, params.amount1) = package.tokenIn == params.token0
            ? (package.amount, uint256(0))
            : (uint256(0), package.amount);
        params.data = abi.encode(package.routerOut, package.amountRequired);

        _pair.swap(params.amount0, params.amount1, address(this), params.data);
    }

    function uniswapV2Call(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external override {
        assert(sender == address(this));
        assert(msg.sender == _permissionedPairAddress);

        ParamsCallback memory _params;
        address routerOutAddress;
        (routerOutAddress, _params.amountRequired) = abi.decode(data, (address, uint256));

        _params.pairIn = msg.sender;
        IUniswapV2Pair pair = IUniswapV2Pair(_params.pairIn);

        address[] memory _path = new address[](2);
        if (amount0 == 0) {
            _path[0] = pair.token1();
            _path[1] = pair.token0();
            _params.amount = amount1;
        } else {
            _path[0] = pair.token0();
            _path[1] = pair.token1();
            _params.amount = amount0;
        }

        IUniswapV2Router02 routerOut = IUniswapV2Router02(routerOutAddress);
        _params.pairOut = IUniswapV2Factory(routerOut.factory()).getPair(_path[0], _path[1]);
        uint256 _amountReceived = routerOut.getAmountsOut(_params.amount, _path)[1];
        TransferHelper.safeTransfer(_path[0], _params.pairOut, _params.amount);
        (uint256 amount0Out, uint256 amount1Out) =
            _path[0] == pair.token0() ? (uint256(0), _amountReceived) : (_amountReceived, uint256(0));
        IUniswapV2Pair(_params.pairOut).swap(amount0Out, amount1Out, address(this), new bytes(0));
        require(_amountReceived > _params.amountRequired, 'profit < 0');
        TransferHelper.safeTransfer(_path[1], _params.pairIn, _params.amountRequired);
    }
}
