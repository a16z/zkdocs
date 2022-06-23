import { expect } from "chai";
import { existsSync, readFileSync, rmSync } from "fs";
import { ethers } from "hardhat";
import path from "path";

import { ZkDocSchema, poseidon2, poseidon3 } from "zkdocs-lib";
import { ZkDocGenerator } from "../generator/ZkDocGenerator";
import { ZKDocument } from "../typechain-types/contracts/ZkDocument.sol/ZKDocument";
import { generateProofAndCallData, randomBigInt, toHex } from "../utils/utils";

const hre = require("hardhat");
const snarkjs = require("snarkjs");


describe("Integration tests", async () => {
    let potPath = path.join(__dirname, "..", "build", "pot16_final.ptau");
    let tmpDir = path.join(__dirname, "circuit_cache");
    let vKeyPath = path.join(tmpDir, "verification_key.json");
    let verifierDir = path.join(__dirname, "..", "contracts", "test");
    let verifierName = "IntegrationTestVerifier";
    let compiledVerifierDir = path.join(__dirname, "..", "artifacts", "contracts", "test", `${verifierName}.sol`)

    it("primary integration test", async () => {
        let schemaPath = path.join(__dirname, "test_schemas", "2_bank_schema.json");

        let json = readFileSync(schemaPath).toString();
        let schema = ZkDocSchema.parseFromString(json)!;
        let generator = new ZkDocGenerator(schema, tmpDir, potPath, "circuit", "../../");
        let numFields = schema.json.fields.length;
        await generator.buildAll();
        await generator.exportVkey();
        await generator.genSol(verifierDir, verifierName);

        // Recompile contracts for the new verifier
        await hre.run("compile");

        let wasmPath = path.join(tmpDir, "circuit_js", "circuit.wasm");
        let zkeyPath = path.join(tmpDir, "circuit_final.zkey");
        let vkey = JSON.parse(readFileSync(vKeyPath).toString());
        expect(existsSync(zkeyPath)).to.be.true;
        expect(existsSync(wasmPath)).to.be.true;
        expect(existsSync(vKeyPath)).to.be.true;

        let [ admin, submittor, institution ] = await ethers.getSigners();

        let values = ["100", "200", "300", "400"];
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
        ];

        let commits: BigInt[] = [];
        let consts: BigInt[] = schema.json.constraints.map(constraint => BigInt(constraint.constant!));
        for (let i = 0; i < processedValues.length; i++) {
            let commit = await poseidon3(processedValues[i], nonces[2*i], nonces[2*i+1]);
            commits.push(commit);
        }

        let inputObj = {
            values: processedValues,
            nonces,
            commits,
            consts
       }
       let { proof, publicSignals } = await snarkjs.plonk.fullProve(inputObj, wasmPath, zkeyPath);
       const res = await snarkjs.plonk.verify(vkey, publicSignals, proof);
       expect(res).to.be.true;

       // Deploy
       let docFactory = await ethers.getContractFactory("ZKDocument", admin);
       // Lookup verifier build info
       let verifierBuildInfo = JSON.parse(readFileSync(path.join(compiledVerifierDir, "PlonkVerifier.json")).toString());
       let verifierBytecode = verifierBuildInfo['bytecode'];
       let verifierAbi = verifierBuildInfo['abi'];
       let verifierFactory = new ethers.ContractFactory(verifierAbi, verifierBytecode, admin);

       let verifier = await verifierFactory.deploy();
       let doc = (
           await docFactory.deploy(
               consts, 
               schema.json.fields.length, 
               verifier.address, 
               schema.schemaHash())) as ZKDocument;

       // Add valid institution
       await doc.addValidInstitution(institution.address);

       // Add commitments
       let subDoc = doc.connect(submittor);
       let fields = commits.map(commit => toHex(commit))
       await subDoc.postFields(fields, fields.map(_ => institution.address))

       // Attest each field
       for (let i = 0; i < numFields; i++) {
           let fieldIndex = await doc.getFieldIndex(submittor.address, i);
           await (await doc.connect(institution).attest(fieldIndex)).wait();
       }

       let calldataProof = await generateProofAndCallData(processedValues, nonces, commits, consts, wasmPath, zkeyPath);
       await subDoc.validateSubmitter(calldataProof);
       let validatedSubmitters = await doc.getValidatedSubmitters()
       expect(validatedSubmitters).to.contain(submittor.address);

    })
    it("string fields, RHS field not const", async () => {
        let schemaPath = path.join(__dirname, "test_schemas", "custodian.json");

        let json = readFileSync(schemaPath).toString();
        let schema = ZkDocSchema.parseFromString(json)!;
        let generator = new ZkDocGenerator(schema, tmpDir, potPath, "circuit", "../../");
        let numFields = schema.json.fields.length;
        await generator.buildAll();
        await generator.exportVkey();
        await generator.genSol(verifierDir, verifierName);

        // Recompile contracts for the new verifier
        await hre.run("compile");

        let wasmPath = path.join(tmpDir, "circuit_js", "circuit.wasm");
        let zkeyPath = path.join(tmpDir, "circuit_final.zkey");
        let vkey = JSON.parse(readFileSync(vKeyPath).toString());
        expect(existsSync(zkeyPath)).to.be.true;
        expect(existsSync(wasmPath)).to.be.true;
        expect(existsSync(vKeyPath)).to.be.true;

        let [ admin, submittor, institution ] = await ethers.getSigners();

        let values = ["jim johnson", "200", "105", "100"];
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
        ];
        let commits: BigInt[] = [];
        let consts: BigInt[] = 
            schema.json.constraints
                .filter(constraint => constraint.constant)
                .map(constraint => BigInt(constraint.constant!));
        for (let i = 0; i < processedValues.length; i++) {
            let commit = await poseidon3(processedValues[i], nonces[2*i], nonces[2*i+1]);
            commits.push(commit);
        }

        let inputObj = {
            values: processedValues,
            nonces,
            commits,
            consts
       }
       let { proof, publicSignals } = await snarkjs.plonk.fullProve(inputObj, wasmPath, zkeyPath);
       const res = await snarkjs.plonk.verify(vkey, publicSignals, proof);
       expect(res).to.be.true;

       // Deploy
       let docFactory = await ethers.getContractFactory("ZKDocument", admin);
       // Lookup verifier build info
       let verifierBuildInfo = JSON.parse(readFileSync(path.join(compiledVerifierDir, "PlonkVerifier.json")).toString());
       let verifierBytecode = verifierBuildInfo['bytecode'];
       let verifierAbi = verifierBuildInfo['abi'];
       let verifierFactory = new ethers.ContractFactory(verifierAbi, verifierBytecode, admin);

       let verifier = await verifierFactory.deploy();
       let doc = (
           await docFactory.deploy(
               consts, 
               schema.json.fields.length, 
               verifier.address, 
               schema.schemaHash())) as ZKDocument;

       // Add valid institution
       await doc.addValidInstitution(institution.address);

       // Add commitments
       let subDoc = doc.connect(submittor);
       let fields = commits.map(commit => toHex(commit))
       await subDoc.postFields(fields, fields.map(_ => institution.address))

       // Attest each field
       for (let i = 0; i < numFields; i++) {
           let fieldIndex = await doc.getFieldIndex(submittor.address, i);
           await (await doc.connect(institution).attest(fieldIndex)).wait();
       }

       let calldataProof = await generateProofAndCallData(processedValues, nonces, commits, consts, wasmPath, zkeyPath);
       await subDoc.validateSubmitter(calldataProof);
       let validatedSubmitters = await doc.getValidatedSubmitters();
       expect(validatedSubmitters).to.contain(submittor.address);
    })

    after(() => {
        // Cleanup
        rmSync(tmpDir, { recursive: true, force: true });
        rmSync(`${verifierDir}/${verifierName}.sol`);
        rmSync(compiledVerifierDir, { recursive: true, force: true});
    })
})