// Helper to request airdrop for testing and development { on devnet }
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";

async function requestAirdrop() {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const publicKey = new PublicKey("7AYrgVgCuUqSta68pQ5aMhKh94PDVv13uBnFT87FGjWb"); // Replace with your devnet wallet address.
    const signature = await connection.requestAirdrop(publicKey, 5 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(signature, "confirmed");
    console.log(`Airdrop requested. Signature: ${signature}`);
}

requestAirdrop().catch(console.error);
