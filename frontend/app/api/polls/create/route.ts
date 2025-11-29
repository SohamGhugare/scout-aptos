import { NextRequest, NextResponse } from 'next/server';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

export async function POST(request: NextRequest) {
  try {
    const { signedTransaction } = await request.json();

    // Validate input
    if (!signedTransaction) {
      return NextResponse.json(
        { error: 'Signed transaction is required' },
        { status: 400 }
      );
    }

    // Initialize Aptos client
    const config = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(config);

    // Submit the signed transaction
    const committedTxn = await aptos.transaction.submit.simple(signedTransaction);

    // Wait for transaction to be processed
    await aptos.waitForTransaction({
      transactionHash: committedTxn.hash,
    });

    return NextResponse.json({
      success: true,
      transactionHash: committedTxn.hash,
      message: 'Poll created successfully on blockchain',
    });
  } catch (error) {
    console.error('Error creating poll:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
