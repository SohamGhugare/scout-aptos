import { NextRequest, NextResponse } from 'next/server';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

export async function POST(request: NextRequest) {
  try {
    const { userAddress } = await request.json();

    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      );
    }

    const config = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(config);
    const moduleAddress = process.env.NEXT_PUBLIC_MODULE_ADDRESS;

    const result = await aptos.view({
      payload: {
        function: `${moduleAddress}::polls::get_all_polls`,
        functionArguments: [userAddress],
      },
    });

    const pollsData = result[0] as any[];

    if (!pollsData || pollsData.length === 0) {
      return NextResponse.json({
        success: true,
        polls: [],
        count: 0,
      });
    }

    const polls = pollsData.map((poll: any, index: number) => ({
      title: poll.title,
      option1: poll.option1,
      option2: poll.option2,
      latitude: Number(poll.latitude),
      longitude: Number(poll.longitude),
      pollTime: typeof poll.poll_time === 'string' ? parseInt(poll.poll_time) : Number(poll.poll_time),
      expiryTime: typeof poll.expiry_time === 'string' ? parseInt(poll.expiry_time) : Number(poll.expiry_time),
      creator: poll.creator,
      index,
    }));

    return NextResponse.json({
      success: true,
      polls,
      count: polls.length,
    });
  } catch (error) {
    console.error('Error fetching polls:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
