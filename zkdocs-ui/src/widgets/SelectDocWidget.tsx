import { ethers } from "ethers";
import { useState } from "react";
import { useAccount, useProvider } from "wagmi";
import { abi as ZkDocAbi } from "../ABIs/ZKDocument.json";
import { findSchemaForHash } from "../lib/SchemaUtils";
import ConnectWalletAlert from "./ConnectWalletAlert";

interface Props {
    setSchemaMeta: Function;
}

export default function SelectDocWidget(props: Props) {
    let [contractAddress, setContractAddress] = useState<string>("");
    let [error, setError] = useState<string>("");
    let provider = useProvider();

    let { data: accountData } = useAccount();

    const lookupSchema = async () => {
        if (contractAddress === undefined || contractAddress === "") {
            setError("Input address");
            return;
        }
        if (!ethers.utils.isAddress(contractAddress)) {
            setError("This doesn't look like an address...");
            return;
        }
        setError("");

        let contract = new ethers.Contract(
            contractAddress!,
            ZkDocAbi,
            provider
        );
        contract
            .schemaHash()
            .then(async (schemaHash: string) => {
                let schemaMeta = await findSchemaForHash(schemaHash);
                if (schemaMeta === undefined) {
                    setError("No schema found.");
                } else {
                    schemaMeta.contractAddr = contractAddress!;
                    props.setSchemaMeta(schemaMeta!);
                }
            })
            .catch((err: any) => setError(err));
    };

    if (accountData === null) {
        return <ConnectWalletAlert></ConnectWalletAlert>;
    } else {
        return (
            <div className="m-4 p-3">
                <div className="grid lg:grid-cols-2 md:grid-cols-1 p-3">
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-medium font-medium text-gray-700"
                        >
                            Doc Contract Address
                        </label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <div className="relative flex items-stretch flex-grow focus-within:z-10">
                                <input
                                    type="text"
                                    className="block w-full rounded-none rounded-l-md pl-4 border-gray-300"
                                    placeholder="0xBEEF"
                                    value={contractAddress}
                                    onChange={(evt) =>
                                        setContractAddress(evt.target.value)
                                    }
                                />
                                <button
                                    className="relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-green-200 hover:bg-green-400 active:bg-green-500"
                                    onClick={() => lookupSchema()}
                                >
                                    <span>Search</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ERRORS */}
                {error.toString() === "" ? (
                    ""
                ) : (
                    <div className="bg-red-50 p-4 rounded-md text-red-700">
                        <div>Error: {error.toString()}</div>
                    </div>
                )}
            </div>
        );
    }
}
