import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('data');
    const polls = db.collection('polls');

    // Fetch all active polls
    const allPolls = await polls
      .find({ status: 'active' })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      polls: allPolls,
    });
  } catch (error) {
    console.error('Error fetching polls:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
