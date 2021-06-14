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
    struct InputFlashLoanPackage {
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

    struct InputMultiSwapPackage {
        uint256 amountIn;
        address tokenIn;
        address[] pairs;
        uint256[] amountsOut;
        uint256 deadline;
    }

    struct ParamsMultiSwap {
        uint256 length;
        address tokenIn;
        uint256 amountIn;
        address tokenOut;
        uint256 amountOut;
    }

    struct ParamsCallback {
        address pairIn;
        address pairOut;
        uint256 amount;
        uint256 amountRequired;
    }

    address private _permissionedPairAddress;
    address private _backend;

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, 'deadline');
        _;
    }

    modifier onlyBackend() {
        require(msg.sender == _backend, 'backend');
        _;
    }

    receive() external payable {}

    function getReward(IERC20 token) external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        token.transfer(msg.sender, balance);
    }

    function getReward(uint256 amount) external onlyOwner {
        address payable _msgSender = payable(msg.sender);
        _msgSender.transfer(amount);
    }

    function getBackend() external view onlyOwner returns (address) {
        return _backend;
    }

    function setBackend(address backend) external onlyOwner {
        _backend = backend;
    }

    function flashLoan(InputFlashLoanPackage calldata package) external onlyBackend ensure(package.deadline) {
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

    function multiSwap(InputMultiSwapPackage calldata package) external onlyBackend ensure(package.deadline) {
        ParamsMultiSwap memory msParams;
        msParams.length = package.pairs.length;
        msParams.tokenIn = package.tokenIn;
        msParams.tokenOut;
        msParams.amountIn = package.amountIn;
        ParamsLoan memory params;
        TransferHelper.safeTransferFrom(msParams.tokenIn, msg.sender, package.pairs[0], msParams.amountIn);
        for (uint256 i = 0; i < msParams.length; i++) {
            params.pair = package.pairs[i];
            IUniswapV2Pair _pair = IUniswapV2Pair(params.pair);
            (params.token0, params.token1) = (_pair.token0(), _pair.token1());
            msParams.amountOut = package.amountsOut[i];
            (params.amount0, params.amount1, msParams.tokenOut) = msParams.tokenIn == params.token1
                ? (msParams.amountOut, uint256(0), params.token0)
                : (uint256(0), msParams.amountOut, params.token1);
            address dest = (i + 1) < msParams.length ? package.pairs[i + 1] : address(this);
            _pair.swap(params.amount0, params.amount1, dest, new bytes(0));
        }
    }

    function uniswapV2Call(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external override {
        if (data.length == 0) {
            return;
        }
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
