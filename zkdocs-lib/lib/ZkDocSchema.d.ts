export interface ZkDocField {
    field_name: string;
    human_name: string;
    description?: string;
    string?: true;
}
export interface ZkDocConstraint {
    fieldA: string;
    fieldB: string;
    op: "ADD" | "SUB";
    constraint: "LT" | "GT";
    constant?: number;
    fieldCompare?: string;
}
export interface ZkDocJson {
    fields: ZkDocField[];
    constraints: ZkDocConstraint[];
    trusted_institutions: InstitutionDetails[];
}
export interface InstitutionDetails {
    address: string;
    human_name?: string;
}
export declare class ZkDocSchema {
    json: ZkDocJson;
    name: string;
    constructor(json: ZkDocJson, name: string);
    static parseFromString(str: string, name?: string): ZkDocSchema | undefined;
    validateConstraints(): boolean;
    validateTrustedInstitutions(): boolean;
    getFieldByName(name: string): ZkDocField | undefined;
    getFieldIndex(name: string): number;
    /**
     * Iterates through each potential value and ensures that it matches constraints.
     */
    validateValuesList(list: string[]): boolean;
    /**
     * For a list of strings, indexed the same as the fields, convert to BigInts dependent on the field type.
     */
    convertValueList(list: string[]): BigInt[];
    schemaHash(): string;
    /**
     * Returns the string as an ascii encoded BigInt.
     */
    static encodeStringToBigInt(str: string): BigInt;
}
