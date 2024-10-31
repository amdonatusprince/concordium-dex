#![cfg_attr(not(feature = "std"), no_std)]

use concordium_std::*;
use core::fmt::Debug;
use concordium_cis2::*;

/// Token amount type
type TokenAmount = u64;
/// Contract token ID type
type ContractTokenId = TokenIdU8;

/// Represents a token pair in the DEX
#[derive(Serialize, SchemaType, Clone, Debug)]
pub struct TokenPair {
    token0_address: ContractAddress,
    token1_address: ContractAddress,
    token0_id: ContractTokenId,
    token1_id: ContractTokenId,
}

/// Represents a liquidity pool for a token pair
#[derive(Serialize, SchemaType)]
pub struct LiquidityPool {
    token0_reserve: TokenAmount,
    token1_reserve: TokenAmount,
    total_shares: TokenAmount,
}

/// Main contract state
#[derive(Serialize, SchemaType)]
pub struct State {
    /// Maps token pair to their liquidity pool
    pools: collections::BTreeMap<TokenPair, LiquidityPool>,
    /// Maps address to their liquidity shares for each pool
    shares: collections::BTreeMap<(TokenPair, AccountAddress), TokenAmount>,
}

/// Contract errors
#[derive(Debug, PartialEq, Eq, Reject, Serialize, SchemaType)]
pub enum Error {
    #[from(ParseError)]
    ParseParams,
    InsufficientLiquidity,
    PoolNotFound,
    InvalidTokenPair,
    InsufficientAmount,
    Cis2Error(Cis2Error),
    InsufficientShares,
    TransferError,
    UnauthorizedToken,
    FailedTokenTransfer,
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

/// Creates a new instance of the smart contract.
#[init(contract = "dex_contract")]
fn init(_ctx: &InitContext, state_builder: &mut StateBuilder) -> InitResult<State> {
    // Initialize empty state
    Ok(State {
        pools: state_builder.new_map(),
        shares: state_builder.new_map(),
    })
}

/// Receive function. The input parameter in this function is the boolean variable `return_error`.
///  If `return_error == true`, the receive function will return a custom error.
///  If `return_error == false`, the receive function executes successfully.
#[receive(
    contract = "dex_contract",
    name = "receive",
    // You can use any other type than bool here, bool is used here only as an example.
    parameter = "bool",
    error = "Error",
    mutable
)]
fn receive(ctx: &ReceiveContext, _host: &mut Host<State>) -> Result<(), Error> {
    // Parse input and apply any other logic relevant for this function of the smart contract.
    // You can mutate the smart contract state here via host.state_mut(), since the receive attribute has the mutable flag.
    // You can return any of your custom error variants from above.

    // Returns ParseError on failure.
    let return_error = ctx.parameter_cursor().get()?;
    if return_error {
        Err(Error::CustomError)
    } else {
        Ok(())
    }
}

/// Returns the state of the smart contract.
#[receive(contract = "dex_contract", name = "view", return_value = "State")]
fn view<'a>(_ctx: &ReceiveContext, host: &'a Host<State>) -> ReceiveResult<&'a State> {
    Ok(host.state())
}

/// Helper function to transfer CIS-2 tokens
fn transfer_token(
    host: &mut Host<State>,
    token_address: ContractAddress,
    token_id: ContractTokenId,
    from: Address,
    to: Address,
    amount: TokenAmount,
) -> Result<(), Error> {
    let parameter = TransferParams::from(vec![Transfer {
        from,
        to,
        token_id,
        amount: concordium_cis2::Amount::from(amount),
        data: AdditionalData::empty(),
    }]);

    host.invoke_contract(
        &token_address,
        &parameter,
        EntrypointName::new("transfer").unwrap(),
        Amount::zero(),
    ).map_err(|_| Error::TransferError)?;

    Ok(())
}

#[receive(
    contract = "dex_contract",
    name = "addLiquidity",
    parameter = "AddLiquidityParams",
    error = "Error",
    mutable
)]
fn add_liquidity(ctx: &ReceiveContext, host: &mut Host<State>) -> Result<(), Error> {
    let params: AddLiquidityParams = ctx.parameter_cursor().get()?;
    let sender = ctx.sender();
    
    // Transfer tokens from sender to contract
    transfer_token(
        host,
        params.token_pair.token0_address,
        params.token_pair.token0_id,
        sender,
        Address::Contract(ctx.self_address()),
        params.amount0,
    )?;

    transfer_token(
        host,
        params.token_pair.token1_address,
        params.token_pair.token1_id,
        sender,
        Address::Contract(ctx.self_address()),
        params.amount1,
    )?;

    let pool = host.state_mut().pools
        .entry(params.token_pair.clone())
        .or_insert(LiquidityPool {
            token0_reserve: 0,
            token1_reserve: 0,
            total_shares: 0,
        });

    // Calculate shares
    let shares = if pool.total_shares == 0 {
        // Initial liquidity
        (params.amount0 * params.amount1).sqrt()
    } else {
        // Subsequent liquidity
        std::cmp::min(
            params.amount0 * pool.total_shares / pool.token0_reserve,
            params.amount1 * pool.total_shares / pool.token1_reserve,
        )
    };

    ensure!(shares >= params.min_liquidity, Error::InsufficientLiquidity);

    // Update pool reserves
    pool.token0_reserve += params.amount0;
    pool.token1_reserve += params.amount1;
    pool.total_shares += shares;

    // Update user shares
    let sender_address = match sender {
        Address::Account(addr) => addr,
        _ => return Err(Error::ParseParams),
    };
    
    host.state_mut().shares
        .entry((params.token_pair, sender_address))
        .and_modify(|e| *e += shares)
        .or_insert(shares);

    Ok(())
}

