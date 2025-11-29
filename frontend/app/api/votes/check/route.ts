import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { voter, pollCreator, pollIndex } = await request.json();

    if (!voter || !pollCreator || pollIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('scout-aptos');
    const votesCollection = db.collection('votes');

    const vote = await votesCollection.findOne({
      voter,
      pollCreator,
      pollIndex,
    });

    if (vote) {
      return NextResponse.json({
        hasVoted: true,
        stakeAmount: vote.stakeAmount,
        option: vote.option,
      });
    }

    return NextResponse.json({
      hasVoted: false,
    });
  } catch (error) {
    console.error('Error checking vote:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
