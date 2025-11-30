# Blockchain Integration Guide

This document explains how Scout integrates with the Aptos blockchain

## Architecture Overview

Scout uses a **hybrid architecture**:
- **On-chain (Aptos Blockchain)**: Source of truth for all polls, votes, and rewards
- **Off-chain**: Performance cache for fast querying and aggregation

All state-changing operations happen on-chain first, then get cached in MongoDB for better UX.

---

## Move Contract View Functions

The Move contract at `/move-contracts/sources/polls.move` provides several view functions for reading on-chain data:

### 1. `get_all_polls` - Fetch All Polls for a Creator

```typescript
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);
const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULE_ADDRESS!;

// Fetch all polls created by a specific address
const polls = await aptos.view({
  payload: {
    function: `${MODULE_ADDRESS}::polls::get_all_polls`,
    functionArguments: [creatorAddress], // The poll creator's address
  },
});

// Returns: vector<Poll>
// Each Poll contains:
// {
//   title: string,
//   option1: string,
//   option2: string,
//   latitude: u64,
//   longitude: u64,
//   poll_time: u64,
//   expiry_time: u64,
//   creator: address,
//   total_option1_stake: u64,
//   total_option2_stake: u64,
//   is_finalized: bool,
//   winning_option: u8,
// }
```

**Location in code**: [components/LocationPolls.tsx:168-215](../components/LocationPolls.tsx#L168-L215)

**Note**: This function returns polls for a single creator. To get ALL polls from ALL creators, you would need to:
1. Maintain an off-chain index of all poll creator addresses (via events or MongoDB)
2. Call `get_all_polls` for each creator
3. Combine and filter the results

This is why Scout uses MongoDB for aggregation.

---

### 2. `get_user_votes` - Fetch All Votes for a User

```typescript
// Fetch all votes cast by a specific user
const userVotes = await aptos.view({
  payload: {
    function: `${MODULE_ADDRESS}::polls::get_user_votes`,
    functionArguments: [userAddress], // The voter's address
  },
});

// Returns: vector<Vote>
// Each Vote contains:
// {
//   voter: address,
//   poll_creator: address,
//   poll_index: u64,
//   option_voted: u8,
//   stake_amount: u64,
//   vote_time: u64,
// }

// Example: Match votes to polls
const pollsWithVotes = await Promise.all(
  userVotes.map(async (vote) => {
    const pollData = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::polls::get_poll_with_stakes`,
        functionArguments: [vote.poll_creator, vote.poll_index],
      },
    });
    return { vote, poll: pollData };
  })
);
```

**Location in code**: [components/LocationPolls.tsx:244-269](../components/LocationPolls.tsx#L244-L269)

---

### 3. `get_poll_with_stakes` - Fetch Single Poll with Stakes

```typescript
// Fetch a specific poll with stake information
const poll = await aptos.view({
  payload: {
    function: `${MODULE_ADDRESS}::polls::get_poll_with_stakes`,
    functionArguments: [creatorAddress, pollIndex],
  },
});

// Returns: (String, String, String, u64, u64, u64, u64, address, u64, u64)
// Destructure as:
// [title, option1, option2, latitude, longitude, poll_time, expiry_time, creator, total_option1_stake, total_option2_stake]
```

**Used for**: Fetching detailed information about a specific poll including voting statistics.

---

### 4. `get_polls_count` - Get Number of Polls for Creator

```typescript
// Get the count of polls created by an address
const pollCount = await aptos.view({
  payload: {
    function: `${MODULE_ADDRESS}::polls::get_polls_count`,
    functionArguments: [creatorAddress],
  },
});

// Returns: u64 (number of polls)
```

**Used for**: Pagination or determining if a creator has any polls.

---

## Entry Functions (Transactions)

These functions modify on-chain state and require signing transactions:

### 1. Create Poll

**Location**: [app/polls/page.tsx:136-180](../app/polls/page.tsx#L136-L180)

```typescript
const response = await signAndSubmitTransaction({
  sender: account.address,
  data: {
    function: `${MODULE_ADDRESS}::polls::create_poll`,
    typeArguments: [],
    functionArguments: [
      title,           // String
      option1,         // String
      option2,         // String
      latitudeU64,     // u64: (latitude + 90) * 1,000,000
      longitudeU64,    // u64: (longitude + 180) * 1,000,000
      pollTime,        // u64: Unix timestamp in seconds
      expiryTime,      // u64: Unix timestamp in seconds
    ],
  },
});
```

**What happens on-chain**:
1. Creates a Poll struct with the provided details
2. Initializes PollStore if it doesn't exist for the creator
3. Adds the poll to the creator's poll vector
4. Emits a PollCreated event

---

### 2. Vote on Poll

**Location**: [components/LocationPolls.tsx:367-406](../components/LocationPolls.tsx#L367-L406)

```typescript
const response = await signAndSubmitTransaction({
  sender: account.address,
  data: {
    function: `${MODULE_ADDRESS}::polls::vote_on_poll`,
    typeArguments: [],
    functionArguments: [
      pollCreator,    // address: The poll creator's address
      pollIndex,      // u64: Index of the poll in creator's poll list
      option,         // u8: 1 or 2 (which option to vote for)
      stakeAmount,    // u64: Amount in Octas (1 APT = 100,000,000 Octas)
    ],
  },
});
```

**What happens on-chain**:
1. Validates the poll exists and is not expired
2. Checks user hasn't already voted on this poll
3. Transfers APT from voter to poll creator (escrow)
4. Updates poll's total stake for the chosen option
5. Records voter and stake in PollVoters for reward distribution
6. Creates a Vote record in voter's VoteStore
7. Emits a VoteCast event

---

### 3. Finalize Poll and Distribute Rewards

**Location**: [components/LocationPolls.tsx:498-536](../components/LocationPolls.tsx#L498-L536)

```typescript
const response = await signAndSubmitTransaction({
  sender: account.address,
  data: {
    function: `${MODULE_ADDRESS}::polls::finalize_poll_and_distribute`,
    typeArguments: [],
    functionArguments: [
      pollIndex,       // u64: Index of the poll to finalize
      winningOption,   // u8: 1 or 2 (the winning option)
    ],
  },
});
```

**What happens on-chain**:
1. Validates the caller is the poll creator
2. Checks the poll hasn't already been finalized
3. Marks the poll as finalized with the winning option
4. Calculates the total pool (option1_stake + option2_stake)
5. Retrieves all winners (voters who chose the winning option)
6. Distributes rewards proportionally:
   ```
   reward = (winner_stake × total_pool) / total_winning_stake
   ```
7. Transfers APT from poll creator to each winner
8. Emits PollFinalized and RewardDistributed events

**Note**: If no one voted for the winning option, the creator keeps all funds.

---

## Coordinate Encoding/Decoding

Coordinates are stored as `u64` on-chain to avoid floating-point precision issues:

### Encoding (for transactions)
```typescript
// Latitude: -90 to 90 → 0 to 180,000,000
const latitudeU64 = Math.floor((latitude + 90) * 1000000);

