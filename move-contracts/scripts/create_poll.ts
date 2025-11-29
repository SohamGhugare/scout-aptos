import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
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

interface PollData {
  title: string;
  option1: string;
  option2: string;
  latitude: number;
  longitude: number;
  pollTime: number; 
  expiryTime: number; 
}

async function createPoll(account: Account, pollData: PollData) {
  try {
    console.log("Creating poll with data:", pollData);

    const latitudeInt = Math.floor(pollData.latitude * 1_000_000);
    const longitudeInt = Math.floor(pollData.longitude * 1_000_000);

    // Build transaction
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::polls::create_poll`,
        functionArguments: [
          pollData.title,
          pollData.option1,
          pollData.option2,
          latitudeInt,
          longitudeInt,
          pollData.pollTime,
          pollData.expiryTime,
        ],
      },
    });

    console.log("Signing and submitting transaction...");

    // Sign and submit transaction
    const committedTxn = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    console.log("Transaction submitted:", committedTxn.hash);

    // Wait for transaction to be processed
    const executedTransaction = await aptos.waitForTransaction({
      transactionHash: committedTxn.hash,
    });

    console.log("Transaction confirmed!");
    console.log("Transaction hash:", executedTransaction.hash);
    console.log("Gas used:", executedTransaction.gas_used);

    return executedTransaction;
  } catch (error) {
    console.error("Error creating poll:", error);
    throw error;
  }
}

async function getPoll(accountAddress: string, pollIndex: number) {
  try {
    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::polls::get_poll`,
        functionArguments: [accountAddress, pollIndex],
      },
    });

    // Debug: log the raw response
    console.log("\n=== Raw Response ===");
    console.log("Full result:", JSON.stringify(result, null, 2));

    // Decode the response
    const [title, option1, option2, latitude, longitude, pollTime, expiryTime, creator] = result as any;

    // Convert to proper types
    const lat = Number(latitude) / 1_000_000;
    const lon = Number(longitude) / 1_000_000;
    const pollTimeNum = typeof pollTime === 'string' ? parseInt(pollTime) : Number(pollTime);
    const expiryTimeNum = typeof expiryTime === 'string' ? parseInt(expiryTime) : Number(expiryTime);

    console.log("\n=== Poll Details ===");
    console.log("Title:", title);
    console.log("Option 1:", option1);
    console.log("Option 2:", option2);
    console.log("Latitude:", lat);
    console.log("Longitude:", lon);
    console.log("Poll Time:", new Date(pollTimeNum * 1000).toISOString());
    console.log("Poll Time (timestamp):", pollTimeNum);
    console.log("Expiry Time:", new Date(expiryTimeNum * 1000).toISOString());
    console.log("Expiry Time (timestamp):", expiryTimeNum);
    console.log("Creator:", creator);

    return result;
  } catch (error) {
    console.error("Error retrieving poll:", error);
    throw error;
  }
}

async function getPollsCount(accountAddress: string): Promise<number> {
  try {
    const [count] = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::polls::get_polls_count`,
        functionArguments: [accountAddress],
      },
    });

    console.log(`Total polls for ${accountAddress}:`, count);
    return Number(count);
  } catch (error) {
    console.error("Error getting polls count:", error);
    throw error;
  }
}

async function main() {
  const privateKeyHex = process.env.ACCOUNT_PRIVATE_KEY;

  if (!privateKeyHex) {
    throw new Error("ACCOUNT_PRIVATE_KEY not found in .env.local file");
  }

  const privateKey = new Ed25519PrivateKey(privateKeyHex);
  const account = Account.fromPrivateKey({ privateKey });

  console.log("Using account:", account.accountAddress.toString());

  // Example poll data
  const pollData: PollData = {
    title: "1k+ event photos?",
    option1: "Yes",
    option2: "No",
    latitude: 12.9769722, 
    longitude: 77.7266197, 
    pollTime: Math.floor(Date.now() / 1000), // Current time in seconds
    expiryTime: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days from now
  };

  console.log("\n=== Creating Poll ===");

  await createPoll(account, pollData);

  // Get the number of polls
  const pollsCount = await getPollsCount(account.accountAddress.toString());

  // Retrieve the latest poll
  if (pollsCount > 0) {
    await getPoll(account.accountAddress.toString(), pollsCount - 1);
  }
}

// Run the main function
main().catch(console.error);
