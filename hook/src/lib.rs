#![no_std]
#![allow(unused)]
use xrpl_hook_prelude::*;

// Burns 1% of every Spark token transfer.
#[hook]
fn burn_one_percent(tx: &mut HookCtx) -> i32 {
    // Only run on successful payments
    if !tx.is_xrp_payment() {
        return 0;
    }
    let amt = tx.amount();
    let burn = amt / 100; // 1%
    if burn == 0 { return 0; }

    tx.burn(burn);
    ACCEPT("1% Spark burned", 0);
}