import { ZkDocGenerator } from "../generator/ZkDocGenerator";
import { ZkDocSchema } from "zkdocs-lib";
import { poseidon2, poseidon3 } from "zkdocs-lib/lib/Poseidon";
import { randomBigInt } from "../utils/utils";

import { existsSync, readFileSync, rmSync } from "fs";
import { expect } from "chai";
import path from "path";

const snarkjs = require("snarkjs");


describe("Test the generator", async () => {
    let tmpDir = path.join(__dirname, "circuit_cache");

    it("generates a working circuit", async () => {
        let schemaPath = path.join(__dirname, "test_schemas", "2_bank_schema.json")
        let potPath = path.join(__dirname, "..", "build", "pot16_final.ptau");

        let json = readFileSync(schemaPath).toString();
        let schema = ZkDocSchema.parseFromString(json)!;
        let generator = new ZkDocGenerator(schema, tmpDir, potPath, "circuit", "../../");
        await generator.buildAll();

        // Check files exist
        let wasmPath = path.join(tmpDir, "circuit_js", "circuit.wasm")
        let zkeyPath = path.join(tmpDir, "circuit_final.zkey")
        expect(existsSync(path.join(tmpDir, "circuit.sym"))).to.be.true;
        expect(existsSync(path.join(tmpDir, "circuit.r1cs"))).to.be.true;
        expect(existsSync(path.join(tmpDir, "circuit.circom"))).to.be.true;
        expect(existsSync(zkeyPath)).to.be.true;
        expect(existsSync(wasmPath)).to.be.true;

        // Create a verification key
        await generator.exportVkey()
        let vkeyPath = path.join(tmpDir, "verification_key.json")
        expect(existsSync(vkeyPath)).to.be.true
        let vkey = JSON.parse(readFileSync(vkeyPath).toString());

        // Run the circuit
        let values = [BigInt(100), BigInt(200), BigInt(300), BigInt(400)]
        let nonces = [
            randomBigInt(31), 
            randomBigInt(31), 
            randomBigInt(31), 
            randomBigInt(31),
            randomBigInt(31), 
            randomBigInt(31), 
            randomBigInt(31), 
            randomBigInt(31),
        ]
        let commits: BigInt[] = []
        let consts: BigInt[] = [BigInt(100_000)]
        for (let i = 0; i < values.length; i++) {
            let commit = await poseidon3(values[i], nonces[2*i], nonces[2*i+1])
            commits.push(commit)
        }
        let inputObj = {
             values,
             nonces,
             commits,
             consts
        }
        let { proof, publicSignals } = await snarkjs.plonk.fullProve(inputObj, wasmPath, zkeyPath)
        const res = await snarkjs.plonk.verify(vkey, publicSignals, proof);
        expect(res).to.be.true

    })
    it("2 constraint circuit", async () => {
        let schemaPath = path.join(__dirname, "test_schemas", "tax_bracket.json")
        let potPath = path.join(__dirname, "..", "build", "pot16_final.ptau");

        let json = readFileSync(schemaPath).toString();
        let schema = ZkDocSchema.parseFromString(json)!;
        let generator = new ZkDocGenerator(schema, tmpDir, potPath, "circuit", "../../");
        await generator.buildAll();

        // Check files exist
        let wasmPath = path.join(tmpDir, "circuit_js", "circuit.wasm")
        let zkeyPath = path.join(tmpDir, "circuit_final.zkey")
        expect(existsSync(path.join(tmpDir, "circuit.sym"))).to.be.true;
        expect(existsSync(path.join(tmpDir, "circuit.r1cs"))).to.be.true;
        expect(existsSync(path.join(tmpDir, "circuit.circom"))).to.be.true;
        expect(existsSync(zkeyPath)).to.be.true;
        expect(existsSync(wasmPath)).to.be.true;

        // Create a verification key
        await generator.exportVkey()
        let vkeyPath = path.join(tmpDir, "verification_key.json")
        expect(existsSync(vkeyPath)).to.be.true
        let vkey = JSON.parse(readFileSync(vkeyPath).toString());

        // Run the circuit
        let values = ["ABC_123", "99999", "ABC_123", "111"]
        let processedValues = schema.convertValueList(values);
        let nonces = [
            randomBigInt(31), 
            randomBigInt(31), 
            randomBigInt(31), 
            randomBigInt(31),
            randomBigInt(31), 
            randomBigInt(31), 
            randomBigInt(31), 
            randomBigInt(31),
        ]
        let commits: BigInt[] = []
        let consts: BigInt[] = 
            schema.json.constraints
                .filter(constraint => constraint.constant)
                .map(constraint => BigInt(constraint.constant!))
        for (let i = 0; i < values.length; i++) {
            let commit = await poseidon3(processedValues[i], nonces[2*i], nonces[2*i+1])
            commits.push(commit)
        }
        let inputObj = {
             values: processedValues,
             nonces,
             commits,
             consts
        }
        let { proof, publicSignals } = await snarkjs.plonk.fullProve(inputObj, wasmPath, zkeyPath)
        const res = await snarkjs.plonk.verify(vkey, publicSignals, proof);
        expect(res).to.be.true

    })
    after(() => {
        // Cleanup 
        rmSync(tmpDir, { recursive: true, force: true })
    })
})
