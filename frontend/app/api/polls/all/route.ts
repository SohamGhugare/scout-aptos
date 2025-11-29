import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('scout-aptos');
    const pollsCollection = db.collection('polls');

    const polls = await pollsCollection.find({}).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({
      success: true,
      polls,
      count: polls.length,
    });
  } catch (error) {
    console.error('Error fetching polls from database:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
