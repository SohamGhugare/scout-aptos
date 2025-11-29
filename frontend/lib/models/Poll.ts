export interface Poll {
  title: string;
  option1: string;
  option2: string;
  latitude: number;
  longitude: number;
  pollTime: number;
  expiryTime: number;
  creator: string;
  index: number;
  transactionHash: string;
  createdAt: Date;
  total_option1_stake?: number;
  total_option2_stake?: number;
  is_finalized?: boolean;
  winning_option?: number;
}

export interface Vote {
  pollCreator: string;
  pollIndex: number;
  voter: string;
  option: number;
  stakeAmount: number;
  transactionHash: string;
  votedAt: Date;
}
