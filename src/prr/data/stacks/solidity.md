# Solidity — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `*.sol`, `pragma solidity`, `contract `, `function `, `mapping(`, `emit `, `require(`, `msg.sender`, `hardhat`, `foundry`

---

## Security
- **[CRITICAL]** Reentrancy vulnerability — state updated after external call → attacker re-enters the function before state change completes and drains funds. Follow checks-effects-interactions pattern strictly and add OpenZeppelin's `ReentrancyGuard`.
- **[CRITICAL]** Integer overflow/underflow without SafeMath or Solidity 0.8+ built-in checked arithmetic → balances wrap around to unexpected values. Use Solidity ^0.8.0 (auto-checked) or `SafeMath` on older compilers; never use `unchecked` on user-supplied values.
- **[CRITICAL]** `tx.origin` used for authentication → a phishing contract called by the victim passes `tx.origin` check. Replace all `tx.origin` authentication with `msg.sender`.
- **[CRITICAL]** `delegatecall` to a user-controlled address → arbitrary code executed in the calling contract's storage context. Only `delegatecall` to audited, immutable addresses; never accept implementation addresses from users.
- **[HIGH]** Missing access control on sensitive functions → anyone can call `withdraw()`, `mint()`, or `pause()`. Add `onlyOwner`, role-based modifiers, or OpenZeppelin `AccessControl` to all privileged functions.
- **[HIGH]** Front-running on price-sensitive or commitment transactions → miner or bot sees pending tx and reorders. Use a commit-reveal scheme or on-chain VRF (Chainlink VRF) for randomness and auctions.
- **[HIGH]** Unchecked return value of low-level `.call()` → failed transfer silently ignored, contract state out of sync. Always check `(bool success, ) = addr.call{...}(...)` and `require(success)`.
- **[MEDIUM]** `block.timestamp` used for randomness or time-critical logic → miner can shift timestamp by ~15 seconds. Use block-based delays for time locks and Chainlink VRF for randomness.

---

## Performance
- **[HIGH]** Writing to storage inside loops → each SSTORE costs 20,000 gas; loop body multiplies this. Read storage into memory variables before the loop, operate in memory, write back once after.
- **[HIGH]** Unbounded array iteration → gas cost grows with array length, eventually hitting block gas limit (DoS). Cap iteration with a max count or paginate using offset/limit patterns.
- **[HIGH]** Storing large data on-chain → SSTORE is 20,000 gas per 32 bytes; 1 KB costs ~640,000 gas. Store data off-chain (IPFS/Arweave) and commit only the content hash on-chain.
- **[MEDIUM]** Struct variables not packed into 32-byte slots → each unoptimized slot wastes gas on reads and writes. Order struct fields from largest to smallest type so adjacent small types share a slot.
- **[MEDIUM]** `public` state variables generating automatic getters when manual getters duplicate the same logic → dead code and increased bytecode size. Remove manual getters that replicate the auto-generated one.
- **[MEDIUM]** Not using `calldata` for read-only function parameters → `memory` copy costs extra gas. Declare external function array and string parameters as `calldata`.

---

## Architecture
- **[HIGH]** Upgradability not planned before deployment → bugs in production contract are permanent. Use OpenZeppelin's Upgradeable proxy pattern (UUPS or Transparent) if post-deployment fixes are expected.
- **[HIGH]** Reinventing standard patterns instead of using OpenZeppelin's audited contracts → subtle security bugs. Inherit from `ERC20`, `ERC721`, `Ownable`, `AccessControl`, `ReentrancyGuard` rather than reimplementing.
- **[MEDIUM]** Single monolithic contract for unrelated responsibilities → harder to audit, test, and upgrade. Separate token logic, governance, and treasury into distinct contracts with clear interfaces.
- **[MEDIUM]** Events not emitted for all important state changes → off-chain indexers (The Graph, explorers) cannot track contract activity. Emit an event in every function that mutates significant state.
- **[LOW]** Public/external functions lack NatSpec (`@notice`, `@param`, `@return`) → ABI documentation absent from etherscan and tooling. Add NatSpec to all user-facing functions.

---

## Code Quality
- **[HIGH]** Magic numbers in `require` conditions and arithmetic → intent unclear and values duplicated across the codebase. Define named `constant` or `immutable` variables at the contract level.
- **[HIGH]** Checks-Effects-Interactions (CEI) pattern not followed → reentrancy window between external call and state update. Reorder so all checks come first, state updates second, and external calls last.
- **[MEDIUM]** Events missing for all state-changing functions → incomplete audit trail. Add a corresponding `event` and `emit` to every function that modifies storage.
- **[MEDIUM]** Constructor not validating input parameters → zero-address, zero-amount, or out-of-range values accepted silently at deploy time. Add `require` checks in the constructor for all critical parameters.
- **[LOW]** `public` visibility on functions only called externally → `external` is slightly cheaper for calldata parameters. Use `external` for all functions not called internally.

---

## Common Bugs & Pitfalls
- **[CRITICAL]** Reentrancy in `withdraw()` pattern without `ReentrancyGuard` → classic DAO-style drain attack. Apply `nonReentrant` modifier from OpenZeppelin and follow CEI pattern.
- **[HIGH]** `selfdestruct` leaving references in other contracts that assume it still exists → calls to destroyed contract return success with empty data. Avoid `selfdestruct`; design deactivation via a pause flag instead.
- **[HIGH]** ERC20 `approve()` front-running race condition → spender can use old and new allowance if owner changes it. Use `increaseAllowance`/`decreaseAllowance` or the EIP-2612 `permit` pattern.
- **[MEDIUM]** `delete array[i]` on a dynamic storage array leaves a zero gap, shifting indices → iteration over the array skips or misprocesses elements. Use swap-and-pop (`arr[i] = arr[arr.length - 1]; arr.pop()`) for unordered arrays.
- **[MEDIUM]** Floating pragma `^0.8.0` compiled with different patch versions across environments → non-deterministic bytecode and potential behaviour differences. Pin to an exact version (e.g., `pragma solidity 0.8.24`) in production contracts.
