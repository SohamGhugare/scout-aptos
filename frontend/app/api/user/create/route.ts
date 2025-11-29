import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, username } = await request.json();

    if (!walletAddress || !username) {
      return NextResponse.json(
        { error: 'Wallet address and username are required' },
        { status: 400 }
      );
    }

    // Validate username format (alphanumeric and underscores only, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('data');
    const users = db.collection('users');

    // Check if username already exists (case-insensitive)
    const existingUsername = await users.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });
    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      );
    }

    // Check if wallet already has a username
    const existingWallet = await users.findOne({ walletAddress });
    if (existingWallet) {
      return NextResponse.json(
        { error: 'Wallet already has a username' },
        { status: 409 }
      );
    }

    // Create new user (preserves the original case)
    await users.insertOne({
      walletAddress,
      username,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      username,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