// Longitude: -180 to 180 → 0 to 360,000,000
const longitudeU64 = Math.floor((longitude + 180) * 1000000);
```

### Decoding (from blockchain data)
```typescript
// u64 back to decimal latitude
export function u64ToLatitude(u64Value: number): number {
  return u64Value / 1000000 - 90;
}

// u64 back to decimal longitude
export function u64ToLongitude(u64Value: number): number {
  return u64Value / 1000000 - 180;
}
```

**Location**: [lib/utils.ts](../lib/utils.ts)

---

## Complete Example: Building a Portfolio Page

**Location**: [app/portfolio/page.tsx:83-124](../app/portfolio/page.tsx#L83-L124)

```typescript
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);
const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULE_ADDRESS!;

// 1. Fetch all user votes
const userVotes = await aptos.view({
  payload: {
    function: `${MODULE_ADDRESS}::polls::get_user_votes`,
    functionArguments: [account.address.toString()],
  },
});

// 2. For each vote, fetch the corresponding poll details
const pollsWithDetails = await Promise.all(
  userVotes.map(async (vote) => {
    const pollData = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::polls::get_poll_with_stakes`,
        functionArguments: [vote.poll_creator, vote.poll_index],
      },
    });
    return { vote, poll: pollData };
  })
);

// 3. Calculate statistics
const totalStaked = userVotes.reduce((sum, vote) => sum + vote.stake_amount, 0);
const activeBets = pollsWithDetails.filter(p => !p.poll.is_finalized).length;
const completedBets = pollsWithDetails.filter(p => p.poll.is_finalized).length;
const wonBets = pollsWithDetails.filter(p =>
  p.poll.is_finalized && p.vote.option_voted === p.poll.winning_option
).length;

// 4. Display in UI
console.log({
  totalStaked: totalStaked / 100000000, // Convert Octas to APT
  activeBets,
  completedBets,
  wonBets,
  winRate: completedBets > 0 ? (wonBets / completedBets) * 100 : 0,
});
```

---

## Why Scout Uses MongoDB

While all data is available on-chain, Scout uses MongoDB for:

1. **Aggregation**: Combining polls from multiple creators
2. **Geospatial queries**: Finding polls within a radius (blockchain doesn't support this)
3. **Full-text search**: Searching poll titles/descriptions
4. **Performance**: Instant results vs multiple blockchain calls
5. **User experience**: No loading states while fetching on-chain data

The blockchain remains the **source of truth**. MongoDB is just a cache that can be rebuilt from on-chain events at any time.

---

## Event Listening (Advanced)

You can also listen to blockchain events to rebuild the MongoDB cache:

```typescript
// Listen for PollCreated events
const events = await aptos.getEvents({
  address: MODULE_ADDRESS,
  eventHandleName: 'PollCreated',
});

// Process each event and save to MongoDB
for (const event of events) {
  await savePollToMongoDB(event.data);
}
```

**Events emitted by the contract**:
- `PollCreated`: When a new poll is created
- `VoteCast`: When a vote is placed
- `PollFinalized`: When a poll is finalized
- `RewardDistributed`: When rewards are sent to winners

---

## Summary

| Operation | On-Chain Function | Codebase Location |
|-----------|------------------|-------------------|
| Create Poll | `polls::create_poll` | [app/polls/page.tsx:168](../app/polls/page.tsx#L168) |
| Vote on Poll | `polls::vote_on_poll` | [components/LocationPolls.tsx:397](../components/LocationPolls.tsx#L397) |
| Finalize Poll | `polls::finalize_poll_and_distribute` | [components/LocationPolls.tsx:529](../components/LocationPolls.tsx#L529) |
| Get All Polls | `polls::get_all_polls` | [components/LocationPolls.tsx:187](../components/LocationPolls.tsx#L187) |
| Get User Votes | `polls::get_user_votes` | [components/LocationPolls.tsx:251](../components/LocationPolls.tsx#L251) |
| Get Poll Details | `polls::get_poll_with_stakes` | View function (not hooked up) |
| Get Poll Count | `polls::get_polls_count` | View function (not hooked up) |

All blockchain integration code is documented with inline comments at the locations above. Search for `BLOCKCHAIN INTEGRATION` in the codebase to find all integration points.
