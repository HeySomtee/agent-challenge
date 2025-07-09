/*
Solana Wallet Tool (solana-tool)
================================

## Agent Description and Purpose
This tool provides Solana wallet functionality for the Nosana Agent Challenge. It enables an agent to:
- Register a session with a private key and passcode
- Send SOL on the Solana devnet
- Schedule future SOL transfers
- Manage scheduled and completed/failed transfers using file-based storage

## Setup Instructions
1. Ensure you have Node.js and pnpm installed.
2. Install dependencies:
   pnpm install
3. Start the development server:
   pnpm run dev
4. The tool will automatically create a `db/` directory in your working directory to store transfer data.

## Environment Variables
- No special environment variables are required for this tool.
- The Solana devnet is used by default via `@solana/web3.js`.

## Example Usage
Register a session:
  {
    "action": "register",
    "privateKey": "<your-private-key>",
    "code": "<your-session-code>"
  }
Send SOL:
  {
    "action": "send",
    "privateKey": "<your-private-key>",
    "code": "<your-session-code>",
    "recipient": "<recipient-address>",
    "amount": 1
  }
Schedule a transfer:
  {
    "action": "schedule",
    "privateKey": "<your-private-key>",
    "code": "<your-session-code>",
    "recipient": "<recipient-address>",
    "amount": 1,
    "scheduledTime": "2025-07-08T07:28:31.160Z"
  }

## Tool API
- **Actions:**
  - `register`: Store a session (private key + code)
  - `send`: Send SOL immediately
  - `schedule`: Schedule a SOL transfer for a future ISO8601 time
- **Input Fields:**
  - `action` (required): 'register', 'send', or 'schedule'
  - `privateKey` (optional): Solana wallet private key (base58)
  - `code` (optional): Session code to retrieve your private key
  - `recipient` (optional): Recipient's Solana address (base58)
  - `amount` (optional): Amount of SOL to send
  - `scheduledTime` (optional): ISO timestamp for scheduled transfer
- **Output Fields:**
  - `signature`: Transaction signature (if sent)
  - `explorerLink`: Solana explorer link (if sent)
  - `error`: Error message (if any)
  - `message`: Informational message
  - `scheduled`: Boolean, true if scheduled

- **File-based DB:**
  - `db/scheduled-transfers.json`: Stores pending scheduled transfers
  - `db/completed-transfers.json`: Stores completed/failed transfers

*/
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    clusterApiUrl,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
    PublicKey,
} from "@solana/web3.js";
import bs58 from "bs58";
// import { log } from "node:console";
import fs from "fs";
import path from "path";

// Session management (in-memory)
const sessionStore = new Map(); // code -> { privateKey }

const SCHEDULED_TRANSFERS_FILE = path.resolve(process.cwd(), "db", "scheduled-transfers.json");
const COMPLETED_TRANSFERS_FILE = path.resolve(process.cwd(), "db", "completed-transfers.json");

// Ensure db directory exists
if (!fs.existsSync(path.dirname(SCHEDULED_TRANSFERS_FILE))) {
    console.log("created");
    
    fs.mkdirSync(path.dirname(SCHEDULED_TRANSFERS_FILE), { recursive: true });
}

function readScheduledTransfers() {
    try {
        if (!fs.existsSync(SCHEDULED_TRANSFERS_FILE)) return [];
        const data = fs.readFileSync(SCHEDULED_TRANSFERS_FILE, "utf-8");
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

function writeScheduledTransfers(transfers: any[]) {
    console.log("writing scheduled transfers");
    fs.writeFileSync(SCHEDULED_TRANSFERS_FILE, JSON.stringify(transfers, null, 2), "utf-8");
    console.log("scheduled transfers written");
    console.log(readScheduledTransfers());
}

function appendCompletedTransfers(transfers: any[]) {
    let completed = [];
    try {
        if (fs.existsSync(COMPLETED_TRANSFERS_FILE)) {
            completed = JSON.parse(fs.readFileSync(COMPLETED_TRANSFERS_FILE, "utf-8"));
        }
    } catch (e) {
        completed = [];
    }
    completed.push(...transfers);
    fs.writeFileSync(COMPLETED_TRANSFERS_FILE, JSON.stringify(completed, null, 2), "utf-8");
}

export function registerSession(code: string, privateKey: string) {
    sessionStore.set(code, { privateKey });
}

export function getSessionPrivateKey(code: string): string | undefined {
    return sessionStore.get(code)?.privateKey;
}

// Action enum
enum SolanaAction {
    Register = 'register',
    Send = 'send',
    Schedule = 'schedule',
}

async function sendSol({ privateKey, recipient, amount }: { privateKey: string, recipient: string, amount: number }) {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const secretKey = bs58.decode(privateKey);
    const keypair = Keypair.fromSecretKey(secretKey);
    const recipientAddress = new PublicKey(recipient);
    const amountToSend = amount * LAMPORTS_PER_SOL;

    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: recipientAddress,
            lamports: amountToSend,
        })
    );

    const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [keypair]
    );

    const explorerLink = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

    return [signature, explorerLink];
}

