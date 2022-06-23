import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAccount, useProvider } from "wagmi";

import { SchemaAndMeta } from "../lib/SchemaUtils";
import { getAttestationUrlNoPrefix } from "../widgets/AttestationLinkWizard";
import SelectDocWidget from "../widgets/SelectDocWidget";
import { abi as ZkDocAbi } from "../ABIs/ZKDocument.json";

export default function ListVerifiedSubmittersPage() {
    let { data: accountData } = useAccount();
    let [searchParams, updateSearchParams] = useSearchParams();
    let docAddr = searchParams.get("contractAddr")!;
    let provider = useProvider();

    let [error, setError] = useState<string>("");
    let [verifiedUsers, setVerifiedUsers] = useState<string[]>([]);

    let docSelectorCallback = (schemaAndMeta: SchemaAndMeta) => {
        updateSearchParams({ contractAddr: schemaAndMeta.contractAddr! });
    };

    let lookupDetails = async () => {
        let contract = new ethers.Contract(docAddr, ZkDocAbi, provider);

        let users = await contract.getValidatedSubmitters();
        setVerifiedUsers(users);
    };

    let unpreparedToQuery =
        docAddr === null ||
        docAddr === "" ||
        !accountData ||
        !accountData.address;

    useEffect(() => {
        if (!unpreparedToQuery) {
            lookupDetails().catch((err) => {
                console.error(err);
                setError(err.toString());
            });
        }
    }, [unpreparedToQuery, docAddr, accountData]);

    if (unpreparedToQuery) {
        // Handles wallet connection and contractAddr
        return (
            <SelectDocWidget
                setSchemaMeta={docSelectorCallback}
            ></SelectDocWidget>
        );
    } else {
        return (
            <div>
                <h1 className="text-lg font-medium m-4 text-gray-800">
                    Verified users for {docAddr}
                </h1>
                <div className="m-4 rounded border bg-white">
                    {verifiedUsers.map((user, index) => {
                        let attestationUrl = getAttestationUrlNoPrefix(
                            accountData!.address!,
                            docAddr
                        );
                        return (
                            <Link to={attestationUrl} key={index}>
                                <div className="px-4 py-2 text-gray-700 border-t hover:bg-gray-100">
                                    {user}
                                </div>
                            </Link>
                        );
                    })}
                </div>

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
