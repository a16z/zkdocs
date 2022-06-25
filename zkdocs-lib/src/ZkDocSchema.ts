import { utils } from "ethers";
import { keccakJson } from "./FileUtils";

export interface ZkDocField {
    field_name: string,
    human_name: string,
    description?: string,
    string?: true
}

export interface ZkDocConstraint {
    fieldA: string,
    fieldB: string,
    op: "ADD" | "SUB",
    constraint: "LT" | "GT",
    constant?: number
    fieldCompare?: string,
}

export interface ZkDocJson {
    fields: ZkDocField[],
    constraints: ZkDocConstraint[],
    trusted_institutions: InstitutionDetails[]
}

export interface InstitutionDetails {
    address: string,
    human_name?: string
}

let VALID_CONSTRAINT_OPS = ["ADD", "SUB"];
let VALID_CONSTRAINT_TYPES = ["LT", "GT"];

export class ZkDocSchema {

    public constructor(public json: ZkDocJson, public name: string) {}

    public static parseFromString(str: string, name: string = "unknown"): ZkDocSchema | undefined {
        let json: ZkDocJson = JSON.parse(str);
        let schema = new ZkDocSchema(json, name);

        if (!schema.validateConstraints()) {
            console.error("Schema `constraints` are invalid.");
            return undefined;
        }
        if (!schema.validateTrustedInstitutions()) {
            console.error("Schema `trusted_institutions` are invalid.");
            return undefined;
        }

        return schema;
    }

    public validateConstraints(): boolean {
        for (let constraint of this.json.constraints) {
            // Check op is a valid op
            if (VALID_CONSTRAINT_OPS.findIndex(val => val === constraint.op) === -1) {
                return false;
            }

            // Check constraint type is valid
            if (VALID_CONSTRAINT_TYPES.findIndex(val => val === constraint.constraint) === -1) {
                return false;
            }

            // Validate only of two RHS fields 
            if (constraint.constant && constraint.fieldCompare) {
                return false;
            } else if(!constraint.constant && !constraint.fieldCompare) {
                return false;
            }

            // Confirm that RHS values are valid 
            if (constraint.fieldCompare) {
                let field = this.getFieldByName(constraint.fieldCompare!)
                if (!field) {
                    return false;
                }
            } else if(constraint.constant) {
                if (!isPositiveNumeric(constraint.constant!.toString())) {
                    return false;
                }
            }

            // Check constraints point to valid fields
            let fieldA = this.getFieldByName(constraint.fieldA)
            let fieldB = this.getFieldByName(constraint.fieldB)
            if (!fieldA || !fieldB) {
                return false
            }

            // Constraints cannot include string types
            if (fieldA.string || fieldB.string) {
                return false
            }

        }
        return true;
    }

    public validateTrustedInstitutions(): boolean {
        if (this.json.trusted_institutions.length === 0) {
            return false;
        }

        for (let inst of this.json.trusted_institutions) {
            if(!utils.isAddress(inst.address)) {
                return false;
            }
        }
        return true;
    }

    public getFieldByName(name: string): ZkDocField | undefined {
        return this.json.fields.find(field => field.field_name === name)    
    }

    public getFieldIndex(name: string): number {
        return this.json.fields.findIndex(field => field.field_name === name)
    }

    /**
     * Iterates through each potential value and ensures that it matches constraints.
     */
    public validateValuesList(list: string[]): boolean {
        for (let i = 0; i < list.length; i++) {
            let value = list[i];
            let field = this.json.fields[i];

            if (typeof value !== "string") return false;

            // For non-string types, confirm value is a positive whole number
            if (!field.string && !isPositiveNumeric(value) ) return false;

            if (field.string && !isASCII(value)) return false;

            // We can only encode values up to 31 characters due to finite field size
            if (field.string && value.length >= 32) return false;
        }
        return true;
    }

    /**
     * For a list of strings, indexed the same as the fields, convert to BigInts dependent on the field type.
     */
    public convertValueList(list: string[]): BigInt[] {
        let results: BigInt[] = []
        for (let i = 0; i < list.length; i++) {
            let value = list[i]
            let field = this.json.fields[i]

            if (field.string) {
                results.push(ZkDocSchema.encodeStringToBigInt(value))
            } else {
                results.push(BigInt(value))
            }
        }
        return results;
    }

    public schemaHash(): string {
        return keccakJson(JSON.stringify(this.json))
    }

    /**
     * Returns the string as an ascii encoded BigInt.
     */
    public static encodeStringToBigInt(str: string): BigInt {
        let codeArr: string[] = []
        let numChars = str.length > 31 ? 31 : str.length;
        for (let i = 0; i < numChars; i++) {
            let charCode = str.charCodeAt(i)
            if (charCode > 255) {
                console.error("string contains non-ascii characters")
                codeArr.push("00")
            } else {
                let hex = Number(charCode).toString(16)
                codeArr.push(hex)
            }
        }
        let hex = `0x${codeArr.join("")}`
        return BigInt(hex);
    }
}

function isPositiveNumeric(value: string): boolean {
    return /^\d+$/.test(value);
}

function isASCII(str: string): boolean {
    return /^[\x00-\x7F]*$/.test(str);
}