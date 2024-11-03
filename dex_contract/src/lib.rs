#![cfg_attr(not(feature = "std"), no_std)]

use concordium_cis2::*;
use concordium_std::*;
use core::fmt::Debug;
use std::collections::BTreeMap;

/// Token amount type
type TokenAmount = u64;
/// Contract token ID type
type ContractTokenId = TokenIdU8;

/// Represents a token pair in the DEX
#[derive(Serialize, SchemaType, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct TokenPair {
    token0_address: ContractAddress,
    token1_address: ContractAddress,
    token0_id: ContractTokenId,
    token1_id: ContractTokenId,
}

/// Represents a liquidity pool for a token pair
#[derive(Serialize, SchemaType, Clone)]
pub struct LiquidityPool {
    token0_reserve: TokenAmount,
    token1_reserve: TokenAmount,
    total_shares: TokenAmount,
}

/// Main contract state
#[derive(Serialize, SchemaType)]
pub struct State {
    /// Maps token pair to their liquidity pool
    pools: BTreeMap<TokenPair, LiquidityPool>,
    /// Maps address to their liquidity shares for each pool
    shares: BTreeMap<(TokenPair, AccountAddress), TokenAmount>,
}

/// Contract errors
#[derive(Debug, PartialEq, Eq, Reject, Serialize, SchemaType)]
pub enum CustomError {
    ParseError,
    InsufficientLiquidity,
    PoolNotFound,
    InvalidTokenPair,
    InsufficientAmount,
    InsufficientShares,
    TransferError,
    UnauthorizedToken,
    FailedTokenTransfer,
    ArithmeticError,
    InvalidState,
}

/// Parameters for adding liquidity
#[derive(Serialize, SchemaType)]
pub struct AddLiquidityParams {
    token_pair: TokenPair,
    amount0: TokenAmount,
    amount1: TokenAmount,
    min_liquidity: TokenAmount,
}

/// Parameters for swapping tokens
#[derive(Serialize, SchemaType)]
pub struct SwapParams {
    token_pair: TokenPair,
    amount_in: TokenAmount,
    min_amount_out: TokenAmount,
    is_token0: bool,
}

/// Parameters for removing liquidity
#[derive(Serialize, SchemaType)]
pub struct RemoveLiquidityParams {
    token_pair: TokenPair,
    shares: TokenAmount,
    min_amount0: TokenAmount,
    min_amount1: TokenAmount,
}

impl State {
    fn empty() -> Self {
        State {
            pools: BTreeMap::new(),
            shares: BTreeMap::new(),
        }
    }
}

/// Creates a new instance of the smart contract.
#[init(contract = "dex_contract")]
fn init(_ctx: &InitContext, _state_builder: &mut StateBuilder) -> InitResult<State> {
    Ok(State::empty())
}

/// Helper function to transfer CIS-2 tokens
fn transfer_token(
    host: &mut Host<State>,
    token_address: &ContractAddress,
    token_id: &ContractTokenId,
    from: &Address,
    to: &Receiver,
    amount: TokenAmountU64,
) -> Result<(), CustomError> {
    let parameter = TransferParams::from(vec![Transfer {
        from: *from,
        token_id: *token_id,
        data: AdditionalData::empty(),
        to: to.clone(),
        amount: amount,
    }]);

    host.invoke_contract(
        token_address,
        &parameter,
        EntrypointName::new("transfer").unwrap(),
        Amount::zero(),
    )
    .map_err(|_| CustomError::TransferError)?;

    Ok(())
}

/// Helper function to safely perform arithmetic operations
fn checked_arithmetic<F>(f: F) -> Result<TokenAmount, CustomError>
where
    F: FnOnce() -> Option<TokenAmount>,
{
    f().ok_or(CustomError::ArithmeticError)
}

fn sqrt_token_amount(amount: TokenAmount) -> Option<TokenAmount> {
    let value: u64 = amount.into();
    let mut x: u64 = value;
    let mut y: u64 = (x + 1) / 2;

    while y < x {
        x = y;
        y = (x + value / x) / 2;
    }

    Some(x)
}

