# zkDocs Backend
The zkdocs-backend workspace contains the circom circuits / generators and contracts for verifying zkDocs on an EVM chain. The goal of this repo is to streamline the use of zero-knowledge documents via a schema. The idea is that users can fill out a simple human readable json schema and this repo will do the work to generate circuits and contracts to enable users to have customizable privacy documents.

## Highlevel 
Here is an example schema (`./schemas/test_schemas/tax_bracket.json`) which verifies that a user is within a tax bracket ($100,000 , $200,000).
```
{
    "fields": [
        {
            "field_name": "investment_account_number",
            "human_name": "Investment Account Number",
            "description": "Account number at investment institution.",
            "string": true
        },
        {
            "field_name": "investment_account_profits",
            "human_name": "Investment Account Profits",
            "description": "Total investment account profits last year."
        },
        {
            "field_name": "employee_id",
            "human_name": "Employee ID",
            "description": "Employee ID number. Used for employer to verify salary info.",
            "string": true
        },
        {
            "field_name": "salary",
            "human_name": "Salary",
            "description": "Last year total salary."
        }
    ],
    "constraints": [
        {
            "fieldA": "investment_account_profits",
            "fieldB": "salary",
            "op": "ADD",
            "constraint": "GT",
            "constant": 100000 
        },
        {
            "fieldA": "investment_account_profits",
            "fieldB": "salary",
            "op": "ADD",
            "constraint": "LT",
            "constant": 200000 
        }
    ],
    "trusted_institutions": [
        {
            "address": "0x1500Df59d0Ea6a053dAEC04044d5EE5240083964",
            "human_name": "Charles Schwab"
        },
        {
            "address": "0x15004E1114C1C090D06EaE7dC6a5ee233a621Fa2",
            "human_name": "University of Chicago LLC"
        },
        {
            "address": "0x35f30531Da281384831481499861900966e782Cc",
            "human_name": "JP Morgan"
        },
        {
            "address": "0x699fC82ab59C3b278d07538A05D2F0053f38B2B4",
            "human_name": "Internal Revenue Service"
        },
        {
            "address": "0x8401C74DB59F67fe7A9A07910C8118807a6F9c07",
            "human_name": "SEC"
        }
    ]
}
```
For each field the user puts a "commitment" on chain. 

For each constraint we add some circuitry to the circom circuit. These can be thought of as aggregations over the private fields. The algebra / comparisons are quite limited for now, of the form: `<constraint.fieldA> <OP> <constraint.fieldB> <LT / GT> <constant / fieldCompare>`. 

Each trusted_institution is added by the admin to the on chain contract such that they can attest to the submitters commitments.

Submitters can selectively reveal fields to trusted institutions (attesters) by sending the `(value, nonce)` tuple off-chain. The intention here was that these values would be sent as search params in a URL over some encrypted message channel. The attester can be sure that the submitter has sent valid values by computing the commitment locally and comparing to the commitment on-chain.

Finally a third party verifier can ensure that a user has filled out the schema truthfully based on the boolean on chain and no knowledge of the values of the fields themselves. This boolean could not be set unless all fields have been attested to by trusted attesters and the fields satisfy the constraints.

## zkDoc Contract
The `ZkDocument.sol` contract stores commitments for multiple users against the same schema and allows users to flip a `validated` bit once their attestations have been completed and their proof has been submitted. Validating the proof and attestations on-chain allows verifiers to confirm the validity of a given users by simply looking up a boolean on-chain rather than re-running the proof. 

There are plenty of valid use-cases where you'd want to verify the proof off chain, this can be done as well.

Based on the data model, users can only fill out the form with commitments once.

## Contract Data Model
On the contract we store:
```
mapping(address => bool) public trustedInstitutions; // (admin updated)
mapping(bytes32 => bytes32) public fieldCommitments; // Map field_index => commitment (submitter updated)
mapping(bytes32 => address) public requiredCommitmentAttestations; // Map field_index => attester addr (submitter updated)
mapping(bytes32 => bool) public attestations; // (attester updated)
mapping(address => bool) public validatedSubmitters; // (submitter updated)
```

