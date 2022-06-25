// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

contract FakeVerifier {
        bool public result;

        constructor() {
            result = true;
        }

        function verifyProof(bytes memory, uint[] memory) external view returns (bool) {
            return result;
        }

        function updateResult(bool newResult) public {
            result = newResult;
        }
}