module test_addr::polls {
    use std::error;
    use std::signer;
    use std::string::String;
    use std::vector;
    use aptos_framework::event;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;

    struct Poll has store, drop, copy {
        title: String,
        option1: String,
        option2: String,
        latitude: u64,
        longitude: u64,
        poll_time: u64,
        expiry_time: u64,
        creator: address,
        total_option1_stake: u64,
        total_option2_stake: u64,
        is_finalized: bool,
        winning_option: u8, // 0 = not set, 1 or 2 = winning option
    }

    struct PollVoters has key {
        // Maps poll_index to list of voters
        voters_option1: vector<vector<address>>,
        voters_option2: vector<vector<address>>,
        stakes_option1: vector<vector<u64>>,
        stakes_option2: vector<vector<u64>>,
    }

    struct Vote has store, drop, copy {
        voter: address,
        poll_creator: address,
        poll_index: u64,
        option_voted: u8, // 1 or 2
        stake_amount: u64,
        vote_time: u64,
    }

    struct PollStore has key {
        polls: vector<Poll>,
    }

    struct VoteStore has key {
        votes: vector<Vote>,
    }

    struct StakeStore has key {
        total_staked: u64,
    }

    #[event]
    struct PollCreated has drop, store {
        creator: address,
        title: String,
        poll_time: u64,
        expiry_time: u64,
    }

    #[event]
    struct VoteCast has drop, store {
        voter: address,
        poll_creator: address,
        poll_index: u64,
        option_voted: u8,
        stake_amount: u64,
        vote_time: u64,
    }

    #[event]
    struct PollFinalized has drop, store {
        poll_creator: address,
        poll_index: u64,
        winning_option: u8,
        total_pool: u64,
        winners_count: u64,
    }

    #[event]
    struct RewardDistributed has drop, store {
        poll_creator: address,
        poll_index: u64,
        winner: address,
        reward_amount: u64,
    }

    const ENO_POLL_STORE: u64 = 0;
    const EPOLL_EXPIRED: u64 = 1;
    const EINVALID_OPTION: u64 = 2;
    const EALREADY_VOTED: u64 = 3;
    const EINSUFFICIENT_STAKE: u64 = 4;
    const ENOT_POLL_CREATOR: u64 = 5;
    const EPOLL_ALREADY_FINALIZED: u64 = 6;
    const ENO_VOTES_FOR_OPTION: u64 = 7;

    public entry fun create_poll(
        account: signer,
        title: String,
        option1: String,
        option2: String,
        latitude: u64,
        longitude: u64,
        poll_time: u64,
        expiry_time: u64,
    ) acquires PollStore, PollVoters {
        let account_addr = signer::address_of(&account);

        let poll = Poll {
            title: copy title,
            option1,
            option2,
            latitude,
            longitude,
            poll_time,
            expiry_time,
            creator: account_addr,
            total_option1_stake: 0,
            total_option2_stake: 0,
            is_finalized: false,
            winning_option: 0,
        };

        if (!exists<PollStore>(account_addr)) {
            move_to(&account, PollStore {
                polls: vector::empty<Poll>(),
            });
        };

        if (!exists<PollVoters>(account_addr)) {
            move_to(&account, PollVoters {
                voters_option1: vector::empty(),
                voters_option2: vector::empty(),
                stakes_option1: vector::empty(),
                stakes_option2: vector::empty(),
            });
        };

        let poll_store = borrow_global_mut<PollStore>(account_addr);
        vector::push_back(&mut poll_store.polls, poll);

        // Initialize empty voter lists for this poll
        let poll_voters = borrow_global_mut<PollVoters>(account_addr);
        vector::push_back(&mut poll_voters.voters_option1, vector::empty());
        vector::push_back(&mut poll_voters.voters_option2, vector::empty());
        vector::push_back(&mut poll_voters.stakes_option1, vector::empty());
        vector::push_back(&mut poll_voters.stakes_option2, vector::empty());

        event::emit(PollCreated {
            creator: account_addr,
            title,
            poll_time,
            expiry_time,
        });
    }

    #[view]
    public fun get_polls_count(addr: address): u64 acquires PollStore {
        if (!exists<PollStore>(addr)) {
            return 0
        };
        let poll_store = borrow_global<PollStore>(addr);
        vector::length(&poll_store.polls)
    }

