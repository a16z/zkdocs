// @ts-ignore -- no types
import { buildPoseidon } from "circomlibjs";

let poseidonHasher: any;

export async function poseidon2(first: BigInt, second: BigInt): Promise<BigInt> {
    if (!poseidonHasher) {
        poseidonHasher = await buildPoseidon()
    }

    return BigInt(poseidonHasher.F.toString(poseidonHasher([first,second])))
}

export async function poseidon3(first: BigInt, second: BigInt, third: BigInt): Promise<BigInt> {
    if (!poseidonHasher) {
        poseidonHasher = await buildPoseidon()
    }

    return BigInt(poseidonHasher.F.toString(poseidonHasher([first, second, third])))
}