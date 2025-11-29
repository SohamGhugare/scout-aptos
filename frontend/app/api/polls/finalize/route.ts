import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { pollCreator, pollIndex, winningOption, transactionHash } = await request.json();

    if (!pollCreator || pollIndex === undefined || !winningOption || !transactionHash) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('scout-aptos');
    const pollsCollection = db.collection('polls');

    // Update the poll to mark it as finalized
    const result = await pollsCollection.updateOne(
      {
        creator: pollCreator,
        index: pollIndex,
      },
      {
        $set: {
          is_finalized: true,
          winning_option: winningOption,
          finalized_at: new Date(),
          finalization_tx_hash: transactionHash,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Poll finalized successfully',
    });
  } catch (error) {
    console.error('Error finalizing poll:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
