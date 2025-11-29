import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { pollCreator, pollIndex, winningOption } = await request.json();

    if (!pollCreator || pollIndex === undefined || !winningOption) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('scout-aptos');
    const votesCollection = db.collection('votes');

    // Get all votes for this poll
    const allVotes = await votesCollection
      .find({
        pollCreator,
        pollIndex,
      })
      .toArray();

    // Separate votes by option
    const option1Votes = allVotes.filter((v) => v.option === 1);
    const option2Votes = allVotes.filter((v) => v.option === 2);

    // Calculate total stakes
    const totalOption1Stake = option1Votes.reduce((sum, v) => sum + v.stakeAmount, 0);
    const totalOption2Stake = option2Votes.reduce((sum, v) => sum + v.stakeAmount, 0);
    const totalPool = totalOption1Stake + totalOption2Stake;

    // Get winning votes
    const winningVotes = winningOption === 1 ? option1Votes : option2Votes;
    const totalWinningStake = winningOption === 1 ? totalOption1Stake : totalOption2Stake;

    // Calculate reward per winner
    const rewardsPerWinner = winningVotes.map((vote) => {
      const proportionalReward = totalWinningStake > 0
        ? (vote.stakeAmount * totalPool) / totalWinningStake
        : 0;
      return {
        voter: vote.voter,
        stake: vote.stakeAmount,
        reward: proportionalReward,
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalPool,
        totalOption1Stake,
        totalOption2Stake,
        option1VotesCount: option1Votes.length,
        option2VotesCount: option2Votes.length,
        winnersCount: winningVotes.length,
        totalWinningStake,
        rewardsPerWinner,
      },
    });
  } catch (error) {
    console.error('Error calculating poll stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
