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

    const ENO_POLL_STORE: u64 = 0;
    const EPOLL_EXPIRED: u64 = 1;
    const EINVALID_OPTION: u64 = 2;
    const EALREADY_VOTED: u64 = 3;
    const EINSUFFICIENT_STAKE: u64 = 4;

    public entry fun create_poll(
        account: signer,
        title: String,
        option1: String,
        option2: String,
        latitude: u64,
        longitude: u64,
        poll_time: u64,
        expiry_time: u64,
    ) acquires PollStore {
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
        };

        if (!exists<PollStore>(account_addr)) {
            move_to(&account, PollStore {
                polls: vector::empty<Poll>(),
            });
        };

        let poll_store = borrow_global_mut<PollStore>(account_addr);
        vector::push_back(&mut poll_store.polls, poll);

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
    ) acquires PollStore, VoteStore {
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
}
