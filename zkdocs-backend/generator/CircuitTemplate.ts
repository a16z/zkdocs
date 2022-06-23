export function CircuitTemplate(
    numFields: number, 
    constsLength: number, 
    constraintSectionStr: string,
    importPathPrefix: string = ""): string {

    return `
        pragma circom 2.0.2; 

        include "${importPathPrefix}../node_modules/circomlib/circuits/comparators.circom";
        include "${importPathPrefix}../node_modules/circomlib/circuits/poseidon.circom";

        template VerifyDocument(numFields) {
            // Public inputs
            signal input commits[numFields];
        
            // Private inputs
            signal input values[numFields];
            signal input nonces[2*numFields];

            signal input consts[${constsLength}];

            component hashers[numFields];
            for (var i = 0; i < numFields; i++) {
                hashers[i] = Poseidon(3);
                hashers[i].inputs[0] <== values[i];
                var nonceIA = 2*i;
                var nonceIB = 2*i+1;
                hashers[i].inputs[1] <== nonces[nonceIA];
                hashers[i].inputs[2] <== nonces[nonceIB];
                hashers[i].out === commits[i];
            }

            ${constraintSectionStr}
        }

        component main {public [commits, consts]} = VerifyDocument(${numFields}); 
        `
}