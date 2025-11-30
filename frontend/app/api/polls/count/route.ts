import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('scout');
    const pollsCollection = db.collection('polls');

    const currentTime = Math.floor(Date.now() / 1000);

    // Count polls that are not finalized and not expired
    const count = await pollsCollection.countDocuments({
      is_finalized: false,
      expiryTime: { $gt: currentTime },
    });

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Error counting polls:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to count polls',
      },
      { status: 500 }
    );
  }
}
