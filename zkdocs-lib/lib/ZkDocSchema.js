"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZkDocSchema = void 0;
var ethers_1 = require("ethers");
var FileUtils_1 = require("./FileUtils");
var VALID_CONSTRAINT_OPS = ["ADD", "SUB"];
var VALID_CONSTRAINT_TYPES = ["LT", "GT"];
var ZkDocSchema = /** @class */ (function () {
    function ZkDocSchema(json, name) {
        this.json = json;
        this.name = name;
    }
    ZkDocSchema.parseFromString = function (str, name) {
        if (name === void 0) { name = "unknown"; }
        var json = JSON.parse(str);
        var schema = new ZkDocSchema(json, name);
        if (!schema.validateConstraints()) {
            console.error("Schema `constraints` are invalid.");
            return undefined;
        }
        if (!schema.validateTrustedInstitutions()) {
            console.error("Schema `trusted_institutions` are invalid.");
            return undefined;
        }
        return schema;
    };
    ZkDocSchema.prototype.validateConstraints = function () {
        var _loop_1 = function (constraint) {
            // Check op is a valid op
            if (VALID_CONSTRAINT_OPS.findIndex(function (val) { return val === constraint.op; }) === -1) {
                return { value: false };
            }
            // Check constraint type is valid
            if (VALID_CONSTRAINT_TYPES.findIndex(function (val) { return val === constraint.constraint; }) === -1) {
                return { value: false };
            }
            // Validate only of two RHS fields 
            if (constraint.constant && constraint.fieldCompare) {
                return { value: false };
            }
            else if (!constraint.constant && !constraint.fieldCompare) {
                return { value: false };
            }
            // Confirm that RHS values are valid 
            if (constraint.fieldCompare) {
                var field = this_1.getFieldByName(constraint.fieldCompare);
                if (!field) {
                    return { value: false };
                }
            }
            else if (constraint.constant) {
                if (!isPositiveNumeric(constraint.constant.toString())) {
                    return { value: false };
                }
            }
            // Check constraints point to valid fields
            var fieldA = this_1.getFieldByName(constraint.fieldA);
            var fieldB = this_1.getFieldByName(constraint.fieldB);
            if (!fieldA || !fieldB) {
                return { value: false };
            }
            // Constraints cannot include string types
            if (fieldA.string || fieldB.string) {
                return { value: false };
            }
        };
        var this_1 = this;
        for (var _i = 0, _a = this.json.constraints; _i < _a.length; _i++) {
            var constraint = _a[_i];
            var state_1 = _loop_1(constraint);
            if (typeof state_1 === "object")
                return state_1.value;
        }
        return true;
    };
    ZkDocSchema.prototype.validateTrustedInstitutions = function () {
        if (this.json.trusted_institutions.length === 0) {
            return false;
        }
        for (var _i = 0, _a = this.json.trusted_institutions; _i < _a.length; _i++) {
            var inst = _a[_i];
            if (!ethers_1.utils.isAddress(inst.address)) {
                return false;
            }
        }
        return true;
    };
    ZkDocSchema.prototype.getFieldByName = function (name) {
        return this.json.fields.find(function (field) { return field.field_name === name; });
    };
    ZkDocSchema.prototype.getFieldIndex = function (name) {
        return this.json.fields.findIndex(function (field) { return field.field_name === name; });
    };
    /**
     * Iterates through each potential value and ensures that it matches constraints.
     */
    ZkDocSchema.prototype.validateValuesList = function (list) {
        for (var i = 0; i < list.length; i++) {
            var value = list[i];
            var field = this.json.fields[i];
            if (typeof value !== "string")
                return false;
            // For non-string types, confirm value is a positive whole number
            if (!field.string && !isPositiveNumeric(value))
                return false;
            if (field.string && !isASCII(value))
                return false;
            // We can only encode values up to 31 characters due to finite field size
            if (field.string && value.length >= 32)
                return false;
        }
        return true;
    };
    /**
     * For a list of strings, indexed the same as the fields, convert to BigInts dependent on the field type.
     */
    ZkDocSchema.prototype.convertValueList = function (list) {
        var results = [];
        for (var i = 0; i < list.length; i++) {
            var value = list[i];
            var field = this.json.fields[i];
            if (field.string) {
                results.push(ZkDocSchema.encodeStringToBigInt(value));
            }
            else {
                results.push(BigInt(value));
            }
        }
        return results;
    };
    ZkDocSchema.prototype.schemaHash = function () {
        return (0, FileUtils_1.keccakJson)(JSON.stringify(this.json));
    };
    /**
     * Returns the string as an ascii encoded BigInt.
     */
    ZkDocSchema.encodeStringToBigInt = function (str) {
        var codeArr = [];
        var numChars = str.length > 31 ? 31 : str.length;
        for (var i = 0; i < numChars; i++) {
            var charCode = str.charCodeAt(i);
            if (charCode > 255) {
                console.error("string contains non-ascii characters");
                codeArr.push("00");
            }
            else {
                var hex_1 = Number(charCode).toString(16);
                codeArr.push(hex_1);
            }
        }
        var hex = "0x".concat(codeArr.join(""));
        return BigInt(hex);
    };
    return ZkDocSchema;
}());
exports.ZkDocSchema = ZkDocSchema;
function isPositiveNumeric(value) {
    return /^\d+$/.test(value);
}
function isASCII(str) {
    return /^[\x00-\x7F]*$/.test(str);
}
