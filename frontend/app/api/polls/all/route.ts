import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('scout-aptos');
    const pollsCollection = db.collection('polls');
    const votesCollection = db.collection('votes');

    const polls = await pollsCollection.find({}).sort({ createdAt: -1 }).toArray();

    // Add vote counts for each poll
    const pollsWithVoteCounts = await Promise.all(
      polls.map(async (poll) => {
        const allVotes = await votesCollection
          .find({
            pollCreator: poll.creator,
            pollIndex: poll.index,
          })
          .toArray();

        const option1VotesCount = allVotes.filter((v) => v.option === 1).length;
        const option2VotesCount = allVotes.filter((v) => v.option === 2).length;

        return {
          ...poll,
          option1_votes_count: option1VotesCount,
          option2_votes_count: option2VotesCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      polls: pollsWithVoteCounts,
      count: pollsWithVoteCounts.length,
    });
  } catch (error) {
    console.error('Error fetching polls from database:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
