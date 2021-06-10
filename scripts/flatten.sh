#!/bin/bash

if [ -z $1 ]; then
    hardhat flatten contracts/ForFlattened.sol | awk '/SPDX-License-Identifier/&&c++>0 {next} 1' | awk '/pragma experimental ABIEncoderV2;/&&c++>0 {next} 1' > contracts/Flattened.sol
else
    hardhat flatten $1 | awk '/SPDX-License-Identifier/&&c++>0 {next} 1' | awk '/pragma experimental ABIEncoderV2;/&&c++>0 {next} 1' > contracts/Flattened.sol
fi

