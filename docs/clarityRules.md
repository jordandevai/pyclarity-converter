# Clarity Rules

A comprehensive guide to Clarity syntax, rules, and best practices for Stacks blockchain development. This document is based on official documentation and practical experience, aiming to be a complete reference for writing secure and efficient smart contracts.

## Table of Contents
1. [General Principles](#general-principles)
2. [Syntax and Functions](#syntax-and-functions)
3. [Data Types](#data-types)
4. [State Management](#state-management)
5. [Control Flow and Iteration](#control-flow-and-iteration)
6. [Error Handling](#error-handling)
7. [Buffer and String Operations](#buffer-and-string-operations)
8. [Advanced Features](#advanced-features)
9. [Security Best Practices](#security-best-practices)
10. [Performance Optimization](#performance-optimization)
11. [Contract Design Patterns](#contract-design-patterns)
12. [Testing and Deployment](#testing-and-deployment)
13. [Best Practices](#best-practices)
14. [Common Pitfalls](#common-pitfalls)
15. [Debugging Tips](#debugging-tips)
16. [Community and Resources](#community-and-resources)

---

## General Principles
- **Functional Language**: Clarity is interpreted and functional, with no side effects outside the contract. Execution is predictable and decidable.
- **Type Safety**: Strongly typed; all variables, parameters, and return types must be explicitly declared.
- **Fixed-Length Data**: No dynamic allocation—lists, buffers, and strings have maximum lengths defined at creation.
- **Public Readability**: Contracts are fully readable, and all functions are read-only unless explicitly defined otherwise.

---

## Syntax and Functions
- **Function Types**:
  - **`define-public`**: Callable externally, modifies state, returns `(response T E)` (e.g., `(ok value)` or `(err value)`).
  - **`define-private`**: Internal helpers, can return any type.
  - **`define-read-only`**: Pure functions for reading state or computation, no state changes.
  - **Note**: When defining function parameters with fixed-length types (e.g., `(string-ascii N)`, `(buff N)`, `(list N T)`), the length `N` must be a literal integer (e.g., `52`, `32`). Constants defined with `define-constant` cannot be used in type annotations.
  - Example:
    ```clarity
    (define-public (say-hello) (ok "Hello, Clarity!"))
    (define-private (add (x uint) (y uint)) (+ x y))
    (define-private (validate-input ((input (string-ascii 52)))) (ok true)) ;; Literal 52 required
    (define-read-only (get-sum) (add u1 u2))
    ```
- **No Lambdas**: Clarity lacks anonymous functions. Use named functions with `fold`, `map`, etc.
  - Incorrect: `(fold (lambda (x acc) (+ x acc)) lst u0)`
  - Correct:
    ```clarity
    (define-read-only (sum-step (x uint) (acc uint)) (+ x acc))
    (fold sum-step (list u1 u2 u3) u0)
    ```
- **Currying**: Pass additional parameters to `fold` or `map` via curried functions.
  - Example:
    ```clarity
    (define-read-only (check-char (i uint) (result (optional uint)) (char (buff 1)))
      (if (is-some result) result (if (is-eq char 0x31) (some i) none)))
    (fold (check-char 0x31) (list u0 u1 u2) none)
    ```

---

## Data Types
- **Primitives**:
  - `uint`: Unsigned integers (e.g., `u123`).
  - `int`: Signed integers (e.g., `123`).
  - `(buff N)`: Fixed-length buffers (e.g., `(buff 32)`), written as `0x010203`. Note: `N` must be a literal integer (e.g., `32`), not a constant defined with `define-constant`.
  - `(string-ascii N)`: ASCII strings (e.g., `"hello"`). Note: `N` must be a literal integer (e.g., `10`), not a constant.
  - `(string-utf8 N)`: UTF-8 strings. Note: `N` must be a literal integer, not a constant.
- **Compound Types**:
  - `(optional T)`: `some value` or `none`.
  - `(response T E)`: `(ok T)` or `(err E)` for public functions.
  - `(list N T)`: Fixed-length lists (e.g., `(list u1 u2 u3)`).
- **Principals**: Represent users (`tx-sender`) or contracts (`(as-contract tx-sender)`).
- **Constants**:
  - Defined with `define-constant`, immutable at deployment.
  - Example: `(define-constant MAX_VALUE u100)`

---

## State Management
- **`define-data-var`**: Mutable variables.
  - Example:
    ```clarity
    (define-data-var counter uint u0)
    (var-set counter u10)
    (var-get counter) ;; Returns u10
    ```
- **`define-map`**: Key-value stores.
  - Example:
    ```clarity
    (define-map balances principal uint)
    (map-insert balances tx-sender u100)
    (map-get? balances tx-sender) ;; Returns (some u100)
    ```
- **Persistence**: State persists across transactions; use constants for immutable values.

---

## Control Flow and Iteration
- **`fold`**: Reduces a sequence to a single value.
  - Example:
    ```clarity
    (define-read-only (sum-step (x uint) (acc uint)) (+ x acc))
    (fold sum-step (list u1 u2 u3) u0) ;; Returns u6
    ```
- **`map`**: Applies a function to each element.
  - Example:
    ```clarity
    (define-read-only (double (x uint)) (* x u2))
    (map double (list u1 u2 u3)) ;; Returns (list u2 u4 u6)
    ```
- **`filter`**: Filters based on a predicate.
  - Example:
    ```clarity
    (define-read-only (is-even (x uint)) (is-eq (mod x u2) u0))
    (filter is-even (list u1 u2 u3 u4)) ;; Returns (list u2 u4)
    ```
- **`if`**: Conditional with consistent return types.
  - Example: `(if (> x u0) u1 u0)`
- **`match`**: Handles optional/response types.
  - Example:
    ```clarity
    (match (map-get? balances tx-sender)
      value (ok value)
      (err u404))
    ```

---

## Error Handling
- **`asserts!`**: Halts execution if condition fails.
  - Example: `(asserts! (> x u0) (err u100))`
- **`unwrap` Variants**:
  - `unwrap!`: Returns value or specified error.
  - `unwrap-panic`: Returns value or panics.
  - Example: `(unwrap! (some u1) (err u101))`
- **Error Codes**: Use `uint` constants for clarity.
  - Example: `(define-constant ERR_NOT_FOUND u404)`

---

## Buffer and String Operations
- **Buffers**:
  - Fixed length: `(buff N)`.
  - Literals: `0x010203` (hexadecimal).
  - Operations:
    - `concat`: `(concat 0x01 0x02)` → `0x0102`.
    - `slice?`: `(slice? 0x010203 u1 u2)` → `(some 0x02)`.
    - `buff-to-uint-be`: Big-endian conversion (e.g., `(buff-to-uint-be 0x0001)` → `u1`).
    - `buff-to-int-le`: Little-endian conversion.
- **Strings**:
  - `(string-ascii N)` or `(string-utf8 N)`.
  - Operations: `concat`, `len`, `element-at?`.
  - Example: `(concat "hello" " world")` → `"hello world"`.

---

## Advanced Features
- **Traits**: Define reusable interfaces.
  - Example:
    ```clarity
    (define-trait token-trait
      ((transfer (uint principal principal) (response bool uint))))
    ```
- **Events**: Log data with `print`.
  - Example: `(print { event: "transfer", amount: u100 })`
- **Contract Calls**: Invoke other contracts.
  - Example:
    ```clarity
    (contract-call? .token transfer u100 tx-sender recipient)
    ```
- **Time**: Use `block-height` or `stx-liquid-supply` for logic.

---

## Security Best Practices
- **Input Validation**: Check all inputs.
  - Example: `(asserts! (> amount u0) (err u1))`
- **Access Control**: Restrict sensitive operations.
  - Example:
    ```clarity
    (define-constant OWNER tx-sender)
    (asserts! (is-eq tx-sender OWNER) (err u403))
    ```
- **Safe Math**: Built-in operations prevent overflow.
- **Reentrancy**: Avoid circular calls; Clarity prevents traditional reentrancy.

---

## Performance Optimization
- **Minimize Loops**: Limit `fold`, `map`, `filter`.
- **Constants**: Use `define-constant` for static values.
- **State Access**: Reduce `var-get`/`map-get?` calls.
- **Fixed Sizes**: Predefine list/buffer lengths.

---

## Contract Design Patterns
- **Modular Design**: Use traits for separation.
- **Upgrades**: Implement proxy patterns or traits.
  - Example:
    ```clarity
    (define-public (upgrade (new-contract principal))
      (asserts! (is-eq tx-sender OWNER) (err u403))
      (ok true))
    ```
- **Standards**: SIP-010 (tokens), SIP-009 (NFTs).

---

## Testing and Deployment
- **Clarinet**: Validate with `clarinet check`.
- **New Contracts**: Create new contracts using `clarinet contract new contract-name`.
- **Unit Tests**: Use Clarinet’s test suite.
- **Sandbox**: Test in Stacks Explorer (https://explorer.stacks.co/sandbox).
- **Deployment**: Use Clarinet or Stacks CLI for testnet/mainnet.

---

## Best Practices
- **Type Explicitness**: Define all types.
- **Fixed-Length**: Use `as-max-len?` for safety.
  - Example: `(as-max-len? (list u1 u2) u10)`
- **Error Handling**: Prefer `match` over `unwrap-panic`.
- **Validation**: Check Clarinet version (`clarinet --version`).
- **Constants and Type Annotations**: Use `define-constant` for runtime values (e.g., max lengths for validation) but specify literal integers in type annotations due to Clarity's restriction.
  - Example:
    ```clarity
    (define-constant MAX_INPUT_LENGTH u52)
    (define-private (validate-input ((input (string-ascii 52)))) ;; Literal 52 required
      (assertон (is-eq (len input) MAX_INPUT_LENGTH) (err u1))
      (ok true))
    ```
---

## Common Pitfalls
- **No Lambdas**: Use named functions.
- **List Syntax**: Use `u1`, not `1`, in lists when you expect it to be non-negative.
- **Type Consistency**: Match `if`/`match` branches.
- **Encoding**: Save files as UTF-8 without BOM.
- **Constants in Type Annotations**: Constants defined with `define-constant` cannot be used in type annotations for fixed-length types (e.g., `(string-ascii N)`, `(buff N)`). Use literal integers instead.
  - Incorrect: `(define-private (f ((x (string-ascii MAX_LENGTH)))) ...)`
  - Correct: `(define-private (f ((x (string-ascii 52)))) ...)`

---

## Debugging Tips
- **Clarinet**: Use `clarinet check` for errors.
- **Isolation**: Test functions standalone.
- **Logging**: Use `print` or temporary functions.
  - Example: `(define-read-only (debug) (ok some-value))`


---

## Community and Resources
- **Docs**: 
  - https://docs.stacks.co/clarity
  - https://docs.hiro.so/stacks/clarity
- **Clarinet**: https://github.com/hirosystems/clarinet
- **Explorer**: https://explorer.stacks.co/sandbox
- **Discord**: https://stacks.chat

*Last Updated: April 24, 2025*

