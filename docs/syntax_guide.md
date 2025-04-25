# PyClarity Syntax Guide

## Overview
PyClarity uses a strongly-typed Python syntax that maps directly to Clarity's semantics. This guide explains the key concepts and patterns.

## Imports and Types
```python
from clarity.types import (
    FixedString, 
    Response, 
    Principal, 
    public, 
    readonly, 
    private, 
    map_type
)
from clarity.constants import ERR_INVALID_INPUT

# Constants are defined in clarity/constants.py
MAX_SUPPLY: uint = 1000000
```

## Function Definitions
All functions must have explicit type annotations:

```python
@public
def transfer(sender: Principal, amount: uint) -> Response[bool, int]:
    """Transfer tokens between accounts.
    
    Args:
        sender: The sending account
        amount: Amount to transfer
    Returns:
        Response with success status or error code
    """
    if amount == 0:
        return Response.err(ERR_INVALID_INPUT)
    return Response.ok(True)

@readonly
def get_balance(owner: Principal) -> Response[uint, int]:
    """Get account balance."""
    return Response.ok(1000)

@private
def _validate_amount(amount: uint) -> bool:
    """Internal validation helper."""
    return amount > 0
```

## Fixed-Length Types
Clarity requires literal integers for fixed-length types:
```python
# Correct - using literals
address: FixedString(52)    # Maps to (string-ascii 52)
buffer: FixedBuffer(32)     # Maps to (buff 32)
items: FixedList(10, uint)  # Maps to (list 10 uint)

# Incorrect - using constants
MAX_LEN = 52
address: FixedString(MAX_LEN)  # Will not work in Clarity
```

## Maps and Data Variables
```python
@map_type
balances: Dict[Principal, uint]

@data_var
total_supply: uint = 0
```

## Response Types
All public and read-only functions must return a Response:
```python
def my_function() -> Response[T, E]:
    # Success case
    return Response.ok(value)
    
    # Error case
    return Response.err(error_code)
```

## Best Practices

1. **Type Safety**
   - Always use type hints
   - Use literal integers for fixed-length types
   - Return Response types from public functions

2. **Documentation**
   - Add docstrings to all public functions
   - Document parameters and return types
   - Include error conditions

3. **Error Handling**
   - Use constants for error codes
   - Return descriptive error messages
   - Validate inputs early

4. **Code Organization**
   - Group related functions together
   - Place constants in clarity/constants.py
   - Use meaningful variable names

## Examples

### Token Contract
```python
from clarity.types import FixedString, Response, Principal, public, readonly
from clarity.constants import (
    ERR_INVALID_AMOUNT,
    ERR_INSUFFICIENT_BALANCE
)

@map_type
balances: Dict[Principal, uint]

@public
def transfer(
    recipient: Principal, 
    amount: uint
) -> Response[bool, int]:
    """Transfer tokens to recipient.
    
    Args:
        recipient: Receiving account
        amount: Amount to transfer
    Returns:
        Response with success or error code
    """
    if amount == 0:
        return Response.err(ERR_INVALID_AMOUNT)
        
    sender_balance = balances[tx_sender]
    if sender_balance < amount:
        return Response.err(ERR_INSUFFICIENT_BALANCE)
        
    balances[tx_sender] = sender_balance - amount
    balances[recipient] += amount
    return Response.ok(True)
```
