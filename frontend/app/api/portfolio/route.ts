import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { userAddress } = await request.json();

    if (!userAddress) {
      return NextResponse.json(
        { error: 'Missing user address' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('scout-aptos');
    const pollsCollection = db.collection('polls');
    const votesCollection = db.collection('votes');

    // Get all polls hosted by the user
    const hostedPolls = await pollsCollection
      .find({ creator: userAddress })
      .sort({ createdAt: -1 })
      .toArray();

    // Get all votes by the user
    const userVotes = await votesCollection
      .find({ voter: userAddress })
      .sort({ createdAt: -1 })
      .toArray();

    // For each vote, get the poll details and calculate rewards if finalized
    const participatedPollsData = await Promise.all(
      userVotes.map(async (vote) => {
        const poll = await pollsCollection.findOne({
          creator: vote.pollCreator,
          index: vote.pollIndex,
        });

        if (!poll) return null;

        let reward = 0;
        let won = false;

        if (poll.is_finalized) {
          // Check if user voted for the winning option
          won = vote.option === poll.winning_option;

          if (won) {
            // Calculate reward
            const allVotes = await votesCollection
              .find({
                pollCreator: vote.pollCreator,
                pollIndex: vote.pollIndex,
              })
              .toArray();

            const option1Votes = allVotes.filter((v) => v.option === 1);
            const option2Votes = allVotes.filter((v) => v.option === 2);

            const totalOption1Stake = option1Votes.reduce((sum, v) => sum + v.stakeAmount, 0);
            const totalOption2Stake = option2Votes.reduce((sum, v) => sum + v.stakeAmount, 0);
            const totalPool = totalOption1Stake + totalOption2Stake;

            const winningVotes = poll.winning_option === 1 ? option1Votes : option2Votes;
            const totalWinningStake = poll.winning_option === 1 ? totalOption1Stake : totalOption2Stake;

            if (totalWinningStake > 0) {
              reward = (vote.stakeAmount * totalPool) / totalWinningStake;
            }
          }
        }

        return {
          poll,
          vote,
          won,
          reward,
        };
      })
    );

    // Filter out null entries
    const participatedPolls = participatedPollsData.filter((p) => p !== null);

    // Calculate stats for hosted polls
    const hostedPollsWithStats = await Promise.all(
      hostedPolls.map(async (poll) => {
        const allVotes = await votesCollection
          .find({
            pollCreator: poll.creator,
            pollIndex: poll.index,
          })
          .toArray();

        const option1Votes = allVotes.filter((v) => v.option === 1);
        const option2Votes = allVotes.filter((v) => v.option === 2);

        const totalOption1Stake = option1Votes.reduce((sum, v) => sum + v.stakeAmount, 0);
        const totalOption2Stake = option2Votes.reduce((sum, v) => sum + v.stakeAmount, 0);
        const totalPool = totalOption1Stake + totalOption2Stake;

        let winners = [];
        if (poll.is_finalized) {
          const winningVotes = poll.winning_option === 1 ? option1Votes : option2Votes;
          const totalWinningStake = poll.winning_option === 1 ? totalOption1Stake : totalOption2Stake;

          winners = winningVotes.map((vote) => {
            const proportionalReward = totalWinningStake > 0
              ? (vote.stakeAmount * totalPool) / totalWinningStake
              : 0;
            return {
              voter: vote.voter,
              stake: vote.stakeAmount,
              reward: proportionalReward,
            };
          });
        }

        return {
          ...poll,
          totalVotes: allVotes.length,
          totalPool,
          totalOption1Stake,
          totalOption2Stake,
          option1Votes: option1Votes.length,
          option2Votes: option2Votes.length,
          winners,
        };
      })
    );

    return NextResponse.json({
      success: true,
      hostedPolls: hostedPollsWithStats,
      participatedPolls,
    });
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
