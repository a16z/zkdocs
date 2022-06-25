import { Domain } from "../lib/Config";
import { displayInstitution } from "../lib/Utils";
import { InstitutionDetails } from "zkdocs-lib";

interface AttestationWizardProps {
    vals: string[];
    nonces: string[];
    attesters: InstitutionDetails[];
    submitter: string;
    contractAddr: string;
}

interface AttesterLink {
    attesterAddr: string;
    vals: string[];
    nonces: string[];
    indices: number[];
}

export default function AttestationLinkWizard(props: AttestationWizardProps) {
    let attesterLinks = groupAttesterLinks(props);
    return (
        <div>
            {attesterLinks.map((link, index) => (
                <div className="border-t grid grid-cols-2 p-3" key={index}>
                    <div className="flex items-center">
                        {displayInstitution(props.attesters[link.indices[0]])}
                    </div>
                    <div className="mt-1 flex rounded-md shadow-sm">
                        <input
                            type="text"
                            name="attestation"
                            id="attestation"
                            className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300"
                            placeholder={getAttestationUrl(
                                props.submitter,
                                props.contractAddr,
                                link
                            )}
                            readOnly={true}
                        />
                        <button
                            className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-400 active:bg-gray-500"
                            onClick={() => {
                                navigator.clipboard.writeText(
                                    getAttestationUrl(
                                        props.submitter,
                                        props.contractAddr,
                                        link
                                    )
                                );
                            }}
                        >
                            Copy
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function groupAttesterLinks(params: AttestationWizardProps): AttesterLink[] {
    let attesterLinks: AttesterLink[] = [];
    for (let i = 0; i < params.vals.length; i++) {
        let attester = params.attesters[i].address.toLowerCase();
        let attesterIndex = attesterLinks.findIndex(
            (links) => links.attesterAddr.toLowerCase() === attester
        );

        if (attesterIndex === -1) {
            let link: AttesterLink = {
                attesterAddr: attester,
                vals: [params.vals[i]],
                // 2 nonces per index
                nonces: [
                    params.nonces[2*i], 
                    params.nonces[2*i+1]
                ],
                indices: [i],
            };
            attesterLinks.push(link);
        } else {
            attesterLinks[attesterIndex].indices.push(i);
            attesterLinks[attesterIndex].vals.push(params.vals[i]);
            // 2 nonces per index
            attesterLinks[attesterIndex].nonces.push(params.nonces[2*i]);
            attesterLinks[attesterIndex].nonces.push(params.nonces[2*i+1]);
        }
    }

    return attesterLinks;
}

export function getAttestationUrl(
    submitter: string,
    contractAddr: string,
    link?: AttesterLink
): string {
    let str = `${Domain}attestation?addr=${contractAddr}&submitter=${submitter}`;

    if (link) {
        let fieldIndices = link.indices.join(",");
        let vals = link.vals.join(",");
        let secs = link.nonces.join(",");

        if (link.vals.length > 0 && link.nonces.length > 0) {
            str += `&fieldIndices=${fieldIndices}&vals=${vals}&secs=${secs}`;
        }
    }

    return str;
}

export function getAttestationUrlNoPrefix(
    submitter: string,
    contractAddr: string
): string {
    return `/attestation?addr=${contractAddr}&submitter=${submitter}`;
}
