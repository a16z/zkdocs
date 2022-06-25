import { BigNumber, ethers } from "ethers";

let HH_PK =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
let FAUCET_AMOUNT = BigNumber.from(1).mul(
    BigNumber.from(10).pow(BigNumber.from(18))
);

export async function SendHardhatFunds(
    provider: ethers.providers.BaseProvider,
    reciever: string
) {
    let wallet = new ethers.Wallet(HH_PK, provider);
    await wallet.sendTransaction({ to: reciever, value: FAUCET_AMOUNT });
}
