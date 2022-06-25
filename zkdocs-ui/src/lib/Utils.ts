// @ts-ignore
import { randomBytes } from "crypto-browserify";

import { InstitutionDetails } from "zkdocs-lib";

// Imported via index.html
let snarkjs = (window as any).snarkjs;

export function unpackWagmiWriteError(error: any): string | undefined {
  if (error !== undefined && error !== null && error.hasOwnProperty("data")) {
    return error["data"]["message"];
  } else {
    return error.toString();
  }
}

export function displayInstitution(inst: InstitutionDetails): string {
  return inst.human_name && inst.human_name !== ""
    ? inst.human_name
    : inst.address;
}

export function toBufferLE(bi: BigInt, width: number): Buffer {
  const hex = bi.toString(16);
  const buffer = Buffer.from(
    hex.padStart(width * 2, "0").slice(0, width * 2),
    "hex"
  );
  buffer.reverse();
  return buffer;
}

export function toHex(number: BigInt, length = 32) {
  const str: string = number.toString(16);
  return "0x" + str.padStart(length * 2, "0");
}

// Lifted from ffutils: https://github.com/iden3/ffjavascript/blob/master/src/utils_bigint.js
export function unstringifyBigInts(o: any): any {
  if (typeof o == "string" && /^[0-9]+$/.test(o)) {
    return BigInt(o);
  } else if (typeof o == "string" && /^0x[0-9a-fA-F]+$/.test(o)) {
    return BigInt(o);
  } else if (Array.isArray(o)) {
    return o.map(unstringifyBigInts);
  } else if (typeof o == "object") {
    const res: { [key: string]: any } = {};
    const keys = Object.keys(o);
    keys.forEach((k) => {
      res[k] = unstringifyBigInts(o[k]);
    });
    return res;
  } else {
    return o;
  }
}

export async function generateProofAndCallData(
  values: BigInt[],
  nonces: BigInt[],
  commits: BigInt[],
  consts: BigInt[],
  wasmPath: any,
  zkeyPath: any
): Promise<string> {
  let inputObj = {
    values: values,
    nonces: nonces,
    commits: commits,
    consts: consts,
  };

  let { proof, publicSignals } = await snarkjs.plonk.fullProve(
    inputObj,
    wasmPath,
    zkeyPath
  );
  let proofProcessed = unstringifyBigInts(proof);
  let pubProcessed = unstringifyBigInts(publicSignals);
  let allSolCallData: string = await snarkjs.plonk.exportSolidityCallData(
    proofProcessed,
    pubProcessed
  );
  let solCallDataProof = allSolCallData.split(",")[0];
  return solCallDataProof;
}

function toBigIntLE (buff: Buffer) {
  const reversed = Buffer.from(buff);
  reversed.reverse();
  const hex = reversed.toString('hex');
  if (hex.length === 0) {
    return BigInt(0);
  }
  return BigInt(`0x${hex}`);
}

export function randomNonce(): BigInt {
  return toBigIntLE(randomBytes(31))

}