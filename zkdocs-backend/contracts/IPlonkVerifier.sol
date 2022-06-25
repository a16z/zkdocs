// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

interface IPlonkVerifier {
        function verifyProof(bytes memory proof, uint[] memory pubSignals) external view returns (bool);
}
