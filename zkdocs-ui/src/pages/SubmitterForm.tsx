import { useEffect, useState } from "react";
import { useAccount, useContractWrite } from "wagmi";
import {
    displayInstitution,
    generateProofAndCallData,
    randomNonce,
    toHex,
    unpackWagmiWriteError,
} from "../lib/Utils";
import { ZkDocSchema, InstitutionDetails, poseidon3 } from "zkdocs-lib";
import { abi as ContractAbi } from "../ABIs/ZKDocument.json";
import { useSearchParams } from "react-router-dom";
import ConstraintDisplay from "../widgets/ConstraintDisplay";
import AttestationLinkWizard from "../widgets/AttestationLinkWizard";
import SelectDocWidget from "../widgets/SelectDocWidget";
import {
    getSchemaJsonUrl,
    getSchemaWasmBuffer,
    getSchemaZkeyBuffer,
    SchemaAndMeta,
} from "../lib/SchemaUtils";

export default function SubmitterForm() {
    let [searchParams, updateSearchParams] = useSearchParams();
    let schemaName = searchParams.get("schema");
    let contractAddr = searchParams.get("contractAddr");
    let schemaPath = getSchemaJsonUrl(schemaName!);

    let [schema, setSchema] = useState<ZkDocSchema>();

    let [inputFields, setInputFields] = useState<string[]>();
    let [attesters, setAttesters] = useState<string[]>();
    let [updateState, forceUpdate] = useState<boolean>();

    let [nonces, setNonces] = useState<string[]>();
    let [commits, setCommits] = useState<string[]>();

    let { data: accountData } = useAccount();

    let [proofInProgress, setProofInProgress] = useState<boolean>(false);
    let [proof, setProof] = useState<string>("");

    let [error, setError] = useState<string>("");

    let { error: contractWriteError, write: contractWrite } = useContractWrite(
        {
            addressOrName: contractAddr ? contractAddr! : "",
            contractInterface: ContractAbi,
        },
        "postFields",
        {
            args: [commits, attesters],
        }
    );

    // When schema is set, update search params
    let docSelectorCallback = (schemaAndMeta: SchemaAndMeta) => {
        updateSearchParams({
            schema: schemaAndMeta.schemaName,
            contractAddr: schemaAndMeta.contractAddr!,
        });
    };

    // When schema is set, load data
    useEffect(() => {
        if (schemaName !== null) {
            fetch(schemaPath)
                .then((fetched) => fetched.json())
                .then((json) => {
                    let schema = new ZkDocSchema(json, schemaName!);
                    setSchema(schema);
                    setAttesters(
                        schema.json.fields.map(
                            (f) => schema.json.trusted_institutions[0].address
                        )
                    ); 
                    // default drop-downs
                    setInputFields(schema.json.fields.map((f) => ""));
                });
        }
    }, [schemaName, schemaPath]);

    // If error, unpack
    useEffect(() => {
        if (contractWriteError !== null) {
            let error = unpackWagmiWriteError(contractWriteError);
            if (error) {
                setError(error);
            } else {
                setError("Unknown contract write error.");
            }
        }
    }, [contractWriteError]);

    if (!(searchParams.has("schema") && searchParams.has("contractAddr"))) {
        return (
            <SelectDocWidget
                setSchemaMeta={docSelectorCallback}
            ></SelectDocWidget>
        );
    }

    let setField = (index: number, newVal: string) => {
        inputFields![index] = newVal;
        setInputFields(inputFields);
        forceUpdate(!updateState);
    };

    let updateAttester = (index: number, val: string) => {
        attesters![index] = val;
        setAttesters(attesters);
    };

    let startCalculateProof = () => {
        setProofInProgress(true);
        calculateProof(
            inputFields!,
            schema!,
            setNonces,
            setCommits,
            setProof,
            setProofInProgress,
            setError
        );
    };

    if (schema && inputFields) {
        return (
            <div className="p-5 rounded-md shadow-md">
                <div className="grid grid-cols-3 text-center font-medium">
                    <div>Field</div>
                    <div>Input</div>
                    <div>Attester</div>
                </div>

                {/* ROOT FORM */}
                {schema!.json.fields.map((field, index) => {
                    return (
                        <div
                            key={index}
                            className="grid grid-cols-3 border-t p-3"
                        >
                            <div>
                                <label className="block text-sm font-medium text-gray-800">
                                    {field.human_name}
                                </label>
                                <label className="block text-sm text-gray-600">
                                    {field.description}
                                </label>
                            </div>
                            <div className="flex rounded-md ml-4 mr-4">
                                <input
                                    type="text"
                                    name={"input_" + field.field_name}
                                    className="block rounded-md w-full border-gray-300 text-sm"
                                    value={inputFields![index]}
                                    onChange={(evt) =>
                                        setField(index, evt.target.value)
                                    }
                                />
                            </div>
                            <div className="ml-4 mr-4">
                                <select
                                    name="institution"
                                    className="block w-full border-gray-300 bg-white rounded-md shadow-sm"
                                    onChange={(evt) =>
                                        updateAttester(index, evt.target.value)
                                    }
                                >
                                    {schema!.json.trusted_institutions.map(
                                        (inst, index) => {
                                            return (
                                                <option
                                                    key={index}
                                                    value={inst.address}
                                                >
                                                    {displayInstitution(inst)}
                                                </option>
                                            );
                                        }
                                    )}
                                </select>
                            </div>
                        </div>
                    );
                })}

                {/* CONSTRAINTS */}
                <div className="bg-white shadow overflow-hidden rounded-lg mt-2">
                    <div className="p-4">
                        <h3 className="text-lg">Constraints</h3>
                        <p className="text-sm text-gray-500">
                            Form is valid when the following constraints are
                            met.
                        </p>
                    </div>
                    <div className="border-t border-gray-200 p-4 pt-0">
                        {schema!.json.constraints.map((constraint, index) => {
                            return (
                                <ConstraintDisplay
                                    constraint={constraint}
                                    schema={schema!}
                                    fieldVals={inputFields!}
                                    key={index}
                                ></ConstraintDisplay>
                            );
                        })}
                    </div>
                </div>

                {/* PROOF */}
                <div className="shadow overflow-hidden rounded-lg mt-4">
                    <div
                        className="grid grid-cols-2 bg-green-100 hover:bg-green-300 active:bg-green-400"
                        onClick={startCalculateProof}
                    >
                        <div className="p-4">
                            <h3 className="text-lg">Create Proof</h3>
                            <p className="text-sm text-gray-500">
                                Generate secrets and calculate proof. Will take
                                some time...
                            </p>
                        </div>
                        <div className="flex justify-end items-center mr-8 animate-pulse text-md">
                            {proofInProgress ? "Calculating..." : ""}
                        </div>
                    </div>
                    {proof !== "" ? (
                        <div className="bg-white font-mono border-t w-100 p-4 text-ellipsis">
                            <div className="m-1 flex rounded-md">
                                <input
                                    type="text"
                                    name="proof"
                                    id="proof"
                                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border-gray-300"
                                    placeholder={proof}
                                    readOnly={true}
                                />
                                <button
                                    className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-400 active:bg-gray-500"
                                    onClick={() =>
                                        navigator.clipboard.writeText(proof)
                                    }
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    ) : (
                        <></>
                    )}
                </div>

                {/* ATTESTATION LINK WIZARD */}
                {inputFields &&
                nonces&&
                attesters &&
                accountData &&
                accountData!.address ? (
                    <div className="shadow overflow-hidden rounded-lg mt-4 bg-white">
                        <div className="p-4">
                            <h3 className="text-lg">Attestation links</h3>
                            <p className="text-sm text-gray-500">
                                Collect some attestation links to send to your
                                attesters.{" "}
                            </p>
                        </div>
                        <AttestationLinkWizard
                            vals={inputFields!}
                            nonces={nonces!}
                            attesters={detailsForAttesters(schema, attesters!)}
                            submitter={accountData!.address!}
                            contractAddr={contractAddr!}
                        ></AttestationLinkWizard>
                    </div>
                ) : (
                    <></>
                )}

                {/* SUBMIT */}
                {inputFields && nonces && commits && attesters && accountData ? (
                    <div
                        className="shadow rounded-lg mt-4 bg-green-100 hover:bg-green-300 active:bg-green-400"
                        onClick={() =>
                            submit(commits!, attesters!, contractWrite)
                        }
                    >
                        <div className="p-4">
                            <h3 className="text-lg">Submit</h3>
                            <p className="text-sm text-gray-500">
                                Store commitments to chain for attestation.{" "}
                            </p>
                        </div>
                    </div>
                ) : (
                    <></>
                )}

                {/* ERROR */}
                {error ? (
                    <div className="mt-5 p-4 bg-red-300 rounded-md">
                        {" "}
                        {"Error: " + error.toString()}{" "}
                    </div>
                ) : (
                    <></>
                )}
            </div>
        );
    } else {
        return <div>not loaded</div>;
    }
}

