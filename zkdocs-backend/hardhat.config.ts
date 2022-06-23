import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "hardhat-gas-reporter";
import { task } from "hardhat/config";
import { buildAndDeploySchema, buildSchema, deploySchema } from "./scripts/tasks";

/**
 * Build schema. 
 *  - Circuit artifacts sent to ./circuit_cache
 *  - PlonkVerifier sent to ./contracts/compiled
 */
task("build-schema", "compile the schema.")
  .addParam("schema")
  .setAction(async (schema) => {
    await buildSchema(schema)
  })

task("deploy-schema", "deploy the schema.")
  .addParam("schema")
  .setAction(async (schema, hre) => {
    await deploySchema(schema, hre)
  })

task("build-deploy-schema", "build and deploy the schema.")
  .addParam("schema")
  .setAction(async (schema, hre) => {
    await buildAndDeploySchema(schema, hre)
  })

export default {
  solidity: "0.8.8",
  mocha: {
    timeout: 200000
  }
};
