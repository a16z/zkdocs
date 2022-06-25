import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAccount, useContractWrite, useProvider } from "wagmi";
import { findSchemaForHash } from "../lib/SchemaUtils";
import { abi as ZkDocAbi } from "../ABIs/ZKDocument.json";
import { poseidon3, ZkDocField, ZkDocSchema } from "zkdocs-lib";
import { Transition } from "@headlessui/react";
import {
    LockOpenIcon,
    LockClosedIcon,
    ShieldExclamationIcon,
} from "@heroicons/react/solid";
import { unpackWagmiWriteError } from "../lib/Utils";

interface Field {
    index: number;
    fieldIndex: string;
    value?: string;
    nonce1?: string;
    nonce2?: string;
    commit: string;
    attester: string;
    attester_readable?: string;
    attested: boolean;
    schemaField: ZkDocField;
}

export default function AttestationPage() {
    let [searchParams] = useSearchParams();

    let [fields, setFields] = useState<Field[]>([]);
    let [updateState, forceUpdate] = useState<boolean>(false);
    let [error, setError] = useState<string>("");

    let { data: accountData } = useAccount();
    let provider = useProvider();

    // Pull search params
    let submitter = searchParams.get("submitter")!;
    let docAddr = searchParams.get("addr")!;
    let vals = searchParams.has("vals")
        ? searchParams.get("vals")!.split(",")
        : [];
    let secs = searchParams.has("secs")
        ? searchParams.get("secs")!.split(",")
        : [];
    let fieldIndices = searchParams.has("fieldIndices")
        ? searchParams
              .get("fieldIndices")!
              .split(",")
              .map((value) => Number(value))
        : [];

    let lookupDetails = async () => {
        let contract = new ethers.Contract(docAddr, ZkDocAbi, provider);

        // Lookup schema by hash
        let hash = await contract.schemaHash();
        let schemaMeta = await findSchemaForHash(hash);
        if (schemaMeta === undefined) {
            setError(`Failed to find matching local schmea for hash: ${hash}`);
            return;
        }
        let schema = ZkDocSchema.parseFromString(
            schemaMeta.schema,
            schemaMeta.schemaName
        );
        if (schema === undefined) {
            setError("Schema failed to parse");
            return;
        }

        // Lookup field indexes, commits, attestors, attestations
        let fields: Field[] = [];
        for (let i = 0; i < schema!.json.fields.length; i++) {
            let fieldIndex = await contract.getFieldIndex(submitter, i); // Can be done locally instead
            let commit = await contract.fieldCommitments(fieldIndex);
            let attester = await contract.requiredCommitmentAttestations(
                fieldIndex
            );
            let attestation = await contract.attestations(fieldIndex);
            let attesterReadable = schema.json.trusted_institutions.find(
                (inst) => inst.address.toLowerCase() === attester.toLowerCase()
            )?.human_name;
            let field: Field = {
                index: i,
                fieldIndex: fieldIndex,
                commit: commit,
                attester: attester,
                attester_readable: attesterReadable,
                attested: attestation,
                schemaField: schema!.json.fields[i],
            };
            let searchParamIndex = fieldIndices.indexOf(i);
            if (searchParamIndex !== -1) {
                field.value = vals[searchParamIndex];
                field.nonce1 = secs[2*searchParamIndex];
                field.nonce2 = secs[2*searchParamIndex + 1];

                // Confirm field hash locally
                let value: BigInt;
                if (schema!.json.fields[i].string) {
                    value = ZkDocSchema.encodeStringToBigInt(field.value);
                } else {
                    value = BigInt(field.value);
                }
                let calcedCommit = await poseidon3(value, BigInt(field.nonce1), BigInt(field.nonce2));
                if (calcedCommit !== BigInt(commit)) {
                    setError(
                        `Value / Secret passed for field ${i} do not hash to the commitment on chain.`
                    );
                    return;
                }
            }
            fields.push(field);
        }
        setFields([...fields]);
        setError("");
        forceUpdate(!updateState);
    };

    // Determine attestable fields based on connected wallet
    let attestableFields = [];
    if (accountData && accountData!.address) {
        for (let field of fields) {
            if (
                accountData!.address!.toLowerCase() ===
                field.attester.toLowerCase()
            ) {
                attestableFields.push(field);
            }
        }
    }

    let { write: writeAttestations, error: contractWriteError } =
        useContractWrite(
            {
                addressOrName: docAddr !== null ? docAddr : "",
                contractInterface: ZkDocAbi,
            },
            "attestMultiple",
            {
                args: [attestableFields.map((field) => field.fieldIndex)],
            }
        );

    // Require wallet to be connected for proper RPC information
    let preparedToQuery =
        submitter !== null &&
        docAddr !== null &&
        accountData &&
        accountData.address;

    useEffect(() => {
        if (preparedToQuery) {
            lookupDetails().catch((err) => {
                console.error(err);
                setError(err.toString());
            });
        }
    }, [preparedToQuery, submitter, docAddr, accountData]);

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

    if (submitter === null || docAddr === null) {
        return (
            <div className="m-4 p-4 bg-red-300 border rounded-md">
                Url params must include `submitter` + `addr`. This page is
                unviewable otherwise.
            </div>
        );
    } else if (!accountData || !accountData.address) {
        return (
            <div className="m-4 p-4 bg-blue-300 border rounded-md">
                Please connect wallet.
            </div>
        );
    } else {
        return (
            <div className="w-full shadow-md mt-4">
                {/* Titles */}
                <div className="grid grid-cols-3 text-center font-medium">
                    <div>Field</div>
                    <div>Value</div>
                    <div>Attester</div>
                </div>

                {/* Fields */}
                {fields.map((field, i) => {
                    return <FieldRow field={field} key={i}></FieldRow>;
                })}

                {/* Attest */}
                {attestableFields.length !== 0 ? (
                    <div className="border-t pb-1">
                        <div
                            className="m-3 grid grid-cols-3 rounded-md shadow-md bg-green-100 hover:bg-green-300 active:bg-green-400"
                            onClick={() => writeAttestations()}
                        >
                            <div className="p-4">
                                <h3 className="text-lg">Attest</h3>
                                <p className="text-sm text-gray-500">
                                    Send tx confirming fields which require
                                    attestation from your public key.
                                </p>
                            </div>

                            {/* Badges per attestable field*/}
                            <div className="text-sm m-6 justify-center text-center items-center inline-block">
                                {attestableFields.map((field, index) => {
                                    if (!field.value) {
                                        return (
                                            <span
                                                className="text-sm bg-red-300 rounded-md p-1 m-2 whitespace-nowrap"
                                                key={index}
                                            >
                                                {field.schemaField.human_name}:
                                                ???
                                            </span>
                                        );
                                    } else {
                                        return (
                                            <span
                                                className="text-sm bg-blue-200 rounded-md p-1 m-2 whitespace-nowrap"
                                                key={index}
                                            >
                                                {field.schemaField.human_name}:{" "}
                                                {field.value}
                                            </span>
                                        );
                                    }
                                })}
                            </div>
                            <div className="text-md m-4 font-medium grid justify-items-end items-center">
                                <span>
                                    <span className="text-sm bg-blue-200 p-2 rounded">
                                        {displayFieldAttester(
                                            attestableFields[0]
                                        )}
                                    </span>{" "}
                                    connected
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <></>
                )}

                {/* Error */}
                {error !== "" ? (
                    <div className="rounded-md bg-red-100 p-4 text-red-800 border-1 m-4">
                        {error.toString()}
                    </div>
                ) : (
                    <></>
                )}
            </div>
        );
    }
}

