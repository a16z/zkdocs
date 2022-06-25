import { keccakJson } from "zkdocs-lib";
import { Domain, Schemas } from "./Config";

export interface SchemaAndMeta {
    schema: string;
    urlPrefix: string; // directory url
    schemaName: string;
    hash: string;
    contractAddr?: string;
}

export async function findSchemaForHash(
    hash: string
): Promise<SchemaAndMeta | undefined> {
    let schemas = await getSchemas();
    return schemas.find((schema) => schema.hash.toLowerCase() === hash.toLowerCase());
}

export async function getSchemas(): Promise<SchemaAndMeta[]> {
    let results: SchemaAndMeta[] = [];
    for (let schemaName of Schemas) {
        let urlPrefix = getSchemaRootUrl(schemaName);
        let schemaUrl = getSchemaJsonUrl(schemaName);
        let schema = await getSchema(schemaUrl);

        if (schema === "") {
            continue;
        }

        let hash = keccakJson(schema);

        let meta: SchemaAndMeta = {
            schema,
            urlPrefix,
            schemaName,
            hash,
        };
        results.push(meta);
    }
    return results;
}

async function getSchema(path: string): Promise<string> {
    let result = await fetch(path);
    try {
        let json = await result.json();
        return JSON.stringify(json);
    } catch (e) {
        return "";
    }
}

export function getSchemaRootUrl(schemaName: string): string {
    return `${Domain}test_schemas/${schemaName}`;
}

export function getSchemaJsonUrl(schemaName: string): string {
    return `${getSchemaRootUrl(schemaName)}/${schemaName}.json`;
}

export function getSchemaWasmUrl(schemaName: string): string {
    return `${getSchemaRootUrl(schemaName)}/circuit.wasm`;
}

export function getSchemaZkeyUrl(schemaName: string): string {
    return `${getSchemaRootUrl(schemaName)}/circuit_final.zkey`;
}

export async function getSchemaWasmBuffer(schemaName: string): Promise<Buffer> {
    let url = getSchemaWasmUrl(schemaName);
    return getFileBuffer(url);
}

export async function getSchemaZkeyBuffer(schemaName: string): Promise<Buffer> {
    let url = getSchemaZkeyUrl(schemaName);
    return getFileBuffer(url);
}

async function getFileBuffer(filename: string): Promise<Buffer> {
    let req = await fetch(filename);
    return Buffer.from(await req.arrayBuffer());
}
