import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { pollCreator, pollIndex } = await request.json();

    const client = await clientPromise;
    const db = client.db('scout-aptos');
    const pollsCollection = db.collection('polls');

    const poll = await pollsCollection.findOne({
      creator: pollCreator,
      index: pollIndex,
    });

    return NextResponse.json({
      success: true,
      poll,
      found: !!poll,
      pollCreator,
      pollIndex,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
