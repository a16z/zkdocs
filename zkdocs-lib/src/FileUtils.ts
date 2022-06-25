import { utils } from "ethers";

export function keccakJson(json: string): string {
    let sanitized = Buffer.from(JSON.stringify(JSON.parse(json))) // normalize
    return utils.keccak256(sanitized)
}