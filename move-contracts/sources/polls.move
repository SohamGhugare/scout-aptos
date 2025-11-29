module test_addr::polls {
    use std::error;
    use std::signer;
    use std::string::String;
    use std::vector;
    use aptos_framework::event;

    struct Poll has store, drop {
        title: String,
        option1: String,
        option2: String,
        latitude: u64,
        longitude: u64,
        poll_time: u64,
        expiry_time: u64,
        creator: address,
    }

    struct PollStore has key {
        polls: vector<Poll>,
    }

    #[event]
    struct PollCreated has drop, store {
        creator: address,
        title: String,
        poll_time: u64,
        expiry_time: u64,
    }

    const ENO_POLL_STORE: u64 = 0;
    const EPOLL_EXPIRED: u64 = 1;

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
}
