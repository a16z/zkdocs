import { CircuitTemplate } from "./CircuitTemplate";
import { ZkDocSchema } from "zkdocs-lib";

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { exit } from "process";
import path from "path";

const util = require('util');
const exec = util.promisify(require('child_process').exec);


/**
 * Util: wraps  ZkDocSchema, helps generate the circuit and corresponding build files.
 *         __    ________                        
 * _______|  | __\______ \   ____   ____   ______
 * \___   /  |/ / |    |  \ /  _ \_/ ___\ /  ___/
 *  /    /|    <  |    `   (  <_> )  \___ \___ \ 
 * /_____ \__|_ \/_______  /\____/ \___  >____  >
 *       \/    \/        \/            \/     \/ 
 */
export class ZkDocGenerator {
    public constructor(
        public schema: ZkDocSchema, 
        public rootBuildPath: string, 
        public potFilePath: string,
        public circuitName: string = "circuit",
        public importPathPrefix: string = "") {

        if (!existsSync(rootBuildPath)){
            mkdirSync(rootBuildPath);
        }
    }

    public async buildAll() {
        await this.buildCircuit();
        await this.genZkey();
    }

    public async buildCircuit() {
        // Write circuit
        let circuitPath = `${this.rootBuildPath}/${this.circuitName}.circom`;
        let constraintStr = this.generateConstraintString();
        let circuitString = CircuitTemplate(
            this.schema.json.fields.length, 
            this.schema.json.constraints.filter(constraint => constraint.constant).length, 
            constraintStr,
            this.importPathPrefix);
        writeFileSync(circuitPath, circuitString);

        // Build circuit
        let buildCmd = `circom ${circuitPath} --sym --wasm --r1cs -o ${this.rootBuildPath}`;
        let { stdout, stderr } = await exec(buildCmd);
        if (stdout != "") {
            console.log("Circom build: \n", stdout);
        }
        if (stderr != "") {
            console.error("Circom build failed: \n", stderr);
        }
    }

    public async genZkey() {
        let genCmd = `snarkjs plonk setup ${this.rootBuildPath}/${this.circuitName}.r1cs ${this.potFilePath} ${this.rootBuildPath}/${this.circuitName}_final.zkey`;
        let { stdout, stderr } = await exec(genCmd);
        if (stdout != "") {
            console.log("snarkjs gen zkey: \n", stdout);
        }
        if (stderr != "") {
            console.error("snarkjs gen zkey build failed: \n", stderr);
        }
    }

    public async genSol(destination?: string, fileName: string = "PlonkVerifier") {
        if (destination === undefined) {
            destination = path.join(__dirname, "..", "contracts", "compiled")
        }
        let cmd = `snarkjs zkey export solidityverifier ${this.rootBuildPath}/${this.circuitName}_final.zkey ${destination}/${fileName}.sol`
        let { stdout, stderr } = await exec(cmd);
        if (stdout != "") {
            console.log("snarkjs gen zkey: \n", stdout);
        }
        if (stderr != "") {
            console.error("snarkjs gen zkey build failed: \n", stderr);
        }
    }

    public async exportVkey() {
        let cmd = `snarkjs zkey export verificationkey ${this.rootBuildPath}/${this.circuitName}_final.zkey ${this.rootBuildPath}/verification_key.json`
        let { stdout, stderr } = await exec(cmd);
        if (stdout != "") {
            console.log("snarkjs gen zkey: \n", stdout);
        }
        if (stderr != "") {
            console.error("snarkjs gen zkey build failed: \n", stderr);
        }
    }

    private generateConstraintString(): string {
        let constIndex = 0;
        let constraints = this.schema.json.constraints.map((constraint, index) => {
            let constraintVarName = `constraint${index}`
            let constraintStr = `var ${constraintVarName} = `;
            if (constraint.op == "ADD") {
                constraintStr += `values[${this.lookupFieldIndex(constraint.fieldA)}] + values[${this.lookupFieldIndex(constraint.fieldB)}];\n`
            } else if (constraint.op == "SUB") {
                constraintStr += `values[${this.lookupFieldIndex(constraint.fieldA)}] - values[${this.lookupFieldIndex(constraint.fieldB)}];\n`
            } else if (constraint.op == "NONE") {
                constraintStr += `values[${this.lookupFieldIndex(constraint.fieldA)}];\n`
            } else {
                console.error("Cannot generate constraint from OP ", constraint);
                exit(-1);
            }

            let componentName = `comp${index}`
            constraintStr += `component ${componentName} = `
            if (constraint.constraint == "GT") {
                constraintStr += "GreaterEqThan(32);\n";
            } else if (constraint.constraint == "LT") {
                constraintStr += "LessEqThan(32);\n";
            } else {
                console.error("Cannot generate constraint from constraint ", constraint)
                exit(-1);
            }

            constraintStr += `${componentName}.in[0] <== ${constraintVarName};\n`
            constraintStr += `${componentName}.in[1] <== `
            
            if (constraint.constant) {
                constraintStr += `consts[${constIndex}];\n`;
                constIndex += 1;
            } else if (constraint.fieldCompare) {
                constraintStr += `values[${this.lookupFieldIndex(constraint.fieldCompare!)}];\n`
            } else {
                console.error("Constraint didn't have constant nor fieldCompare.") // Shouldn't happen
            }

            constraintStr += `${componentName}.out === 1;\n\n`;
            return constraintStr;
        }).reduce((full, next) => {
            return full += next;
        })

        return constraints 
    }

    private lookupFieldIndex(fieldName: string): number {
        let index = this.schema.json.fields.findIndex(field => field.field_name == fieldName);
        if (index == -1) {
            console.error(`Failed to lookup field ${fieldName} in schema.`);
            exit(-1);
        }
        return index;
    }
}