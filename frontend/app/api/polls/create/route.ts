import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, title, options, location } = await request.json();

    // Validate input
    if (!walletAddress || !title || !options || options.length !== 2) {
      return NextResponse.json(
        { error: 'Wallet address, title, and exactly 2 options are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('data');
    const users = db.collection('users');
    const polls = db.collection('polls');

    // Get username from wallet address
    const user = await users.findOne({ walletAddress });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please create a username first.' },
        { status: 404 }
      );
    }

    // Create poll document
    const poll = {
      title: title.trim(),
      options: options.map((opt: string, index: number) => ({
        id: index,
        text: opt.trim(),
        votes: 0,
        voters: [] as string[], // Array of wallet addresses who voted for this option
      })),
      createdBy: {
        walletAddress,
        username: user.username,
      },
      location: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
      } : null,
      totalVotes: 0,
      createdAt: new Date(),
      status: 'active', // active, closed
    };

    const result = await polls.insertOne(poll);

    return NextResponse.json({
      success: true,
      pollId: result.insertedId,
      message: 'Poll created successfully',
    });
  } catch (error) {
    console.error('Error creating poll:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