    #[view]
    public fun get_poll(addr: address, index: u64): (String, String, String, u64, u64, u64, u64, address) acquires PollStore {
        assert!(exists<PollStore>(addr), error::not_found(ENO_POLL_STORE));
        let poll_store = borrow_global<PollStore>(addr);
        let poll = vector::borrow(&poll_store.polls, index);
        (
            poll.title,
            poll.option1,
            poll.option2,
            poll.latitude,
            poll.longitude,
            poll.poll_time,
            poll.expiry_time,
            poll.creator,
        )
    }

    #[view]
    public fun get_all_polls(addr: address): vector<Poll> acquires PollStore {
        if (!exists<PollStore>(addr)) {
            return vector::empty<Poll>()
        };
        let poll_store = borrow_global<PollStore>(addr);
        poll_store.polls
    }

    public entry fun vote_on_poll(
        voter: &signer,
        poll_creator: address,
        poll_index: u64,
        option: u8,
        stake_amount: u64,
    ) acquires PollStore, VoteStore, PollVoters {
        let voter_addr = signer::address_of(voter);

        // Validate option is 1 or 2
        assert!(option == 1 || option == 2, error::invalid_argument(EINVALID_OPTION));

        // Validate stake amount is greater than 0
        assert!(stake_amount > 0, error::invalid_argument(EINSUFFICIENT_STAKE));

        // Check poll exists and get reference
        assert!(exists<PollStore>(poll_creator), error::not_found(ENO_POLL_STORE));
        let poll_store = borrow_global_mut<PollStore>(poll_creator);
        assert!(poll_index < vector::length(&poll_store.polls), error::not_found(ENO_POLL_STORE));

        // Check if poll is expired
        let poll = vector::borrow(&poll_store.polls, poll_index);
        let current_time = timestamp::now_seconds();
        assert!(current_time < poll.expiry_time, error::invalid_state(EPOLL_EXPIRED));

        // Check if user already voted on this poll
        if (exists<VoteStore>(voter_addr)) {
            let vote_store = borrow_global<VoteStore>(voter_addr);
            let votes = &vote_store.votes;
            let i = 0;
            let len = vector::length(votes);
            while (i < len) {
                let vote = vector::borrow(votes, i);
                assert!(
                    !(vote.poll_creator == poll_creator && vote.poll_index == poll_index),
                    error::already_exists(EALREADY_VOTED)
                );
                i = i + 1;
            };
        };

        // Transfer APT from voter to poll creator (as escrow)
        coin::transfer<AptosCoin>(voter, poll_creator, stake_amount);

        // Update poll with stake totals
        let poll_mut = vector::borrow_mut(&mut poll_store.polls, poll_index);
        if (option == 1) {
            poll_mut.total_option1_stake = poll_mut.total_option1_stake + stake_amount;
        } else {
            poll_mut.total_option2_stake = poll_mut.total_option2_stake + stake_amount;
        };

        // Track voter for reward distribution
        let poll_voters = borrow_global_mut<PollVoters>(poll_creator);
        if (option == 1) {
            let voters = vector::borrow_mut(&mut poll_voters.voters_option1, poll_index);
            vector::push_back(voters, voter_addr);
            let stakes = vector::borrow_mut(&mut poll_voters.stakes_option1, poll_index);
            vector::push_back(stakes, stake_amount);
        } else {
            let voters = vector::borrow_mut(&mut poll_voters.voters_option2, poll_index);
            vector::push_back(voters, voter_addr);
            let stakes = vector::borrow_mut(&mut poll_voters.stakes_option2, poll_index);
            vector::push_back(stakes, stake_amount);
        };

        // Create vote record
        let vote = Vote {
            voter: voter_addr,
            poll_creator,
            poll_index,
            option_voted: option,
            stake_amount,
            vote_time: current_time,
        };

        // Store vote in voter's VoteStore
        if (!exists<VoteStore>(voter_addr)) {
            move_to(voter, VoteStore {
                votes: vector::empty<Vote>(),
            });
        };
        let voter_vote_store = borrow_global_mut<VoteStore>(voter_addr);
        vector::push_back(&mut voter_vote_store.votes, vote);

        // Emit vote event
        event::emit(VoteCast {
            voter: voter_addr,
            poll_creator,
            poll_index,
            option_voted: option,
            stake_amount,
            vote_time: current_time,
        });
    }

