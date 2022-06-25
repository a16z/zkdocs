"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keccakJson = void 0;
var ethers_1 = require("ethers");
function keccakJson(json) {
    var sanitized = Buffer.from(JSON.stringify(JSON.parse(json))); // normalize
    return ethers_1.utils.keccak256(sanitized);
}
exports.keccakJson = keccakJson;
