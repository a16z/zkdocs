import { ExclamationIcon } from "@heroicons/react/solid";

export default function ConnectWalletAlert() {
    return (
        <div>
            <div className="rounded-md bg-blue-50 m-4 p-4">
                <div className="flex justify-items-center">
                    <div className="flex-shrink-0 justify-items-center">
                        <ExclamationIcon className="h-5 w-5 text-blue-400"></ExclamationIcon>
                    </div>
                    <div className="text-blue-700 flex-1 text-sm">
                        Please connect wallet to continue.
                    </div>
                </div>
            </div>
        </div>
    );
}
