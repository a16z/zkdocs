import { ethers } from "hardhat";
import { expect } from "chai";
import { randomBigInt, toHex } from "../utils/utils";
import { poseidon2 } from "zkdocs-lib/lib/Poseidon";
import { ZKDocument } from "../typechain-types/contracts/ZkDocument.sol/ZKDocument";

let FAKE_SCHEMA_HASH = "0xbe712f16bdf5370172cc4104a5f73422f482eddac8912d3a13f47d10e75a9197"

describe("Solidity tests", async () => {
    it("no zk - can validate", async () => {
        let [admin, submittor, institutionA, institutionB, institutionC, institutionD] = await ethers.getSigners();

        let fakeVerifierFactory = await ethers.getContractFactory("FakeVerifier", admin);
        let zkDocumentFactory = await ethers.getContractFactory("ZKDocument", admin);

        let fakeVerifier = await fakeVerifierFactory.deploy()
        let zkDocument = (await zkDocumentFactory.deploy([100000000, 10000000], 4, fakeVerifier.address, FAKE_SCHEMA_HASH)) as ZKDocument

        let addInstitutions = [
            (await zkDocument.addValidInstitution(institutionA.address)).wait(),
            (await zkDocument.addValidInstitution(institutionB.address)).wait(),
            (await zkDocument.addValidInstitution(institutionC.address)).wait(),
            (await zkDocument.addValidInstitution(institutionD.address)).wait(),
        ]
        await Promise.all(addInstitutions)

        let subZkDocument = zkDocument.connect(submittor)
        let fields: [string, string, string, string] = [toHex(randomBigInt(31)), toHex(randomBigInt(31)), toHex(randomBigInt(31)), toHex(randomBigInt(31))]
        let institutions: [string, string, string, string] = [institutionA.address, institutionB.address, institutionC.address, institutionD.address]
        await (await subZkDocument.postFields(fields, institutions)).wait()

        let fieldIndex0 = await zkDocument.getFieldIndex(submittor.address, 0)
        let fieldIndex1 = await zkDocument.getFieldIndex(submittor.address, 1)
        let fieldIndex2 = await zkDocument.getFieldIndex(submittor.address, 2)
        let fieldIndex3 = await zkDocument.getFieldIndex(submittor.address, 3)

        let attestations = [
            (await zkDocument.connect(institutionA).attest(fieldIndex0)).wait(),
            (await zkDocument.connect(institutionB).attest(fieldIndex1)).wait(),
            (await zkDocument.connect(institutionC).attest(fieldIndex2)).wait(),
            (await zkDocument.connect(institutionD).attest(fieldIndex3)).wait(),
        ]
        await Promise.all(attestations)

        await subZkDocument.validateSubmitter("0xabcdabcd")
        let validatedSubmitters = await zkDocument.getValidatedSubmitters()
        expect(validatedSubmitters).to.contain(submittor.address)
    })
    it("no zk - cannot validate without attestations", async () => {
        let [admin, submittor, institutionA, institutionB, institutionC, institutionD] = await ethers.getSigners();

        let fakeVerifierFactory = await ethers.getContractFactory("FakeVerifier", admin);
        let zkDocumentFactory = await ethers.getContractFactory("ZKDocument", admin);

        let fakeVerifier = await fakeVerifierFactory.deploy()
        let zkDocument = (await zkDocumentFactory.deploy([100000000, 10000000], 4, fakeVerifier.address, FAKE_SCHEMA_HASH)) as ZKDocument

        let addInstitutions = [
            (await zkDocument.addValidInstitution(institutionA.address)).wait(),
            (await zkDocument.addValidInstitution(institutionB.address)).wait(),
            (await zkDocument.addValidInstitution(institutionC.address)).wait(),
            (await zkDocument.addValidInstitution(institutionD.address)).wait(),
        ]
        await Promise.all(addInstitutions)

        let subZkDocument = zkDocument.connect(submittor)
        let fields: [string, string, string, string] = [toHex(randomBigInt(31)), toHex(randomBigInt(31)), toHex(randomBigInt(31)), toHex(randomBigInt(31))]
        let institutions: [string, string, string, string] = [institutionA.address, institutionB.address, institutionC.address, institutionD.address]
        await (await subZkDocument.postFields(fields, institutions)).wait()

        expect(subZkDocument.validateSubmitter("0xabcdabcd")).to.be.revertedWith("all fields must be attested to");
    })
    it("can only postFields once", async () => {
        let [admin, submittor, institutionA, institutionB, institutionC, institutionD] = await ethers.getSigners();

        let fakeVerifierFactory = await ethers.getContractFactory("FakeVerifier", admin);
        let zkDocumentFactory = await ethers.getContractFactory("ZKDocument", admin);

        let fakeVerifier = await fakeVerifierFactory.deploy()
        let zkDocument = (await zkDocumentFactory.deploy([100000000, 10000000], 4, fakeVerifier.address, FAKE_SCHEMA_HASH)) as ZKDocument

        let addInstitutions = [
            (await zkDocument.addValidInstitution(institutionA.address)).wait(),
            (await zkDocument.addValidInstitution(institutionB.address)).wait(),
            (await zkDocument.addValidInstitution(institutionC.address)).wait(),
            (await zkDocument.addValidInstitution(institutionD.address)).wait(),
        ]
        await Promise.all(addInstitutions)

        let subZkDocument = zkDocument.connect(submittor)
        let fields: [string, string, string, string] = [toHex(randomBigInt(31)), toHex(randomBigInt(31)), toHex(randomBigInt(31)), toHex(randomBigInt(31))]
        let institutions: [string, string, string, string] = [institutionA.address, institutionB.address, institutionC.address, institutionD.address]
        await (await subZkDocument.postFields(fields, institutions)).wait()
        expect(subZkDocument.postFields(fields, institutions)).to.be.revertedWith("can only post fields once");
    })
    it("can validate", async () => {
        let [admin, submittor, institutionA, institutionB, institutionC, institutionD] = await ethers.getSigners();

        let verifierFactory = await ethers.getContractFactory("FakeVerifier", admin);
        let zkDocumentFactory = await ethers.getContractFactory("ZKDocument", admin);

        let verifier = await verifierFactory.deploy();
        let zkDocument = (await zkDocumentFactory.deploy([100000000, 10000000], 4, verifier.address, FAKE_SCHEMA_HASH)) as ZKDocument;

        let addInstitutions = [
            (await zkDocument.addValidInstitution(institutionA.address)).wait(),
            (await zkDocument.addValidInstitution(institutionB.address)).wait(),
            (await zkDocument.addValidInstitution(institutionC.address)).wait(),
            (await zkDocument.addValidInstitution(institutionD.address)).wait(),
        ]
        await Promise.all(addInstitutions)

        let subZkDocument = zkDocument.connect(submittor)
        let values = [randomBigInt(31), randomBigInt(31), randomBigInt(31), randomBigInt(31)]
        let secrets = [randomBigInt(31), randomBigInt(31), randomBigInt(31), randomBigInt(31)]
        let commits: BigInt[] = []
        let fields: string[] = []
        for (let i = 0; i < values.length; i++) {
            let commit = await poseidon2(values[i], secrets[i])
            commits.push(commit)
            fields.push(toHex(commit))
        }

        let institutions: [string, string, string, string] = 
            [institutionA.address, institutionB.address, institutionC.address, institutionD.address]

        await (await subZkDocument.postFields(fields as any, institutions)).wait()

        let fieldIndex0 = await zkDocument.getFieldIndex(submittor.address, 0)
        let fieldIndex1 = await zkDocument.getFieldIndex(submittor.address, 1)
        let fieldIndex2 = await zkDocument.getFieldIndex(submittor.address, 2)
        let fieldIndex3 = await zkDocument.getFieldIndex(submittor.address, 3)

        let attestations = [
            (await zkDocument.connect(institutionA).attest(fieldIndex0)).wait(),
            (await zkDocument.connect(institutionB).attest(fieldIndex1)).wait(),
            (await zkDocument.connect(institutionC).attest(fieldIndex2)).wait(),
            (await zkDocument.connect(institutionD).attest(fieldIndex3)).wait(),
        ]
        await Promise.all(attestations)

        let fakeProof = "0xabcd"

        await subZkDocument.validateSubmitter(fakeProof)
        let validatedSubmitters = await zkDocument.getValidatedSubmitters()
        expect(validatedSubmitters.findIndex(addr => addr.toLowerCase() === submittor.address.toLowerCase()) !== -1).to.be.true
    })
})