// Helper to resolve private key from input or session
function resolvePrivateKeyAndRegister({ privateKey, code }: { privateKey?: string | null, code?: string | null }) {
    let key = privateKey;
    let isStoredInSession = false;
    if (!key && code) {
        key = sessionStore.get(code)?.privateKey;
        isStoredInSession = true;
    }
    if (!key) {
        return { error: "Please provide BOTH your privateKey AND a passcode to register, or provide your code to use an existing session.", key: undefined };
    }
    if (key && code && !isStoredInSession) {
        registerSession(code, key);
    }
    return { key };
}

export const solanaSendTool = createTool({
    id: "send-sol",
    description: "Register a session or send SOL on Solana devnet using a private key or session code.",
    inputSchema: z.object({
        action: z.enum([SolanaAction.Register, SolanaAction.Send, SolanaAction.Schedule]).describe("Action to perform: register, send, or schedule"),
        privateKey: z.string().optional().nullable().describe("solana wallet's private key"),
        code: z.string().optional().nullable().describe("Session code to retrieve your private key"),
        recipient: z.string().optional().nullable().describe("Recipient's Solana address (base58)"),
        amount: z.number().optional().describe("Amount of SOL to send"),
        scheduledTime: z.string().optional().nullable().describe("ISO timestamp for when to send the transfer (future time)")
    }),
    outputSchema: z.object({
        signature: z.string().optional(),
        explorerLink: z.string().optional(),
        error: z.string().optional(),
        message: z.string().optional(),
        scheduled: z.boolean().optional(),
    }),
    execute: async ({ context }) => {
        try {
            const { privateKey, code, recipient, amount, action, scheduledTime } = context;
            if(!action) {
                return { error: "Please clearly state an action. Use 'register', 'send', or 'schedule'." };
            }
            if (action === SolanaAction.Register) {
                if (!privateKey || !code) {
                    return { error: "To register, provide BOTH your privateKey AND a passcode." };
                }
                registerSession(code, privateKey);
                return { message: "Session registered successfully." };
            } else if (action === SolanaAction.Send) {
                const { key, error } = resolvePrivateKeyAndRegister({ privateKey, code });
                if (error) return { error };
                if (!key) return { error: "Resolved key is undefined." };
                if (!recipient || !amount) {
                    return { error: "Recipient and amount are required to send SOL." };
                }
                const [signature, explorerLink] = await sendSol({ privateKey: key, recipient, amount });
                return { signature, explorerLink };
            } else if (action === SolanaAction.Schedule) {
                if (!recipient || !amount || !scheduledTime) {
                    return { error: "To schedule a transfer, provide BOTH your privateKey, passcode, recipient, amount, and scheduledTime." };
                }
                const { key, error } = resolvePrivateKeyAndRegister({ privateKey, code });
                if (error) return { error };
                if (!key) return { error: "Resolved key is undefined." };
                // Store the scheduled transfer
                const transfers = readScheduledTransfers();
                transfers.push({
                    code,
                    privateKey: key,
                    recipient,
                    amount,
                    scheduledTime,
                    createdAt: new Date().toISOString(),
                    status: 'pending'
                });
                writeScheduledTransfers(transfers);
                return { scheduled: true, message: `Transfer scheduled for ${scheduledTime}` };
            } else {
                return { error: "Invalid action. Use 'register', 'send', or 'schedule'." };
            }
        } catch (e: any) {
            return { error: e.message || String(e) };
        }
    },
});

// Background scheduler for executing scheduled transfers
async function processScheduledTransfers() {
    while (true) {
        console.log("executing scheduled transfers");
        const now = new Date();
        let transfers = readScheduledTransfers();
        console.log(transfers);
        let changed = false;
        let toArchive = [];
        for (const transfer of transfers) {
            if (transfer.status === 'pending' && new Date(transfer.scheduledTime) <= now) {
                try {
                    const [signature, explorerLink] = await sendSol({
                        privateKey: transfer.privateKey,
                        recipient: transfer.recipient,
                        amount: transfer.amount
                    });
                    transfer.status = 'completed';
                    transfer.signature = signature;
                    transfer.explorerLink = explorerLink;
                    transfer.completedAt = new Date().toISOString();
                    console.log(`Scheduled transfer completed: ${signature}`);
                } catch (e: any) {
                    transfer.status = 'failed';
                    transfer.error = e.message || String(e);
                    transfer.failedAt = new Date().toISOString();
                    console.error(`Scheduled transfer failed: ${transfer.error}`);
                }
                changed = true;
            }
            if (transfer.status !== 'pending') {
                toArchive.push(transfer);
            }
        }
        if (toArchive.length > 0) {
            // Remove non-pending from scheduled and archive them
            transfers = transfers.filter((t: any) => t.status === 'pending');
            appendCompletedTransfers(toArchive);
            changed = true;
        }
        if (changed) {
            writeScheduledTransfers(transfers);
        }
        await new Promise(res => setTimeout(res, 60 * 1000));
    }
}

// Only run the scheduler if this file is executed directly
// condition commented out since the tool is not executed in deirect context
// if (import.meta.url === `file://${process.argv[1]}`) {
    processScheduledTransfers();
// }
