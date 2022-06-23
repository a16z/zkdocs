import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAccount, useContractWrite } from "wagmi";

import { SchemaAndMeta } from "../lib/SchemaUtils";
import { getAttestationUrlNoPrefix } from "../widgets/AttestationLinkWizard";
import SelectDocWidget from "../widgets/SelectDocWidget";
import { abi as ZkDocAbi } from "../ABIs/ZKDocument.json";
import { unpackWagmiWriteError } from "../lib/Utils";

export default function ProofSubmissionPage() {
    let { data: accountData } = useAccount();
    let [searchParams, updateSearchParams] = useSearchParams();
    let schemaName = searchParams.get("schema");
    let docAddr = searchParams.get("contractAddr");

    let [proof, setProof] = useState<string>("");
    let [error, setError] = useState<string>("");

    let docSelectorCallback = (schemaAndMeta: SchemaAndMeta) => {
        updateSearchParams({
            schema: schemaAndMeta.schemaName,
            contractAddr: schemaAndMeta.contractAddr!,
        });
    };

    let { write: writeVerificationTx, error: contractWriteError } =
        useContractWrite(
            {
                addressOrName: docAddr !== null ? docAddr : "",
                contractInterface: ZkDocAbi,
            },
            "validateSubmitter",
            {
                args: [proof],
            }
        );

    useEffect(() => {
        if (contractWriteError !== null) {
            let error = unpackWagmiWriteError(contractWriteError);
            if (error) {
                setError(error);
            } else {
                setError("Unknown contract write error.");
            }
        }
    }, []);

    if (
        schemaName === null ||
        docAddr === null ||
        !accountData ||
        !accountData!.address
    ) {
        // Handles wallet connect recommendation as well
        return (
            <SelectDocWidget
                setSchemaMeta={docSelectorCallback}
            ></SelectDocWidget>
        );
    } else {
        let attestationUrl = getAttestationUrlNoPrefix(
            accountData!.address!,
            docAddr
        );
        return (
            <div className="mb-4">
                {/* Attestation callback */}
                <div className="m-4 p-4 rounded-md shadow-sm bg-slate-50">
                    <div>
                        <h3 className="text-lg">Attestation check</h3>
                        <div className="text-sm text-gray-600">
                            <Link to={attestationUrl}>{attestationUrl}</Link>
                        </div>
                    </div>
                </div>

                {/* Proof field */}
                <div className="m-4 p-4 rounded-md shadow-sm bg-slate-50">
                    <div>
                        <h3 className="text-lg">Enter proof</h3>
                        <div className="text-sm text-gray-600">
                            Copy your zk-proof data from your initial form
                            submission.
                        </div>
                    </div>
                    <div className="border-t mt-2 pt-2">
                        <input
                            type="text"
                            name="proof_field"
                            className="block rounded-md w-full border-gray-300 text-sm"
                            value={proof}
                            onChange={(evt) => setProof(evt.target.value)}
                        />
                    </div>
                </div>

                {/* Submit */}
                <div
                    className="m-4 rounded-md shadow-sm bg-green-100 hover:bg-green-300 active:bg-green-400"
                    onClick={() => writeVerificationTx()}
                >
                    <div className="p-4">
                        <h3 className="text-lg">Submit</h3>
                        <p className="text-sm text-gray-500">
                            Send tx verifying proof and verifying attestations.
                            If all fields are true and attested to, a bit will
                            be flipped on the contract.
                        </p>
                    </div>
                </div>

                {/* Error */}
                {error !== "" ? (
                    <div className="rounded-md bg-red-100 p-4 text-red-800 border-1 m-4">
                        {error}
                    </div>
                ) : (
                    <></>
                )}
            </div>
        );
    }
}
