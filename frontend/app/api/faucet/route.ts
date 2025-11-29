import { NextRequest, NextResponse } from 'next/server';
import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

// Rate limiting: track requests per address
const requestTimestamps = new Map<string, number>();
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const FAUCET_AMOUNT = 50000000; // 0.5 APT in Octas (1 APT = 100,000,000 Octas)

export async function POST(request: NextRequest) {
  try {
    const { recipientAddress } = await request.json();

    if (!recipientAddress) {
      return NextResponse.json(
        { error: 'Recipient address is required' },
        { status: 400 }
      );
    }

    // Rate limiting check
    const now = Date.now();
    const lastRequest = requestTimestamps.get(recipientAddress);

    if (lastRequest && (now - lastRequest) < RATE_LIMIT_WINDOW) {
      const timeRemaining = RATE_LIMIT_WINDOW - (now - lastRequest);
      const hoursRemaining = Math.ceil(timeRemaining / (60 * 60 * 1000));

      return NextResponse.json(
        {
          error: `Rate limit exceeded. Please try again in ${hoursRemaining} hours.`,
          canRequestAgainAt: new Date(lastRequest + RATE_LIMIT_WINDOW).toISOString()
        },
        { status: 429 }
      );
    }

    // Get faucet account private key from environment
    const privateKeyHex = process.env.FAUCET_PRIVATE_KEY;

    if (!privateKeyHex) {
      console.error('FAUCET_PRIVATE_KEY not configured');
      return NextResponse.json(
        { error: 'Faucet not configured' },
        { status: 500 }
      );
    }

    // Initialize Aptos client
    const config = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(config);

    // Create account from private key
    const privateKey = new Ed25519PrivateKey(privateKeyHex);
    const faucetAccount = Account.fromPrivateKey({ privateKey });

    // Check faucet balance
    let balance: number;
    try {
      balance = await aptos.account.getAccountAPTAmount({
        accountAddress: faucetAccount.accountAddress,
      });
    } catch (error) {
      console.error('Error fetching faucet balance:', error);
      return NextResponse.json(
        {
          error: 'Faucet account not found or not initialized. Please fund the faucet account first.',
          faucetAddress: faucetAccount.accountAddress.toString(),
        },
        { status: 500 }
      );
    }

    if (balance < FAUCET_AMOUNT) {
      return NextResponse.json(
        {
          error: `Faucet has insufficient balance. Current: ${(balance / 100000000).toFixed(4)} APT, Required: ${(FAUCET_AMOUNT / 100000000).toFixed(2)} APT`,
          faucetAddress: faucetAccount.accountAddress.toString(),
        },
        { status: 503 }
      );
    }

    // Transfer APT
    const transaction = await aptos.transaction.build.simple({
      sender: faucetAccount.accountAddress,
      data: {
        function: '0x1::coin::transfer',
        typeArguments: ['0x1::aptos_coin::AptosCoin'],
        functionArguments: [recipientAddress, FAUCET_AMOUNT],
      },
    });

    const committedTxn = await aptos.signAndSubmitTransaction({
      signer: faucetAccount,
      transaction,
    });

    const executedTransaction = await aptos.waitForTransaction({
      transactionHash: committedTxn.hash,
    });

    // Update rate limiting timestamp
    requestTimestamps.set(recipientAddress, now);

    return NextResponse.json({
      success: true,
      message: `Successfully sent 0.5 APT to ${recipientAddress}`,
      transactionHash: committedTxn.hash,
      amount: FAUCET_AMOUNT,
      amountInAPT: (FAUCET_AMOUNT / 100000000).toFixed(2),
      explorerUrl: `https://explorer.aptoslabs.com/txn/${committedTxn.hash}?network=testnet`,
    });
  } catch (error) {
    console.error('Faucet error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process faucet request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
