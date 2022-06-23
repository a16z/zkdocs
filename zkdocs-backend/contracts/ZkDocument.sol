// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;
import "@openzeppelin/contracts/access/Ownable.sol";
import "contracts/IPlonkVerifier.sol";

/**
 * @title zkDocs
 * @author sragss @samrags_
 * @notice ZKDocument stores all of the storage fields associated with commitments and their attestations.
 *         __    ________                        
 * _______|  | __\______ \   ____   ____   ______
 * \___   /  |/ / |    |  \ /  _ \_/ ___\ /  ___/
 *  /    /|    <  |    `   (  <_> )  \___ \___ \ 
 * /_____ \__|_ \/_______  /\____/ \___  >____  >
 *       \/    \/        \/            \/     \/ 
 */
contract ZKDocument is Ownable {
    IPlonkVerifier verifier;

    mapping(address => bool) public trustedInstitutions; // Set of valid trusted institutions (admin updated)
    mapping(bytes32 => bytes32) public fieldCommitments; // Map field_index => commitment (submittor updated)
    mapping(bytes32 => address) public requiredCommitmentAttestations; // Map field_index => attestor addr (user updated)
    mapping(bytes32 => bool) public attestations; // Set of field_indexes that have been attested to (valid attestor updated) -- CANNOT use commitments because of collision
    address[] public validatedSubmitters; // Submitter addresses who have successful passed validation of this contract

    // Schema constraint constants
    uint[] public consts;

    // Total number of fields
    uint public numFields;

    // Keccak256 hash of the associated schema file (flattened)
    bytes32 public schemaHash;

    constructor(uint[] memory _consts, uint _numFields, IPlonkVerifier _verifier, bytes32 _schemaHash) {
        consts = _consts;
        numFields = _numFields;
        verifier = _verifier;
        schemaHash = _schemaHash;
    }

    /**
     * @notice Add valid institution to set of trusted institutions.
     *
     * @param institution address to add.
     */
    function addValidInstitution(address institution) public onlyOwner {
        trustedInstitutions[institution] = true;
    }

    /**
     * @notice Remove institution from set of trusted institutions.
     *
     * @param institution addresses to add.
     */
    function removeValidInstitution(address institution) public onlyOwner {
        trustedInstitutions[institution] = false;
    }

    /**
     * @notice Add multiple insitutions to set of trusted institutions.
     *
     * @param institutions array of addresses to add.
     */
    function addValidInstitutions(address[] calldata institutions) public onlyOwner {
        for (uint i = 0; i < institutions.length; i++) {
            trustedInstitutions[institutions[i]] = true;
        }
    }

    /**
     * @notice Attestor can attest to a given commitment by its field index.
     *         Only the attestor specified by the committer can call.
     *
     * @param fieldIndex index of commitment to be attested to.
     */
    function attest(bytes32 fieldIndex) public {
        require(msg.sender == requiredCommitmentAttestations[fieldIndex], "only the proper attester can attest.");
        attestations[fieldIndex] = true;
    }


    /**
     * @notice Attestor can attest to multiple commitments by their field indices.
     *         Only the attestor specified by the committer can call.
     */
    function attestMultiple(bytes32[] calldata fieldIndices) public {
        for (uint i = 0; i < fieldIndices.length; i++) {
            attest(fieldIndices[i]);
        }
    }

    /**
     * @notice Called by the committer to post commitments and requested attesting institution
     *         for each.
     *
     * @param commitments array of 32 byte poseidon3 commitments for each field.
     * 
     * @param institutions array of attester addresses for each field / commitment.
     */
    function postFields(
        bytes32[] calldata commitments, 
        address[] calldata institutions) public {
        require(commitments.length == numFields);
        require(commitments.length == institutions.length);


        for (uint i = 0; i < numFields; i++) {
            require(checkTrustedInstitution(institutions[i]), "institution is untrusted");
            bytes32 fieldIndex = getFieldIndex(msg.sender, i);

            // Confirm first submission
            require(fieldCommitments[fieldIndex] == 0x0, "can only post fields once");

            requiredCommitmentAttestations[fieldIndex] = institutions[i];

            fieldCommitments[fieldIndex] = commitments[i];
        }
    }

    /**
     * @notice Called by a submitter who has already posted commitments and recieved attestations
     *         to verify the zero-knowledge proof and attestations.
     *
     * @param proof Circom proof byte string.
     */
    function validateSubmitter(bytes calldata proof) public {
        // Check all fields have attestations, fill up public signal array for zk verification
        uint[] memory publicSignals = new uint[](numFields + consts.length);
        for (uint i = 0; i < numFields; i++) {
            bytes32 fieldIndex = getFieldIndex(msg.sender, i);
            require(checkCommitmentAttestation(fieldIndex), "all fields must be attested to");

            publicSignals[i] = uint(fieldCommitments[fieldIndex]);
        }

        for (uint i = 0; i < consts.length; i++) {
            publicSignals[numFields + i] = consts[i];
        }

        require(verifier.verifyProof(proof, publicSignals), "proof verification failed");
        validatedSubmitters.push(msg.sender);
    }

    /**
     * @notice FieldIndex definition. These are unique per submitter / field combination.
     *
     * @param user Submitting user address.
     *
     * @param fieldNumber numeric 0 indexed field as defined by the order of the schema.
     */
    function getFieldIndex(address user, uint fieldNumber) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(user, fieldNumber));
    }

    /**
     * @return Whether the institution is within the set of trusted institutions.
     */
    function checkTrustedInstitution(address institution) public view returns (bool) {
        return trustedInstitutions[institution];
    }

    /**
     * @return Whether the fieldIndex has been attested to.
     */
    function checkCommitmentAttestation(bytes32 fieldIndex) public view returns (bool) {
        return attestations[fieldIndex];
    }

    /**
     * @return The set of submitters who have already been verified.
     */
    function getValidatedSubmitters() public view returns (address[] memory) {
        return validatedSubmitters;
    }
}