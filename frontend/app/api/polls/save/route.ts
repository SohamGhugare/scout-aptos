import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Poll } from '@/lib/models/Poll';

export async function POST(request: NextRequest) {
  try {
    const pollData: Poll = await request.json();

    if (!pollData.creator || !pollData.title || !pollData.transactionHash) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('scout-aptos');
    const pollsCollection = db.collection('polls');

    // Get the count of existing polls by this creator to determine the next index
    const existingPollsCount = await pollsCollection.countDocuments({
      creator: pollData.creator,
    });

    await pollsCollection.insertOne({
      ...pollData,
      index: existingPollsCount, // Assign sequential index per creator
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Poll saved to database successfully',
      index: existingPollsCount,
    });
  } catch (error) {
    console.error('Error saving poll:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