#[receive(
    contract = "dex_contract",
    name = "addLiquidity",
    parameter = "AddLiquidityParams",
    error = "CustomError",
    mutable
)]
fn add_liquidity(ctx: &ReceiveContext, host: &mut Host<State>) -> ReceiveResult<()> {
    let params: AddLiquidityParams = ctx.parameter_cursor().get()?;
    let sender = ctx.sender();

    // Verify input amounts
    ensure!(
        params.amount0 > 0 && params.amount1 > 0,
        CustomError::InsufficientAmount.into()
    );

    // Transfer tokens from sender to contract
    transfer_token(
        host,
        &params.token_pair.token0_address,
        &params.token_pair.token0_id,
        &sender,
        &Receiver::Contract(
            ctx.self_address(),
            OwnedEntrypointName::new_unchecked("receive".to_string()),
        ),
        TokenAmountU64::from(params.amount0),
    )?;

    transfer_token(
        host,
        &params.token_pair.token1_address,
        &params.token_pair.token1_id,
        &sender,
        &Receiver::Contract(
            ctx.self_address(),
            OwnedEntrypointName::new_unchecked("receive".to_string()),
        ),
        TokenAmountU64::from(params.amount1),
    )?;

    let pool = host
        .state_mut()
        .pools
        .entry(params.token_pair.clone())
        .or_insert_with(|| LiquidityPool {
            token0_reserve: 0,
            token1_reserve: 0,
            total_shares: 0,
        });

    // Calculate shares
    let shares = if pool.total_shares == 0 {
        // Initial liquidity
        checked_arithmetic(|| {
            let amount0_u64: u64 = params.amount0.into();
            let amount1_u64: u64 = params.amount1.into();
            let product: u64 = amount0_u64.checked_mul(amount1_u64)?;
            sqrt_token_amount(product)
        })?
    } else {
        // Subsequent liquidity
        let shares0 = checked_arithmetic(|| {
            let numerator = params.amount0.checked_mul(pool.total_shares)?;
            let denominator: u64 = pool.token0_reserve;

            // Ensure division by zero is handled safely
            if denominator == 0 {
                return None;
            }

            let result = numerator / denominator;
            Some(result) // Convert back to `TokenAmountU64` for consistency
        })?;

        let shares1 = checked_arithmetic(|| {
            let numerator = params.amount1.checked_mul(pool.total_shares)?;
            let denominator: u64 = pool.token1_reserve;

            // Ensure division by zero is handled safely
            if denominator == 0 {
                return None;
            }

            let result = numerator / denominator;
            Some(result) // Convert back to `TokenAmountU64` for consistency
        })?;
        std::cmp::min(shares0, shares1)
    };
    ensure!(
        shares >= params.min_liquidity,
        CustomError::InsufficientLiquidity.into()
    );

    // Update pool reserves
    pool.token0_reserve = checked_arithmetic(|| Some(pool.token0_reserve + params.amount0))?;
    pool.token1_reserve = checked_arithmetic(|| Some(pool.token1_reserve + params.amount1))?;
    pool.total_shares = checked_arithmetic(|| Some(pool.total_shares + shares))?;

    // Update user shares
    let sender_address = match sender {
        Address::Account(addr) => addr,
        _ => return Err(CustomError::ParseError.into()),
    };
    let user_shares = host
        .state_mut()
        .shares
        .entry((params.token_pair, sender_address))
        .or_insert(0u64); // Ensure this starts as `u64`

    // Convert `u64` to `TokenAmountU64` for addition
    let user_shares_token_amount = *user_shares;

    // Perform the checked arithmetic operation
    let shares_result = checked_arithmetic(|| Some(user_shares_token_amount + shares))?;

    // Convert `TokenAmountU64` to `u64` if needed for storage or further calculations
    let shares_u64: u64 = shares_result.into(); // Convert `TokenAmountU64` to `u64`

    *user_shares = shares_u64;

    Ok(())
}

#[receive(
    contract = "dex_contract",
    name = "removeLiquidity",
    parameter = "RemoveLiquidityParams",
    error = "CustomError",
    mutable
)]
fn remove_liquidity(ctx: &ReceiveContext, host: &mut Host<State>) -> ReceiveResult<()> {
    let params: RemoveLiquidityParams = ctx.parameter_cursor().get()?;
    let sender = match ctx.sender() {
        Address::Account(addr) => addr,
        _ => return Err(CustomError::ParseError.into()),
    };

    // Get pool and verify it exists
    let (pool, user_shares) = {
        let pools = host.state_mut();
        let pool = pools
            .pools
            .get_mut(&params.token_pair)
            .ok_or(CustomError::PoolNotFound)?;

        // Get user's shares
        let user_shares = pools
            .shares
            .get_mut(&(params.token_pair.clone(), sender))
            .ok_or(CustomError::InsufficientShares)?;

        (pool, user_shares)
    };

    ensure!(
        *user_shares >= params.shares,
        CustomError::InsufficientShares.into()
    );

    // Calculate token amounts to return
    let amount0 =
        checked_arithmetic(|| Some((params.shares * pool.token0_reserve) / pool.total_shares))?;
    let amount1 =
        checked_arithmetic(|| Some((params.shares * pool.token1_reserve) / pool.total_shares))?;

    // Verify minimum amounts
    ensure!(
        amount0 >= params.min_amount0.into(),
        CustomError::InsufficientAmount.into()
    );
    ensure!(
        amount1 >= params.min_amount1.into(),
        CustomError::InsufficientAmount.into()
    );

    // Update pool state
    pool.token0_reserve = checked_arithmetic(|| Some(pool.token0_reserve - amount0))?;
    pool.token1_reserve = checked_arithmetic(|| Some(pool.token1_reserve - amount1))?;
    pool.total_shares = checked_arithmetic(|| Some(pool.total_shares - params.shares))?;

    // Update user shares
    *user_shares = checked_arithmetic(|| Some(*user_shares - params.shares))?;
    if *user_shares == 0 {
        host.state_mut()
            .shares
            .remove(&(params.token_pair.clone(), sender));
    }

    // Transfer tokens back to user
    transfer_token(
        host,
        &params.token_pair.token0_address,
        &params.token_pair.token0_id,
        &Address::Contract(ctx.self_address()),
        &Receiver::from_account(sender),
        TokenAmountU64(amount0),
    )?;

    transfer_token(
        host,
        &params.token_pair.token1_address,
        &params.token_pair.token1_id,
        &Address::Contract(ctx.self_address()),
        &Receiver::from_account(sender),
        TokenAmountU64(amount1),
    )?;

    Ok(())
}

