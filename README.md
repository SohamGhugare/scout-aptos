# Scout 🎯

**Bet on Moments, Not on News**

Scout is a location-based permissionless prediction market platform built on Aptos blockchain. Create predictions about real-world events, let people bet with APT tokens, and earn rewards when your predictions gain traction.

## 🌟 What is Scout?

Scout transforms your real-world observations into valuable predictions. Unlike traditional prediction markets focused on news and global events, Scout lets you create predictions about everyday moments happening around you:

- "Will the hackathon start on time?"
- "Will my friend get a Hinge match today?"
- "Will someone fall asleep during the demo?"

## 🔓 Permissionless

Scout is truly permissionless - anyone can create predictions, place bets, and earn rewards without gatekeepers or approval processes.

**No Barriers to Entry:**
- **Anyone Can Create**: No verification, no KYC, no approval needed. Just connect your wallet and start creating predictions.
- **Anyone Can Participate**: No minimum reputation or platform requirements. All polls are open to everyone.
- **Decentralized by Design**: All core logic runs on Aptos smart contracts. The platform can't censor polls, block users, or prevent payouts.
- **Self-Sovereign**: You control your wallet, your predictions, and your winnings. No centralized authority can freeze your funds.

**How Permissionless Works:**
- Smart contracts handle all voting, staking, and reward distribution automatically
- Poll creators are responsible for finalizing results - no central authority decides outcomes
- The blockchain ensures transparent, immutable records of all predictions and votes
- Anyone can verify the fairness of the reward calculations on-chain

This permissionless architecture means Scout operates as a true peer-to-peer prediction market, powered by code, not gatekeepers.

## 🎮 How It Works

### 1. **Ask a Fun Question**
Think of something people argue about in real life. Type it out, choose YES or NO, and set an expiry time.

### 2. **People Place Their Bets**
Your friends (and randoms) pick a side and stake APT tokens. It can be small bets — even just a few cents.

### 3. **The Pool Grows**
Every bet adds to the prize pool. We take a small 5% fee:
- Most goes to you (the poll creator)
- The rest helps run the platform

### 4. **Time's Up — What Happened?**
When time runs out, the poll creator finalizes the result. The winning side splits the prize money proportionally.

### 5. **You Get Paid for Hosting**
The more people bet on your question, the more you earn as the host.

## 🏗️ Technical Architecture

### Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Aptos Wallet Adapter
- Aptos TypeScript SDK

**Backend:**
- Next.js API Routes
- Move Smart Contracts (on Aptos)
- MongoDB (for cache orchestration)


### Smart Contracts

The core logic is implemented in Move smart contracts located in `/move-contracts/sources/polls.move`:

**Key Features:**
- Poll creation with location data (latitude/longitude)
- Voting with APT token staking
- Automatic reward distribution using proportional calculation
- Poll finalization by creator

**Reward Formula:**
```
reward = (winner_stake × total_pool) / total_winning_stake
```

This ensures winners always profit since `total_pool > total_winning_stake`.

## 📦 Project Structure

```
scout-aptos/
├── move-contracts/          # Aptos Move smart contracts
│   ├── sources/
│   │   └── polls.move      # Main poll contract
│   └── Move.toml           # Move package config
│
└── frontend/               # Next.js frontend application
    ├── app/                # Next.js 14 app directory
    │   ├── api/           # API routes
    │   ├── polls/         # Polls page
    │   ├── portfolio/     # User portfolio
    │   └── how-it-works/  # How it works page
    ├── components/         # React components
    ├── lib/               # Utilities (MongoDB, etc.)
    └── public/            # Static assets
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Aptos CLI
- MongoDB instance
- Aptos Wallet (Petra, Martian, etc.)

### Move Contracts Setup

1. Navigate to the move contracts directory:
```bash
cd move-contracts
```

2. Compile the Move modules:
```bash
aptos move compile
```

3. Deploy to Aptos testnet:
```bash
aptos move publish
```

4. Note your contract address for frontend configuration.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
bun install
# or
npm install
```

3. Create a `.env.local` file:
```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# Aptos Contract Address
NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract_address

# Faucet (optional)
FAUCET_PRIVATE_KEY=your_private_key_for_faucet
```

