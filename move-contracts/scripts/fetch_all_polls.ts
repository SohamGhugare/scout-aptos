import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env.local") });

// Configuration
const APTOS_NETWORK: Network = Network.TESTNET;
const MODULE_ADDRESS = process.env.MODULE_ADDRESS;

if (!MODULE_ADDRESS) {
  throw new Error("MODULE_ADDRESS not found in .env.local file");
}

const config = new AptosConfig({ network: APTOS_NETWORK });
const aptos = new Aptos(config);

interface Poll {
  title: string;
  option1: string;
  option2: string;
  latitude: number;
  longitude: number;
  pollTime: number;
  expiryTime: number;
  creator: string;
  index: number;
}

async function getPollsCount(accountAddress: string): Promise<number> {
  try {
    const [count] = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::polls::get_polls_count`,
        functionArguments: [accountAddress],
      },
    });

    return Number(count);
  } catch (error) {
    console.error("Error getting polls count:", error);
    return 0;
  }
}

async function getPoll(accountAddress: string, pollIndex: number): Promise<Poll | null> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::polls::get_poll`,
        functionArguments: [accountAddress, pollIndex],
      },
    });

    const [title, option1, option2, latitude, longitude, pollTime, expiryTime, creator] = result as any;

    // Convert to proper types
    const lat = Number(latitude) / 1_000_000;
    const lon = Number(longitude) / 1_000_000;
    const pollTimeNum = typeof pollTime === 'string' ? parseInt(pollTime) : Number(pollTime);
    const expiryTimeNum = typeof expiryTime === 'string' ? parseInt(expiryTime) : Number(expiryTime);

    return {
      title,
      option1,
      option2,
      latitude: lat,
      longitude: lon,
      pollTime: pollTimeNum,
      expiryTime: expiryTimeNum,
      creator,
      index: pollIndex,
    };
  } catch (error) {
    console.error(`Error retrieving poll at index ${pollIndex}:`, error);
    return null;
  }
}

async function getAllPolls(accountAddress: string): Promise<Poll[]> {
  try {
    console.log(`\nFetching polls for account: ${accountAddress}`);

    const pollsCount = await getPollsCount(accountAddress);
    console.log(`Total polls found: ${pollsCount}`);

    if (pollsCount === 0) {
      console.log("No polls found for this account.");
      return [];
    }

    const polls: Poll[] = [];

    // Fetch all polls
    for (let i = 0; i < pollsCount; i++) {
      console.log(`\nFetching poll ${i + 1}/${pollsCount}...`);
      const poll = await getPoll(accountAddress, i);
      if (poll) {
        polls.push(poll);
      }
    }

    return polls;
  } catch (error) {
    console.error("Error fetching all polls:", error);
    throw error;
  }
}

function displayPoll(poll: Poll) {
  const now = Math.floor(Date.now() / 1000);
  const isExpired = poll.expiryTime < now;
  const status = isExpired ? "EXPIRED" : "ACTIVE";

  console.log("\n" + "=".repeat(60));
  console.log(`Poll #${poll.index} - ${status}`);
  console.log("=".repeat(60));
  console.log(`Title: ${poll.title}`);
  console.log(`Options:`);
  console.log(`  1. ${poll.option1}`);
  console.log(`  2. ${poll.option2}`);
  console.log(`Location: ${poll.latitude}, ${poll.longitude}`);
  console.log(`Created: ${new Date(poll.pollTime * 1000).toISOString()}`);
  console.log(`Expires: ${new Date(poll.expiryTime * 1000).toISOString()}`);
  console.log(`Creator: ${poll.creator}`);
  console.log("=".repeat(60));
}


function displayAllPolls(polls: Poll[]) {
  console.log(`\n\n${"*".repeat(60)}`);
  console.log("ALL POLLS");
  console.log("*".repeat(60));

  if (polls.length === 0) {
    console.log("No polls to display.");
    return;
  }

  polls.forEach(poll => displayPoll(poll));

  // Summary
  const activePolls = polls.filter(p => p.expiryTime >= Math.floor(Date.now() / 1000));
  const expiredPolls = polls.filter(p => p.expiryTime < Math.floor(Date.now() / 1000));

  console.log(`\n\n${"*".repeat(60)}`);
  console.log("SUMMARY");
  console.log("*".repeat(60));
  console.log(`Total Polls: ${polls.length}`);
  console.log(`Active Polls: ${activePolls.length}`);
  console.log(`Expired Polls: ${expiredPolls.length}`);
  console.log("*".repeat(60));
}


function exportPollsToJSON(polls: Poll[], accountAddress: string): string {
  const data = {
    accountAddress,
    fetchedAt: new Date().toISOString(),
    totalPolls: polls.length,
    polls: polls.map(poll => ({
      ...poll,
      pollTimeISO: new Date(poll.pollTime * 1000).toISOString(),
      expiryTimeISO: new Date(poll.expiryTime * 1000).toISOString(),
      isExpired: poll.expiryTime < Math.floor(Date.now() / 1000),
    })),
  };

  return JSON.stringify(data, null, 2);
}

async function main() {
  // Get account address from command line args or use default
  const accountAddress = process.argv[2] || process.env.ACCOUNT_ADDRESS;

  if (!accountAddress) {
    console.error("Error: Account address is required.");
    console.log("\nUsage:");
    console.log("  npm run fetch-polls <account_address>");
    console.log("  or set ACCOUNT_ADDRESS in .env.local");
    process.exit(1);
  }

  try {
    // Fetch all polls
    const polls = await getAllPolls(accountAddress);

    // Display all polls
    displayAllPolls(polls);

    // Export to JSON (optional)
    if (process.argv.includes("--json")) {
      const jsonOutput = exportPollsToJSON(polls, accountAddress);
      console.log("\n\nJSON Output:");
      console.log(jsonOutput);
    }

    // Filter options
    if (process.argv.includes("--active")) {
      const activePolls = polls.filter(p => p.expiryTime >= Math.floor(Date.now() / 1000));
      console.log("\n\nActive Polls Only:");
      displayAllPolls(activePolls);
    }

    if (process.argv.includes("--expired")) {
      const expiredPolls = polls.filter(p => p.expiryTime < Math.floor(Date.now() / 1000));
      console.log("\n\nExpired Polls Only:");
      displayAllPolls(expiredPolls);
    }

  } catch (error) {
    console.error("Error in main:", error);
    process.exit(1);
  }
}

main().catch(console.error);
