# 🪄 Solana Wallet Tool: The Magic Wallet Agent

Welcome to your **Solana Wallet Agent** – your friendly assistant for sending, scheduling, and managing SOL on the Solana devnet! Whether you're a blockchain beginner or a seasoned dev, this tool makes wallet operations as easy as chatting with a friend.

---

## 🤖 What Can This Agent Do?
- **Register** your wallet for easy, secure future use
- **Send SOL** instantly to anyone on Solana devnet
- **Schedule** future SOL transfers (set it and forget it!)
- **Keep track** of all your scheduled, completed, and failed transfers

---

## 🚀 Getting Started
1. **Install dependencies:**
   ```sh
   pnpm install
   ```
2. **Run the agent:**
   ```sh
   pnpm run dev
   ```
3. The tool will create a `db/` folder for your transfer history. No extra setup needed!

---

## 🔑 Session Code vs Private Key: How Do I Use Them?

- **Session Code**: Like a secret nickname for your wallet. Register your private key with a code once, then use just the code for future actions. Safer and easier!
- **Private Key**: The direct way. Provide your private key every time (not recommended for regular use).
- **Both**: If you provide both, the tool will store your private key under the session code for next time.
- **Register Action**: Use the `register` action to save your private key with a session code for future use. After that, just use your code!

**Pro Tip:**
> Register your session once, then use your code for all future sends and schedules. No need to share your private key again!

---

## 💬 Example Prompts (Just Talk to Your Agent!)

### Register a Session
> "I want to register my Solana wallet for future use. Here is my private key: [YOUR_PRIVATE_KEY]. Use the code 'my-session-123' to save it."

### Send SOL Immediately
> "Send 0.1 SOL to this address: [RECIPIENT_ADDRESS]. Use my session code 'my-session-123'."

or, if you want to provide the private key directly:
> "Send 0.1 SOL to [RECIPIENT_ADDRESS] using this private key: [YOUR_PRIVATE_KEY]."

### Schedule a SOL Transfer
> "Schedule a transfer of 0.2 SOL to [RECIPIENT_ADDRESS] at July 3, 2025, 7:00 AM UTC+1 using my session code 'my-session-123'."

or, with private key:
> "Schedule 0.2 SOL to [RECIPIENT_ADDRESS] on 2024-07-01T15:00:00Z using this private key: [YOUR_PRIVATE_KEY]."

**Replace `[YOUR_PRIVATE_KEY]` and `[RECIPIENT_ADDRESS]` with your actual values.**

---

## 🛠️ Tool API (For the Curious)
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

---

## 📦 File-based DB: Where's My Data?
- `db/scheduled-transfers.json`: Stores your pending scheduled transfers
- `db/completed-transfers.json`: Stores completed and failed transfers for your records

---

**Happy Solana-ing!** 🚀 