4. Run the development server:
```bash
bun dev
# or
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔑 Key Features

### For Poll Creators
- **Create Predictions**: Set up polls about real-world events with custom expiry times
- **Earn Fees**: Receive a portion of the total pool as the host
- **Finalize Results**: Determine the winning outcome when time expires
- **Track Performance**: View all your created polls and their stats in your portfolio

### For Participants
- **Stake on Predictions**: Bet APT tokens on YES or NO outcomes
- **Proportional Rewards**: Winners split the entire pool based on their stake contribution
- **Portfolio Tracking**: See all your active and completed bets
- **Win/Loss Stats**: Track your profit/loss across all predictions

### Platform Features
- **Location-Based**: Polls include latitude/longitude data
- **Real-time Updates**: Live poll count on homepage
- **Wallet Integration**: Seamless Aptos wallet connectivity
- **Username System**: Create a unique username for your profile
- **Faucet**: Get test APT tokens for development

## 🛠️ Aptos SDK Integration

### Installing the Aptos SDK

```bash
bun add @aptos-labs/ts-sdk @aptos-labs/wallet-adapter-react
```

### Key SDK Usage

**1. Wallet Connection:**
```typescript
import { useWallet } from '@aptos-labs/wallet-adapter-react';

const { connect, account, connected } = useWallet();
```

**2. Reading Blockchain Data:**
```typescript
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

// View function call
const polls = await aptos.view({
  function: `${contractAddress}::polls::get_all_polls`,
  functionArguments: [creatorAddress],
});
```

**3. Submitting Transactions:**
```typescript
// Build transaction
const transaction = await aptos.transaction.build.simple({
  sender: account.address,
  data: {
    function: `${contractAddress}::polls::vote_on_poll`,
    functionArguments: [pollCreator, pollIndex, option, stakeAmount],
  },
});

// Sign and submit
const response = await signAndSubmitTransaction({ transaction });

// Wait for confirmation
await aptos.waitForTransaction({ transactionHash: response.hash });
```

**4. Token Transfers:**
```typescript
const transaction = await aptos.transaction.build.simple({
  sender: senderAddress,
  data: {
    function: '0x1::coin::transfer',
    typeArguments: ['0x1::aptos_coin::AptosCoin'],
    functionArguments: [recipientAddress, amount],
  },
});
```

## 📊 Database Schema

### MongoDB Collections

**polls:**
```typescript
{
  creator: string,           // Wallet address
  index: number,             // Sequential index per creator
  title: string,
  option1: string,
  option2: string,
  latitude: number,
  longitude: number,
  pollTime: number,          // Unix timestamp
  expiryTime: number,        // Unix timestamp
  is_finalized: boolean,
  transactionHash: string
}
```

**votes:**
```typescript
{
  voter: string,             // Wallet address
  pollCreator: string,       // Poll creator address
  pollIndex: number,         // Poll index
  option: number,            // 1 or 2
  stakeAmount: number,       // In Octas
  votedAt: Date,
  transactionHash: string
}
```

**users:**
```typescript
{
  walletAddress: string,
  username: string,
  createdAt: Date
}
```

## 🔐 Security Considerations

- All sensitive operations are validated on-chain
- MongoDB is only used for caching and quick lookups
- Vote validation happens through smart contract checks
- Private keys are never exposed to the frontend
- Rate limiting on faucet to prevent abuse

## 🎨 Design Philosophy

Scout follows a minimal, clean design:
- Black background with green/emerald accents
- Floating background orbs for depth
- Smooth animations and transitions
- Mobile-first responsive design
- Consistent typography with Space Grotesk font

## 📝 API Routes

### Polls
- `POST /api/polls/save` - Save new poll to database
- `POST /api/polls/all` - Get all polls with vote counts
- `GET /api/polls/count` - Get count of live polls

### Votes
- `POST /api/votes/save` - Save vote to database
- `POST /api/votes/check` - Check if user already voted

### User
- `POST /api/user/create` - Create new user
- `POST /api/user/check` - Check if user exists

### Portfolio
- `POST /api/portfolio` - Get user's portfolio data

### Faucet
- `POST /api/faucet` - Request test APT tokens

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🔗 Links

- [Aptos Documentation](https://aptos.dev)
- [Aptos TypeScript SDK](https://github.com/aptos-labs/aptos-ts-sdk)
- [Move Language](https://move-language.github.io/move/)

## 👥 Team

- Soham Ghugare (The caffeine addicted techie)
- Mosin Shaikh (High on sleep lol)

Built with ❤️ for the Aptos ecosystem.

---

**Scout** - Transform your real-world presence into valuable predictions. Scout the ground truth.
