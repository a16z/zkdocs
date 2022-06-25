"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.md5HashJson = void 0;
var crypto_js_1 = require("crypto-js");
function md5HashJson(json) {
    var sanitized = JSON.stringify(JSON.parse(json)); // normalize
    return "0x".concat((0, crypto_js_1.MD5)(sanitized).toString());
}
exports.md5HashJson = md5HashJson;
