import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Vote } from '@/lib/models/Poll';

export async function POST(request: NextRequest) {
  try {
    const voteData: Vote = await request.json();

    if (!voteData.voter || !voteData.pollCreator || voteData.option === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('scout-aptos');
    const votesCollection = db.collection('votes');
    const pollsCollection = db.collection('polls');

    await votesCollection.insertOne({
      ...voteData,
      votedAt: new Date(),
    });

    await pollsCollection.updateOne(
      {
        creator: voteData.pollCreator,
        index: voteData.pollIndex,
      },
      {
        $inc: voteData.option === 1
          ? { total_option1_stake: voteData.stakeAmount }
          : { total_option2_stake: voteData.stakeAmount }
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Vote saved to database successfully',
    });
  } catch (error) {
    console.error('Error saving vote:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