function displayFieldAttester(field: Field): string {
    return field.attester_readable ? field.attester_readable : field.attester;
}

function FieldRow(props: { field: Field }) {
    let [open, setOpen] = useState<boolean>(false);

    return (
        <div>
            <div
                className="grid grid-cols-3 border-t p-3 px-5 hover:bg-gray-200 items-center"
                onClick={() => setOpen(!open)}
            >
                <div>
                    <label className="block text-sm font-medium text-gray-800">
                        {props.field.schemaField.human_name}
                    </label>
                    <label className="block text-sm text-gray-600">
                        {props.field.schemaField.description}
                    </label>
                </div>
                <div>
                    <CommitVal
                        value={props.field.value}
                        commit={props.field.commit}
                    />
                </div>
                <div className="justify-items-end grid text-sm items-center">
                    <div>
                        <span className="font-medium">
                            {displayFieldAttester(props.field)}
                        </span>
                        <span
                            className={
                                (props.field.attested
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-200 text-gray-800") +
                                " rounded p-1 ml-4"
                            }
                        >
                            {props.field.attested ? "verified" : "unverified"}
                        </span>
                    </div>
                </div>
            </div>
            <Transition
                show={open}
                appear={true}
                className="transition duration-300"
                enter="ease-in-out"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-out"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
            >
                <div className="bg-gray-200 border-b border-gray-400 flex flex-row p-4 overflow-auto">
                    <div className="text-lg">Details</div>
                    <div className="text-md pl-4 pt-6 grid lg:grid-cols-2 md:grid-cols-1">
                        <div className="px-2">
                            <span>Value: </span>
                            <DetailField
                                value={props.field.value}
                            ></DetailField>
                        </div>
                        <div className="px-2">
                            Nonce 1:{" "}
                            <DetailField
                                value={props.field.nonce1}
                            ></DetailField>
                        </div>
                        <div className="px-2">
                            Nonce 2:{" "}
                            <DetailField
                                value={props.field.nonce2}
                            ></DetailField>
                        </div>
                        <div className="px-2">
                            Commit:{" "}
                            <DetailField
                                value={props.field.commit}
                            ></DetailField>
                        </div>
                        <div className="px-2">
                            Attester:{" "}
                            <DetailField
                                value={props.field.attester}
                            ></DetailField>
                        </div>
                        <div className="px-2">
                            Human name:{" "}
                            <DetailField
                                value={props.field.schemaField.human_name}
                            ></DetailField>
                        </div>
                        <div className="px-2">
                            Description:{" "}
                            <DetailField
                                value={props.field.schemaField.description}
                            ></DetailField>
                        </div>
                        <div className="px-2">
                            Schema name:{" "}
                            <DetailField
                                value={props.field.schemaField.field_name}
                            ></DetailField>
                        </div>
                        <div className="px-2">
                            String type:{" "}
                            <DetailField
                                value={
                                    props.field.schemaField.string
                                        ? "true"
                                        : "false"
                                }
                            ></DetailField>
                        </div>
                        <div className="px-2">
                            Verified:{" "}
                            <DetailField
                                value={props.field.attested ? "true" : "false"}
                            ></DetailField>
                        </div>
                    </div>
                </div>
            </Transition>
        </div>
    );
}

function CommitVal(props: { commit?: string; value?: string }) {
    let res = props.value !== undefined ? props.value! : props.commit;
    return (
        <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {props.value !== undefined ? (
                    <LockOpenIcon className="h-5 w-5 text-gray-400" />
                ) : (
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                )}
            </div>
            <input
                type="text"
                disabled={true}
                value={res}
                className={
                    (props.value === undefined ? "bg-gray-300" : "") +
                    " focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                }
                placeholder="you@example.com"
            />
        </div>
    );
}

function DetailField(props: { value?: string }) {
    if (props.value !== undefined) {
        return (
            <span className="rounded bg-slate-100 text-gray-800 px-1 font-medium border border-black text-sm">
                {props.value}
            </span>
        );
    } else {
        return (
            <ShieldExclamationIcon className="h-5 w-5 text-gray-500"></ShieldExclamationIcon>
        );
    }
}
