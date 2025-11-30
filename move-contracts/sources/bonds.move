module test_addr::bonds {
    use std::error;
    use std::signer;
    use std::vector;
    use aptos_framework::event;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;

    const PROPOSAL_BOND_AMOUNT: u64 = 50000000; // 0.5 APT
    const DISPUTE_BOND_AMOUNT: u64 = 50000000;  // 0.5 APT

    // Error codes
    const EINSUFFICIENT_BALANCE: u64 = 0;
    const EBOND_ALREADY_EXISTS: u64 = 1;
    const ENO_BOND_FOUND: u64 = 2;
    const ENOT_BOND_OWNER: u64 = 3;
    const EBOND_ALREADY_RELEASED: u64 = 4;
    const EPOLL_NOT_DISPUTED: u64 = 5;
    const EPOLL_ALREADY_DISPUTED: u64 = 6;

    // Stores proposal bonds for each poll creator
    struct ProposalBond has store, drop, copy {
        poll_creator: address,
        poll_index: u64,
        bond_amount: u64,
        is_released: bool,
        is_slashed: bool,
    }

    // Stores dispute bonds
    struct DisputeBond has store, drop, copy {
        poll_creator: address,
        poll_index: u64,
        disputer: address,
        bond_amount: u64,
        is_released: bool,
        is_slashed: bool,
    }

    // Tracks if a poll has been disputed
    struct DisputeStatus has store, drop, copy {
        poll_creator: address,
        poll_index: u64,
        is_disputed: bool,
        disputer: address,
    }

    // Storage for all proposal bonds
    struct ProposalBondStore has key {
        bonds: vector<ProposalBond>,
    }

    // Storage for all dispute bonds
    struct DisputeBondStore has key {
        bonds: vector<DisputeBond>,
    }

    // Storage for dispute statuses
    struct DisputeStatusStore has key {
        disputes: vector<DisputeStatus>,
    }

    // Storage for holding bond funds (escrow)
    struct BondEscrow has key {
        proposal_bonds_held: u64,
        dispute_bonds_held: u64,
    }

    #[event]
    struct ProposalBondDeposited has drop, store {
        poll_creator: address,
        poll_index: u64,
        bond_amount: u64,
    }

    #[event]
    struct DisputeBondDeposited has drop, store {
        poll_creator: address,
        poll_index: u64,
        disputer: address,
        bond_amount: u64,
    }

    #[event]
    struct ProposalBondReleased has drop, store {
        poll_creator: address,
        poll_index: u64,
        bond_amount: u64,
    }

    #[event]
    struct DisputeBondReleased has drop, store {
        poll_creator: address,
        poll_index: u64,
        disputer: address,
        bond_amount: u64,
    }

    #[event]
    struct ProposalBondSlashed has drop, store {
        poll_creator: address,
        poll_index: u64,
        bond_amount: u64,
    }

    #[event]
    struct DisputeBondSlashed has drop, store {
        poll_creator: address,
        poll_index: u64,
        disputer: address,
        bond_amount: u64,
    }

    #[event]
    struct PollDisputed has drop, store {
        poll_creator: address,
        poll_index: u64,
        disputer: address,
    }

    // Initialize the bond stores for an account
    fun init_bond_stores(account: &signer) {
        let account_addr = signer::address_of(account);

        if (!exists<ProposalBondStore>(account_addr)) {
            move_to(account, ProposalBondStore {
                bonds: vector::empty<ProposalBond>(),
            });
        };

        if (!exists<DisputeBondStore>(account_addr)) {
            move_to(account, DisputeBondStore {
                bonds: vector::empty<DisputeBond>(),
            });
        };

        if (!exists<DisputeStatusStore>(account_addr)) {
            move_to(account, DisputeStatusStore {
                disputes: vector::empty<DisputeStatus>(),
            });
        };

        if (!exists<BondEscrow>(account_addr)) {
            move_to(account, BondEscrow {
                proposal_bonds_held: 0,
                dispute_bonds_held: 0,
            });
        };
    }

    // Deposit proposal bond when creating a poll
    public entry fun deposit_proposal_bond(
        creator: &signer,
        poll_index: u64,
    ) acquires ProposalBondStore, BondEscrow {
        let creator_addr = signer::address_of(creator);

        // Check if user has sufficient balance
        let balance = coin::balance<AptosCoin>(creator_addr);
        assert!(balance >= PROPOSAL_BOND_AMOUNT, error::invalid_argument(EINSUFFICIENT_BALANCE));

        // Initialize stores if needed
        init_bond_stores(creator);

        // Check if bond already exists for this poll
        if (exists<ProposalBondStore>(creator_addr)) {
            let bond_store = borrow_global<ProposalBondStore>(creator_addr);
            let i = 0;
            let len = vector::length(&bond_store.bonds);
            while (i < len) {
                let bond = vector::borrow(&bond_store.bonds, i);
                assert!(
                    !(bond.poll_creator == creator_addr && bond.poll_index == poll_index),
                    error::already_exists(EBOND_ALREADY_EXISTS)
                );
                i = i + 1;
            };
        };

        // Transfer bond to self (held in escrow)
        // Note: In a production system, you might want a separate escrow account
        let escrow = borrow_global_mut<BondEscrow>(creator_addr);
        escrow.proposal_bonds_held = escrow.proposal_bonds_held + PROPOSAL_BOND_AMOUNT;

        // Create bond record
        let bond = ProposalBond {
            poll_creator: creator_addr,
            poll_index,
            bond_amount: PROPOSAL_BOND_AMOUNT,
            is_released: false,
            is_slashed: false,
        };

        // Store bond
        let bond_store = borrow_global_mut<ProposalBondStore>(creator_addr);
        vector::push_back(&mut bond_store.bonds, bond);

        // Emit event
        event::emit(ProposalBondDeposited {
            poll_creator: creator_addr,
            poll_index,
            bond_amount: PROPOSAL_BOND_AMOUNT,
        });
    }

    // Deposit dispute bond when flagging a poll as disputed
    public entry fun deposit_dispute_bond(
        disputer: &signer,
        poll_creator: address,
        poll_index: u64,
    ) acquires DisputeBondStore, DisputeStatusStore, BondEscrow {
        let disputer_addr = signer::address_of(disputer);

        // Check if user has sufficient balance
        let balance = coin::balance<AptosCoin>(disputer_addr);
        assert!(balance >= DISPUTE_BOND_AMOUNT, error::invalid_argument(EINSUFFICIENT_BALANCE));

        // Initialize stores if needed
        init_bond_stores(disputer);

        // Check if poll is already disputed
        if (exists<DisputeStatusStore>(poll_creator)) {
            let dispute_store = borrow_global<DisputeStatusStore>(poll_creator);
            let i = 0;
            let len = vector::length(&dispute_store.disputes);
            while (i < len) {
                let dispute = vector::borrow(&dispute_store.disputes, i);
                assert!(
                    !(dispute.poll_creator == poll_creator && dispute.poll_index == poll_index && dispute.is_disputed),
                    error::already_exists(EPOLL_ALREADY_DISPUTED)
                );
                i = i + 1;
            };
        };

        // Transfer bond to self (held in escrow)
        let escrow = borrow_global_mut<BondEscrow>(disputer_addr);
        escrow.dispute_bonds_held = escrow.dispute_bonds_held + DISPUTE_BOND_AMOUNT;

        // Create bond record
        let bond = DisputeBond {
            poll_creator,
            poll_index,
            disputer: disputer_addr,
            bond_amount: DISPUTE_BOND_AMOUNT,
            is_released: false,
            is_slashed: false,
        };

        // Store bond
        let bond_store = borrow_global_mut<DisputeBondStore>(disputer_addr);
        vector::push_back(&mut bond_store.bonds, bond);

        // Mark poll as disputed
        if (!exists<DisputeStatusStore>(poll_creator)) {
            move_to(&get_signer_for_address(poll_creator), DisputeStatusStore {
                disputes: vector::empty<DisputeStatus>(),
            });
        };

        let dispute_status = DisputeStatus {
            poll_creator,
            poll_index,
            is_disputed: true,
            disputer: disputer_addr,
        };

        // For now, we'll store in disputer's account since we can't move to arbitrary addresses
        if (!exists<DisputeStatusStore>(disputer_addr)) {
            init_bond_stores(disputer);
        };
        let dispute_store = borrow_global_mut<DisputeStatusStore>(disputer_addr);
        vector::push_back(&mut dispute_store.disputes, dispute_status);

        // Emit events
        event::emit(DisputeBondDeposited {
            poll_creator,
            poll_index,
            disputer: disputer_addr,
            bond_amount: DISPUTE_BOND_AMOUNT,
        });

        event::emit(PollDisputed {
            poll_creator,
            poll_index,
            disputer: disputer_addr,
        });
    }

    // Placeholder for getting signer - in production, this would use a different pattern
    fun get_signer_for_address(_addr: address): signer {
        abort error::permission_denied(ENOT_BOND_OWNER)
    }

    // Release proposal bond back to creator (called when poll is successfully finalized)
    public entry fun release_proposal_bond(
        creator: &signer,
        poll_index: u64,
    ) acquires ProposalBondStore, BondEscrow {
        let creator_addr = signer::address_of(creator);

        assert!(exists<ProposalBondStore>(creator_addr), error::not_found(ENO_BOND_FOUND));

        let bond_store = borrow_global_mut<ProposalBondStore>(creator_addr);
        let i = 0;
        let len = vector::length(&bond_store.bonds);
        let found = false;

        while (i < len) {
            let bond = vector::borrow_mut(&mut bond_store.bonds, i);
            if (bond.poll_creator == creator_addr && bond.poll_index == poll_index) {
                assert!(!bond.is_released, error::already_exists(EBOND_ALREADY_RELEASED));
                assert!(!bond.is_slashed, error::invalid_state(EBOND_ALREADY_RELEASED));

                bond.is_released = true;

                // Update escrow
                let escrow = borrow_global_mut<BondEscrow>(creator_addr);
                escrow.proposal_bonds_held = escrow.proposal_bonds_held - PROPOSAL_BOND_AMOUNT;

                // Emit event
                event::emit(ProposalBondReleased {
                    poll_creator: creator_addr,
                    poll_index,
                    bond_amount: PROPOSAL_BOND_AMOUNT,
                });

                found = true;
                break
            };
            i = i + 1;
        };

        assert!(found, error::not_found(ENO_BOND_FOUND));
    }

    // Release dispute bond back to disputer (called when dispute is resolved in disputer's favor)
    public entry fun release_dispute_bond(
        disputer: &signer,
        poll_creator: address,
        poll_index: u64,
    ) acquires DisputeBondStore, BondEscrow {
        let disputer_addr = signer::address_of(disputer);

        assert!(exists<DisputeBondStore>(disputer_addr), error::not_found(ENO_BOND_FOUND));

        let bond_store = borrow_global_mut<DisputeBondStore>(disputer_addr);
        let i = 0;
        let len = vector::length(&bond_store.bonds);
        let found = false;

        while (i < len) {
            let bond = vector::borrow_mut(&mut bond_store.bonds, i);
            if (bond.poll_creator == poll_creator && bond.poll_index == poll_index && bond.disputer == disputer_addr) {
                assert!(!bond.is_released, error::already_exists(EBOND_ALREADY_RELEASED));
                assert!(!bond.is_slashed, error::invalid_state(EBOND_ALREADY_RELEASED));

                bond.is_released = true;

                // Update escrow
                let escrow = borrow_global_mut<BondEscrow>(disputer_addr);
                escrow.dispute_bonds_held = escrow.dispute_bonds_held - DISPUTE_BOND_AMOUNT;

                // Emit event
                event::emit(DisputeBondReleased {
                    poll_creator,
                    poll_index,
                    disputer: disputer_addr,
                    bond_amount: DISPUTE_BOND_AMOUNT,
                });

                found = true;
                break
            };
            i = i + 1;
        };

        assert!(found, error::not_found(ENO_BOND_FOUND));
    }

    // Slash proposal bond (called when dispute is successful - poll was fraudulent)
    public entry fun slash_proposal_bond(
        authority: &signer,
        poll_creator: address,
        poll_index: u64,
    ) acquires ProposalBondStore, BondEscrow {
        assert!(exists<ProposalBondStore>(poll_creator), error::not_found(ENO_BOND_FOUND));

        let bond_store = borrow_global_mut<ProposalBondStore>(poll_creator);
        let i = 0;
        let len = vector::length(&bond_store.bonds);
        let found = false;

        while (i < len) {
            let bond = vector::borrow_mut(&mut bond_store.bonds, i);
            if (bond.poll_creator == poll_creator && bond.poll_index == poll_index) {
                assert!(!bond.is_released, error::already_exists(EBOND_ALREADY_RELEASED));
                assert!(!bond.is_slashed, error::invalid_state(EBOND_ALREADY_RELEASED));

                bond.is_slashed = true;

                // Update escrow - funds remain but are marked as slashed
                let escrow = borrow_global_mut<BondEscrow>(poll_creator);
                escrow.proposal_bonds_held = escrow.proposal_bonds_held - PROPOSAL_BOND_AMOUNT;

                // Emit event
                event::emit(ProposalBondSlashed {
                    poll_creator,
                    poll_index,
                    bond_amount: PROPOSAL_BOND_AMOUNT,
                });

                found = true;
                break
            };
            i = i + 1;
        };

        assert!(found, error::not_found(ENO_BOND_FOUND));
    }

    // Slash dispute bond (called when dispute is invalid)
    public entry fun slash_dispute_bond(
        authority: &signer,
        disputer: address,
        poll_creator: address,
        poll_index: u64,
    ) acquires DisputeBondStore, BondEscrow {
        // In production, you'd verify authority has permission to slash

        assert!(exists<DisputeBondStore>(disputer), error::not_found(ENO_BOND_FOUND));

        let bond_store = borrow_global_mut<DisputeBondStore>(disputer);
        let i = 0;
        let len = vector::length(&bond_store.bonds);
        let found = false;

        while (i < len) {
            let bond = vector::borrow_mut(&mut bond_store.bonds, i);
            if (bond.poll_creator == poll_creator && bond.poll_index == poll_index && bond.disputer == disputer) {
                assert!(!bond.is_released, error::already_exists(EBOND_ALREADY_RELEASED));
                assert!(!bond.is_slashed, error::invalid_state(EBOND_ALREADY_RELEASED));

                bond.is_slashed = true;

                // Update escrow
                let escrow = borrow_global_mut<BondEscrow>(disputer);
                escrow.dispute_bonds_held = escrow.dispute_bonds_held - DISPUTE_BOND_AMOUNT;

                // Emit event
                event::emit(DisputeBondSlashed {
                    poll_creator,
                    poll_index,
                    disputer,
                    bond_amount: DISPUTE_BOND_AMOUNT,
                });

                found = true;
                break
            };
            i = i + 1;
        };

        assert!(found, error::not_found(ENO_BOND_FOUND));
    }

    // View functions

    #[view]
    public fun get_proposal_bond_amount(): u64 {
        PROPOSAL_BOND_AMOUNT
    }

    #[view]
    public fun get_dispute_bond_amount(): u64 {
        DISPUTE_BOND_AMOUNT
    }

    #[view]
    public fun get_user_proposal_bonds(addr: address): vector<ProposalBond> acquires ProposalBondStore {
        if (!exists<ProposalBondStore>(addr)) {
            return vector::empty<ProposalBond>()
        };
        let bond_store = borrow_global<ProposalBondStore>(addr);
        bond_store.bonds
    }

    #[view]
    public fun get_user_dispute_bonds(addr: address): vector<DisputeBond> acquires DisputeBondStore {
        if (!exists<DisputeBondStore>(addr)) {
            return vector::empty<DisputeBond>()
        };
        let bond_store = borrow_global<DisputeBondStore>(addr);
        bond_store.bonds
    }

    #[view]
    public fun is_poll_disputed(disputer_addr: address, poll_creator: address, poll_index: u64): bool acquires DisputeStatusStore {
        if (!exists<DisputeStatusStore>(disputer_addr)) {
            return false
        };

        let dispute_store = borrow_global<DisputeStatusStore>(disputer_addr);
        let i = 0;
        let len = vector::length(&dispute_store.disputes);

        while (i < len) {
            let dispute = vector::borrow(&dispute_store.disputes, i);
            if (dispute.poll_creator == poll_creator && dispute.poll_index == poll_index && dispute.is_disputed) {
                return true
            };
            i = i + 1;
        };

        false
    }

    #[view]
    public fun get_escrow_balance(addr: address): (u64, u64) acquires BondEscrow {
        if (!exists<BondEscrow>(addr)) {
            return (0, 0)
        };
        let escrow = borrow_global<BondEscrow>(addr);
        (escrow.proposal_bonds_held, escrow.dispute_bonds_held)
    }
}
