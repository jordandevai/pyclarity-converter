# PyClarity Syntax Guide

## Type System

### Fixed-Length Types
```python
# Clarity requires literal integers for fixed-length types
address: FixedString(52)    # Maps to (string-ascii 52)
buffer: FixedBuffer(32)     # Maps to (buff 32)
items: FixedList(10, int)   # Maps to (list 10 int)
```

### Response Types
All public functions must return a Response type:
```python
@public
def transfer(amount: uint) -> Response[bool, int]:
    return Response.ok(True)  # Maps to (ok true)
    # or
    return Response.err(1)    # Maps to (err u1)
```

### Function Types
```python
@public            # Maps to define-public
@readonly          # Maps to define-read-only
@private           # Maps to define-private
```

### Constants and Variables
```python
# Constants (define-constant)
MAX_SUPPLY: uint = 1000000

# Data Variables (define-data-var)
@data_var
current_count: int = 0

# Maps (define-map)
@map_type
balances: Dict[Principal, uint]
```

## Best Practices
1. Always use literal integers for fixed-length types
2. Public functions must return Response types
3. Use type hints for all parameters and return values
4. Use descriptive error codes from a central constants file