/// Helper function to calculate swap amount using constant product formula
fn calculate_amount_out(
    amount_in: TokenAmount,
    reserve_in: TokenAmount,
    reserve_out: TokenAmount,
) -> Result<TokenAmount, CustomError> {
    // Check for zero values
    ensure!(
        amount_in > 0 && reserve_in > 0 && reserve_out > 0,
        CustomError::InsufficientAmount
    );

    let amount_in_with_fee = checked_arithmetic(|| Some(amount_in * 997))?; // 0.3% fee
    let numerator = checked_arithmetic(|| Some(amount_in_with_fee * reserve_out))?;
    let denominator = checked_arithmetic(|| Some(reserve_in * 1000 + amount_in_with_fee))?;

    checked_arithmetic(|| Some(numerator / denominator))
}

#[receive(
    contract = "dex_contract",
    name = "swap",
    parameter = "SwapParams",
    error = "CustomError",
    mutable
)]
fn swap(ctx: &ReceiveContext, host: &mut Host<State>) -> ReceiveResult<()> {
    let params: SwapParams = ctx.parameter_cursor().get()?;
    let sender = match ctx.sender() {
        Address::Account(addr) => addr,
        _ => return Err(CustomError::ParseError.into()),
    };

    let (amount_out, is_token0) = {
        let pool = host
            .state_mut()
            .pools
            .get_mut(&params.token_pair)
            .ok_or(CustomError::PoolNotFound)?;

        // Calculate amount out
        let (reserve_in, reserve_out) = if params.is_token0 {
            (pool.token0_reserve, pool.token1_reserve)
        } else {
            (pool.token1_reserve, pool.token0_reserve)
        };

        let calculated_amount_out =
            calculate_amount_out(params.amount_in, reserve_in, reserve_out)?;
        ensure!(
            calculated_amount_out >= params.min_amount_out,
            CustomError::InsufficientAmount.into()
        );

        // Update reserves within this scope
        if params.is_token0 {
            pool.token0_reserve =
                checked_arithmetic(|| Some(pool.token0_reserve + params.amount_in))?;
            pool.token1_reserve =
                checked_arithmetic(|| Some(pool.token1_reserve - calculated_amount_out))?;
        } else {
            pool.token1_reserve =
                checked_arithmetic(|| Some(pool.token1_reserve + params.amount_in))?;
            pool.token0_reserve =
                checked_arithmetic(|| Some(pool.token0_reserve - calculated_amount_out))?;
        }

        // Return the amount out and whether token0 was used
        (calculated_amount_out, params.is_token0)
    };

    // Transfer tokens outside the mutable borrow of `pool`
    let (token_in_addr, token_in_id, token_out_addr, token_out_id) = if is_token0 {
        (
            &params.token_pair.token0_address,
            &params.token_pair.token0_id,
            &params.token_pair.token1_address,
            &params.token_pair.token1_id,
        )
    } else {
        (
            &params.token_pair.token1_address,
            &params.token_pair.token1_id,
            &params.token_pair.token0_address,
            &params.token_pair.token0_id,
        )
    };

    transfer_token(
        host,
        token_in_addr,
        token_in_id,
        &Address::Account(sender),
        &Receiver::Contract(
            ctx.self_address(),
            OwnedEntrypointName::new_unchecked("receive".to_string()),
        ),
        TokenAmountU64(params.amount_in),
    )?;

    transfer_token(
        host,
        token_out_addr,
        token_out_id,
        &Address::Contract(ctx.self_address()),
        &Receiver::from_account(sender),
        TokenAmountU64(amount_out),
    )?;

    Ok(())
}

#[receive(
    contract = "dex_contract",
    name = "getPool",
    parameter = "TokenPair",
    return_value = "Option<LiquidityPool>"
)]
fn get_pool(ctx: &ReceiveContext, host: &Host<State>) -> ReceiveResult<Option<LiquidityPool>> {
    let token_pair: TokenPair = ctx.parameter_cursor().get()?;
    Ok(host.state().pools.get(&token_pair).cloned())
}

#[receive(
    contract = "dex_contract",
    name = "getShares",
    parameter = "(TokenPair, AccountAddress)",
    return_value = "TokenAmount"
)]
fn get_shares(ctx: &ReceiveContext, host: &Host<State>) -> ReceiveResult<TokenAmount> {
    let params: (TokenPair, AccountAddress) = ctx.parameter_cursor().get()?;
    Ok(host.state().shares.get(&params).copied().unwrap_or(0))
}