Field indexes are defined by the following function:
```
function getFieldIndex(address user, uint fieldIndex) public pure returns (bytes32) {
    return keccak256(abi.encodePacked(user, fieldIndex));
}
```
Field indexes are used instead of the commitment directly to prevent malicious submitter commitment collision.

Steps to fill out data model:
1. (admin) Deploy zkDoc contract per schema
2. (admin) Add trusted institutions
3. (submitter) For each field: generate nonce, `commitment = poseidon2(value, nonce)`, store all locally
4. (submitter) `zkDoc.postFields(commitments, institutions)` (fills out fieldCommitments, requiredCommitmentAttestations)
5. (every required attester) `zkDoc.attestMultiple([fieldsRequiringAttestation])`
6. (submitter) `zkDoc.validateSubmitter(proof)`
Steps 3-6 can be repeated per public key.

## Generator
The Generator (`./generator/ZkDocGenerator.ts`) is a schema -> circom circuit compiler and snarkjs wrapper which is opinionated about file paths. The `ZkDocGenerator.buildAll()` method will build the circuit and zkey and outputs artifacts to `./circuit_cache/..`. `ZkDocGenerator.genSol()` generates a circom solidity Plonk verifier based on the zkey generated in previous steps and outputs result artifacts to `./contracts/compiled`. 

## Generated Circuit
- Checks `poseidon2(value + nonce) == commitment` for each schema field
- Checks each constraint

## Schema Hash
The contract itself stores the Keccak256 hash of the flattened schema file. The sample UI `./zkdocs-ui` uses this to lookup the schema against the contract, but the goal is to hinder a client-side / supply chain attack against the UI.

## String Fields
Each schema field has an optional `string` proprety. These fields are ASCII encoded to BigInts. If non-ascii characters are provided they will be encoded as "00". Currently these are capped at 31 ASCII characters long.

## Constraints
Currently the constraint specification system is limited. For now it allows the following types of constraints:
- `<fieldA> <op: SUB / ADD> <fieldB> <constraint>  <constant / fieldCompare>`

Both simpler and more complex LHS and RHS statements are easy to implement but currently unsupported by the transpiler.

## Commands 
- Test: `yarn hardhat test`
- Compile contracts: `yarn hardhat compile`
- Run local node: `yarn hardhat node`
- Build deploy schema: `yarn hardhat build-deploy-schema --schema ./path/to/schema --network localhost`
- Build schema: `yarn hardhat build-schema --schema ./path/to/schema`
- Deploy schema (based on contents of `./circuit_cache/`): `yarn hardhat deploy-schema --network localhost --schema ./path/to/schema`

## Future Work
- [ ] Improved constraint system for transpiler
- [ ] More granular permissions on trustedInstitutions
- [ ] Use a mixer on trustedInstitutions to obsfuscate
- [ ] Fully off-chain version proof / broadcasting system
- [ ] Contracts can be made significantly more gas efficient with slightly different assumptions (ex: one submitter, one institution, specific institution per field, etc)
- [ ] Longer string field types

## Disclaimer
_These smart contracts are being provided as is. No guarantee, representation or warranty is being made, express or implied, as to the safety or correctness of the user interface or the smart contracts. They have not been audited and as such there can be no assurance they will work as intended, and users may experience delays, failures, errors, omissions or loss of transmitted information. In addition, any airdrop using these smart contracts should be conducted in accordance with applicable law. Nothing in this repo should be construed as investment advice or legal advice for any particular facts or circumstances and is not meant to replace competent counsel. It is strongly advised for you to contact a reputable attorney in your jurisdiction for any questions or concerns with respect thereto.  a16z is not liable for any use of the foregoing and users should proceed with caution and use at their own risk. See a16z.com/disclosure for more info._
