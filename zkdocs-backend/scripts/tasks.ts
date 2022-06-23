import path from "path";
import { readFileSync } from "fs";
import { ZkDocSchema } from "zkdocs-lib";
import { ZkDocGenerator } from "../generator/ZkDocGenerator";
import { keccakJson } from "zkdocs-lib";

const POT_PATH = path.join(__dirname, "..", "build", "pot16_final.ptau");
const CACHE_DIR = path.join(__dirname, "..", "circuit_cache")

export async function buildAndDeploySchema(args: any, hre: any) {
    await build(args.schema)
    await hre.run("compile")
    await deploy(args.schema, hre)
}

export async function buildSchema(args: any) {
    await build(args.schema)
}

export async function deploySchema(args: any, hre: any) {
    await deploy(args.schema, hre)
}

async function build(schemaPath: string) {
    let json = readFileSync(schemaPath).toString()
    let schema = ZkDocSchema.parseFromString(json)!

    // Generate the schema
    let generator = new ZkDocGenerator(schema, CACHE_DIR, POT_PATH, "circuit", "../")
    await generator.buildAll()
    await generator.genSol()
}

async function deploy(schemaPath: string, hre: any) {
    let json = readFileSync(schemaPath).toString()
    let schema = ZkDocSchema.parseFromString(json)!
    let schemaHash = keccakJson(json) 

    let [deploySigner] = await hre.ethers.getSigners()

    let verifierFactory = await hre.ethers.getContractFactory("PlonkVerifier", deploySigner)
    let zkDocFactory = await hre.ethers.getContractFactory("ZKDocument", deploySigner)

    let verifier = await verifierFactory.deploy()
    let consts = schema.json.constraints
        .filter(constraint => constraint.constant)
        .map(constraint => constraint.constant)
    let zkDoc = await zkDocFactory.deploy(
        consts, 
        schema.json.fields.length, 
        verifier.address, 
        schemaHash)

    await (await zkDoc.addValidInstitutions(schema.json.trusted_institutions.map(inst => inst.address))).wait()

    console.log("\nDeploying contracts")
    console.log(`- Deployer public key: ${deploySigner.address}`)
    console.log(`- Plonk Verifier address: ${verifier.address} \n- zkDoc address: ${zkDoc.address}`)
}