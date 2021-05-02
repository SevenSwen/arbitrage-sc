pragma solidity 0.8.3;

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";
import "@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol";

contract ExternalSwapper is IUniswapV2Callee {
    struct InputPackage {
        address tokenIn,
        address tokenOut,
        address factoryIn,
        address routerOut,
        uint256 amount,
        uint256 deadline
    }

    struct Params {
        address pair,
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        bytes data
    }

    address private _permissionedPairAddress = address(0);

    constructor() public {
    }

    receive() external payable {}

    function flashLoan(InputPackage package) external {
        _permissionedPairAddress = UniswapV2Library.pairFor(package.factoryIn, package.tokenIn, package.tokenOut);
        Params memory params;
        params.pair = _permissionedPairAddress;
        (params.token0, params.token1) = package.tokenIn < package.tokenOut ? (package.tokenIn, package.tokenOut) : (package.tokenOut, package.tokenIn);
        params.amount0 = tokenIn == token0 ? package.amount : 0;
        params.amount1 = tokenIn == token1 ? package.amount : 0;
        params.data = abi.encode(
            package.factoryIn,
            package.routerOut,
            package.deadline
        );

        IUniswapV2Pair(params.pair).swap(params.amount0, params.amount1, address(this), params.data);
    }

    function uniswapV2Call(
        address sender, uint256 amount0, uint256 amount1, bytes calldata data
    ) external override {
        assert(sender == address(this));
        assert(msg.sender == _permissionedPairAddress);

        (
            address factoryIn,
            address routerOut,
            uint256 deadline
        ) = abi.decode(data, (SwapType, bytes));

        Params memory params;
        params.pair = msg.sender;
        IUniswapV2Pair pair = IUniswapV2Pair(params.pair)
        params.token0 = pair.token0();
        params.token1 = pair.token1();
        address[] memory _pathOut = new address[](2);
        address[] memory _pathIn = new address[](2);

        if (amount0 == 0) {
            _pathOut[0] = params.token1;
            _pathOut[1] = params.token0;
            _pathIn[0] = params.token0;
            _pathIn[1] = params.token1;
            params.amount0 = amount1;
        } else {
            _pathOut[0] = params.token1;
            _pathOut[1] = params.token0;
            _pathIn[0] = params.token0;
            _pathIn[1] = params.token1;
            params.amount0 = amount0;
        }

        TransferHelper.safeApprove(_pathOut[0], routerOut, params.amount0);
        uint amountRequired = UniswapV2Library.getAmountsIn(factoryIn, params.amount0, _pathIn)[0];
        uint amountReceived = sushiRouter.swapExactTokensForTokens(
                                    params.amount0,
                                    0,
                                    _pathOut,
                                    address(this),
                                    block.timestamp + deadline
                                )[1];
        require(amountReceived > amountRequired, "profit < 0");
        TransferHelper.safeTransfer(_pathOut[1], params.pair, amountRequired); // return tokens to V2 pair
    }
