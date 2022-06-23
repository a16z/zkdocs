import { getDefaultProvider, providers } from "ethers";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Provider, createClient } from "wagmi";
import App from "./App";
import AttestationPage from "./pages/AttestationPage";
import IndexPage from "./pages/IndexPage";
import ListVerifiedSubmittersPage from "./pages/ListVerifiedSubmittersPage";
import ProofSubmissionPage from "./pages/ProofSubmissionPage";
import SubmitterForm from "./pages/SubmitterForm";

const client = createClient({
    provider(config) {
        if (config.chainId! === 31337) {
            // Reroute the provider for localhost
            return new providers.JsonRpcProvider("http://localhost:8545");
        } else {
            return getDefaultProvider(config.chainId);
        }
    },
});

export default function Root() {
    return (
        <Provider client={client}>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<App />}>
                        <Route index element={<IndexPage />} />

                        <Route
                            path="form-fill"
                            element={<SubmitterForm></SubmitterForm>}
                        ></Route>
                        <Route
                            path="attestation"
                            element={<AttestationPage></AttestationPage>}
                        ></Route>
                        <Route
                            path="submit-proof"
                            element={
                                <ProofSubmissionPage></ProofSubmissionPage>
                            }
                        ></Route>
                        <Route
                            path="list-verified-submitters"
                            element={
                                <ListVerifiedSubmittersPage></ListVerifiedSubmittersPage>
                            }
                        ></Route>

                        {/* Default */}
                        <Route
                            path="*"
                            element={
                                <main style={{ padding: "1rem", height: 100 }}>
                                    <p>There's nothing here!</p>
                                </main>
                            }
                        />
                    </Route>
                </Routes>
            </BrowserRouter>
        </Provider>
    );
}