    #[view]
    public fun get_user_votes(addr: address): vector<Vote> acquires VoteStore {
        if (!exists<VoteStore>(addr)) {
            return vector::empty<Vote>()
        };
        let vote_store = borrow_global<VoteStore>(addr);
        vote_store.votes
    }

    #[view]
    public fun get_poll_with_stakes(addr: address, index: u64): (String, String, String, u64, u64, u64, u64, address, u64, u64) acquires PollStore {
        assert!(exists<PollStore>(addr), error::not_found(ENO_POLL_STORE));
        let poll_store = borrow_global<PollStore>(addr);
        let poll = vector::borrow(&poll_store.polls, index);
        (
            poll.title,
            poll.option1,
            poll.option2,
            poll.latitude,
            poll.longitude,
            poll.poll_time,
            poll.expiry_time,
            poll.creator,
            poll.total_option1_stake,
            poll.total_option2_stake,
        )
    }

    public entry fun finalize_poll_and_distribute(
        host: &signer,
        poll_index: u64,
        winning_option: u8,
    ) acquires PollStore, PollVoters {
        let host_addr = signer::address_of(host);

        // Validate winning option is 1 or 2
        assert!(winning_option == 1 || winning_option == 2, error::invalid_argument(EINVALID_OPTION));

        // Check poll exists
        assert!(exists<PollStore>(host_addr), error::not_found(ENO_POLL_STORE));
        let poll_store = borrow_global_mut<PollStore>(host_addr);
        assert!(poll_index < vector::length(&poll_store.polls), error::not_found(ENO_POLL_STORE));

        // Get poll and verify host is the creator
        let poll = vector::borrow_mut(&mut poll_store.polls, poll_index);
        assert!(poll.creator == host_addr, error::permission_denied(ENOT_POLL_CREATOR));

        // Check poll is not already finalized
        assert!(!poll.is_finalized, error::already_exists(EPOLL_ALREADY_FINALIZED));

        // Mark poll as finalized
        poll.is_finalized = true;
        poll.winning_option = winning_option;

        // Calculate total pool
        let total_pool = poll.total_option1_stake + poll.total_option2_stake;

        // Get winners based on winning option
        let poll_voters = borrow_global<PollVoters>(host_addr);
        let winners: &vector<address>;
        let winner_stakes: &vector<u64>;

        if (winning_option == 1) {
            winners = vector::borrow(&poll_voters.voters_option1, poll_index);
            winner_stakes = vector::borrow(&poll_voters.stakes_option1, poll_index);
        } else {
            winners = vector::borrow(&poll_voters.voters_option2, poll_index);
            winner_stakes = vector::borrow(&poll_voters.stakes_option2, poll_index);
        };

        let winners_count = vector::length(winners);

        // If no winners, host keeps all funds (already transferred to host during voting)
        if (winners_count == 0) {
            event::emit(PollFinalized {
                poll_creator: host_addr,
                poll_index,
                winning_option,
                total_pool,
                winners_count: 0,
            });
            return
        };

        // Distribute rewards proportionally to each winner
        let i = 0;
        while (i < winners_count) {
            let winner_addr = *vector::borrow(winners, i);
            let winner_stake = *vector::borrow(winner_stakes, i);

            // Calculate proportional reward: (winner_stake / total_winning_stake) * total_pool
            let total_winning_stake = if (winning_option == 1) {
                poll.total_option1_stake
            } else {
                poll.total_option2_stake
            };

            let reward = (winner_stake * total_pool) / total_winning_stake;

            // Transfer reward from poll creator to winner
            coin::transfer<AptosCoin>(host, winner_addr, reward);

            event::emit(RewardDistributed {
                poll_creator: host_addr,
                poll_index,
                winner: winner_addr,
                reward_amount: reward,
            });

            i = i + 1;
        };

        event::emit(PollFinalized {
            poll_creator: host_addr,
            poll_index,
            winning_option,
            total_pool,
            winners_count,
        });
    }

}