function submit(commits: string[], attesters: string[], writeHook: any) {
    if (commits.length !== attesters.length) {
        console.error("Cannot submit: commits.length != attesters.length");
        return;
    }
    writeHook();
}

// Converts an array of attester addresses into an array of ZkDocSchema.attesters
function detailsForAttesters(
    schema: ZkDocSchema,
    attesters: string[]
): InstitutionDetails[] {
    return attesters.map((addr) => {
        return schema.json.trusted_institutions.find(
            (inst) => inst.address.toLowerCase() === addr.toLowerCase()
        )!;
    });
}

async function calculateProof(
    rawVals: string[],
    schema: ZkDocSchema,
    setNoncesCallback: any,
    setCommitsCallback: any,
    setProofCallback: any,
    setLoadingCallback: any,
    setErrorCallback: any
) {
    if (!schema.validateValuesList(rawVals)) {
        setErrorCallback("Values are invalid.");
        setLoadingCallback(false);
        return;
    }

    let vals = schema.convertValueList(rawVals);
    let nonces = []
    for (let i = 0; i < vals.length; i++) {
        // Two 31 byte nonces per commitment
        // Note: This is a mediocre source of randomness
        nonces.push(randomNonce())
        nonces.push(randomNonce())
    }
    let commits: BigInt[] = [];

    for (let i = 0; i < vals.length; i++) {
        let val = vals[i];
        let commit = await poseidon3(val, nonces[2*i], nonces[2*i+1]);
        commits.push(commit);
    }
    let consts = schema.json.constraints
        .filter((constraint) => constraint.constant)
        .map((constraint) => BigInt(constraint.constant!));

    let wasm = await getSchemaWasmBuffer(schema.name);
    let zkey = await getSchemaZkeyBuffer(schema.name);
    let callData = await generateProofAndCallData(
        vals,
        nonces,
        commits,
        consts,
        wasm,
        zkey
    );

    setProofCallback(callData);

    let noncesHex = nonces.map((nonce) => toHex(nonce));
    let commitsHex = commits.map((commit) => toHex(commit));

    setNoncesCallback(noncesHex);
    setCommitsCallback(commitsHex);

    setLoadingCallback(false);
}
