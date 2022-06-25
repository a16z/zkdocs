import "./App.css";

import { Link, Outlet } from "react-router-dom";
import {
    useAccount,
    useConnect,
    useDisconnect,
    useNetwork,
    useProvider,
} from "wagmi";
import { InjectedConnector } from "wagmi/connectors/injected";
import { SendHardhatFunds } from "./lib/TestUtils";

function App() {
    let { data: accountData } = useAccount();
    let { connect } = useConnect({
        connector: new InjectedConnector(),
    });
    let { disconnect } = useDisconnect();

    let { activeChain } = useNetwork();
    let provider = useProvider();

    return (
        <div className="App bg-gray-100 h-screen">
            <header className="App-header">
                <div className="w-100 grid grid-cols-2 bg-orange-400 p-2 shadow-sm">
                    <div>
                        <Link to="/">
                            <h1 className="font-mono text-xl font-black text-white">
                                zkDocs
                            </h1>
                        </Link>
                    </div>
                    <div className="flex justify-end">
                        {accountData ? (
                            <div>
                                {/* If hardhat local, display faucet */}
                                {activeChain?.id === 31337 ? (
                                    <button
                                        className="bg-green-400 hover:bg-green-600 rounded-full px-3 border-2 border-black font-mono text-sm"
                                        onClick={() =>
                                            SendHardhatFunds(
                                                provider,
                                                accountData?.address!
                                            )
                                        }
                                    >
                                        $
                                    </button>
                                ) : (
                                    <></>
                                )}

                                <button
                                    className="bg-white hover:bg-slate-200 rounded-full px-3 mx-2 border-2 border-black font-mono text-sm"
                                    onClick={() => disconnect()}
                                >
                                    Disconnect
                                </button>
                            </div>
                        ) : (
                            <div>
                                <button
                                    className="bg-white hover:bg-slate-200 rounded-full px-3 border-2 border-black font-mono text-sm"
                                    onClick={() => connect()}
                                >
                                    Connect Wallet
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <Outlet></Outlet>
        </div>
    );
}

export default App;