#[receive(
    contract = "dex_contract",
    name = "removeLiquidity",
    parameter = "RemoveLiquidityParams",
    error = "Error",
    mutable
)]
fn remove_liquidity(ctx: &ReceiveContext, host: &mut Host<State>) -> Result<(), Error> {
    let params: RemoveLiquidityParams = ctx.parameter_cursor().get()?;
    let sender = match ctx.sender() {
        Address::Account(addr) => addr,
        _ => return Err(Error::ParseParams),
    };

    // Get pool and verify it exists
    let pool = host.state_mut().pools
        .get_mut(&params.token_pair)
        .ok_or(Error::PoolNotFound)?;

    // Get user's shares
    let user_shares = host.state_mut().shares
        .get_mut(&(params.token_pair.clone(), sender))
        .ok_or(Error::InsufficientShares)?;

    ensure!(*user_shares >= params.shares, Error::InsufficientShares);

    // Calculate token amounts to return
    let amount0 = (params.shares * pool.token0_reserve) / pool.total_shares;
    let amount1 = (params.shares * pool.token1_reserve) / pool.total_shares;

    // Verify minimum amounts
    ensure!(amount0 >= params.min_amount0, Error::InsufficientAmount);
    ensure!(amount1 >= params.min_amount1, Error::InsufficientAmount);

    // Update pool state
    pool.token0_reserve -= amount0;
    pool.token1_reserve -= amount1;
    pool.total_shares -= params.shares;

    // Update user shares
    *user_shares -= params.shares;
    if *user_shares == 0 {
        host.state_mut().shares.remove(&(params.token_pair.clone(), sender));
    }

    // Transfer tokens back to user
    transfer_token(
        host,
        params.token_pair.token0_address,
        params.token_pair.token0_id,
        Address::Contract(ctx.self_address()),
        Address::Account(sender),
        amount0,
    )?;

    transfer_token(
        host,
        params.token_pair.token1_address,
        params.token_pair.token1_id,
        Address::Contract(ctx.self_address()),
        Address::Account(sender),
        amount1,
    )?;

    Ok(())
}

#[receive(
    contract = "dex_contract",
    name = "swap",
    parameter = "SwapParams",
    error = "Error",
    mutable
)]
fn swap(ctx: &ReceiveContext, host: &mut Host<State>) -> Result<(), Error> {
    let params: SwapParams = ctx.parameter_cursor().get()?;
    let sender = ctx.sender();
    
    let pool = host.state_mut().pools
        .get_mut(&params.token_pair)
        .ok_or(Error::PoolNotFound)?;

    // Calculate amount out
    let (reserve_in, reserve_out) = if params.is_token0 {
        (pool.token0_reserve, pool.token1_reserve)
    } else {
        (pool.token1_reserve, pool.token0_reserve)
    };

    let amount_out = calculate_amount_out(params.amount_in, reserve_in, reserve_out);
    ensure!(amount_out >= params.min_amount_out, Error::InsufficientAmount);

    // Transfer input token from sender to contract
    let (token_in_addr, token_in_id, token_out_addr, token_out_id) = if params.is_token0 {
        (
            params.token_pair.token0_address,
            params.token_pair.token0_id,
            params.token_pair.token1_address,
            params.token_pair.token1_id,
        )
    } else {
        (
            params.token_pair.token1_address,
            params.token_pair.token1_id,
            params.token_pair.token0_address,
            params.token_pair.token0_id,
        )
    };

    // Transfer tokens
    transfer_token(
        host,
        token_in_addr,
        token_in_id,
        sender,
        Address::Contract(ctx.self_address()),
        params.amount_in,
    )?;

    transfer_token(
        host,
        token_out_addr,
        token_out_id,
        Address::Contract(ctx.self_address()),
        sender,
        amount_out,
    )?;

    // Update reserves
    if params.is_token0 {
        pool.token0_reserve += params.amount_in;
        pool.token1_reserve -= amount_out;
    } else {
        pool.token1_reserve += params.amount_in;
        pool.token0_reserve -= amount_out;
    }

    Ok(())
}

/// Helper function to calculate swap amount using constant product formula
fn calculate_amount_out(amount_in: TokenAmount, reserve_in: TokenAmount, reserve_out: TokenAmount) -> TokenAmount {
    let amount_in_with_fee = amount_in * 997; // 0.3% fee
    let numerator = amount_in_with_fee * reserve_out;
    let denominator = reserve_in * 1000 + amount_in_with_fee;
    numerator / denominator
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
