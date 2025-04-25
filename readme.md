# PyClarity Converter

**PyClarity Converter** is a browser-based tool that simplifies writing smart contracts for the Stacks blockchain by allowing developers to write in a Python-like syntax and automatically convert it to Clarity, Stacks' native smart contract language. With a world-class UI/UX, real-time conversion, and powerful features, PyClarity Converter aims to make Clarity development intuitive, efficient, and accessible for blockchain developers, especially those working with Bitcoin Layer 2 solutions like Stacks.

## Table of Contents
- [Project Goals](#project-goals)
- [Current State](#current-state)
- [Future State](#future-state)
- [Features](#features)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Contributing](#contributing)
- [Best Practices](#best-practices)
- [Roadmap](#roadmap)
- [Resources](#resources)
- [License](#license)

## Project Goals
PyClarity Converter is designed to transform the experience of writing Clarity smart contracts by addressing the challenges of Clarity's Lisp-like syntax (e.g., heavy parentheses, prefix notation) and its strict type system. Our goals are:

- **Simplify Development**: Enable developers to write Clarity contracts using a familiar, Python-like syntax that is concise and readable.
- **World-Class UI/UX**: Provide an elegant, intuitive interface with real-time feedback, syntax highlighting, and error handling to enhance productivity.
- **Maximize Productivity**: Offer features like sample code templates, validation, and documentation integration to reduce the learning curve and prevent errors.
- **Support Stacks Ecosystem**: Tailor the tool for Stacks developers, with features aligned to common use cases (e.g., SIP-010 tokens, Bitcoin L2 integrations).
- **Open-Source Excellence**: Follow best practices for maintainability, extensibility, and community contributions.

## Current State
As of our latest update, PyClarity Converter now supports:

- **Enhanced Type System**:
  - Proper fixed-length type handling with literals
  - Full Response type support
  - Map and data variable decorators
  - Principal and other Clarity-specific types

- **Improved Function Definitions**:
  - `@public`, `@readonly`, and `@private` decorators
  - Mandatory type hints
  - Docstring support that converts to Clarity comments

- **Better Error Handling**:
  - Structured Response types
  - Centralized error codes
  - Type validation

Example usage:
```python
from clarity.types import FixedString, Response, public

@public
def validate_address(input: FixedString(52)) -> Response[bool, int]:
    """Validate a Stacks address format."""
    if len(input) != 52:
        return Response.err(ERR_INVALID_INPUT)
    return Response.ok(True)
```

## Future State
We aim to evolve PyClarity Converter into the go-to tool for Stacks developers, with a focus on:

- **Enhanced Syntax Support**:
  - Full Clarity feature set: `define-data-var`, `fold`, `map`, `filter`, `contract-call?`, traits, events (`print`).
  - Support for Stacks standards (e.g., SIP-010 for tokens, SIP-009 for NFTs).
- **Advanced Features**:
  - **Clarinet Integration**: Validate Clarity code using Clarinet (via WebAssembly) for syntax and semantic checks.
  - **Code Templates**: Prebuilt Python-like templates for common contract patterns (e.g., token contracts, escrow).
  - **Documentation Tooltips**: Hover over Python constructs to see corresponding Clarity docs or examples.
  - **Auto-Formatting**: Format Clarity output with consistent indentation and alignment.
  - **Save/Export**: Download Clarity code as `.clar` files or share via URL.
  - **Interactive Debugger**: Step through Python-to-Clarity conversion to troubleshoot errors.
- **UI/UX Improvements**:
  - Responsive design for mobile and tablet support.
  - Customizable editor themes and fonts.
  - Split-screen or tabbed views for multiple contracts.
  - Undo/redo history with version control.
- **Performance**:
  - Optimize parsing and transpilation for large contracts using Web Workers.
  - Cache parsed ASTs for incremental updates.
- **Community Features**:
  - Publish sample contracts to a community gallery.
  - Integrate with Stacks Explorer for contract deployment testing.
  - Support for collaborative editing via WebSockets.

## Features
PyClarity Converter is designed to simplify Clarity development with these key features:

- **Python-like Syntax**: Write contracts in a familiar, concise syntax that maps directly to Clarity.
- **Real-Time Conversion**: See Clarity output instantly as you type, with immediate error feedback.
- **Syntax Highlighting**: Custom highlighting for Python input and Clarity output, enhancing readability.
- **Error Handling**: Clear, actionable error messages for parsing, transpilation, and validation issues.
- **Sample Code**: Load prebuilt examples to jumpstart development (e.g., address conversion, token contracts).
- **Theme Switcher**: Toggle between light and dark modes for comfortable coding.
- **Validation**: Basic checks for Clarity syntax (e.g., balanced parentheses), with plans for full Clarinet integration.
- **Extensibility**: Modular parser and transpiler design to support new Clarity features easily.

Future features will include:
- **AI Assistance**: Suggest code completions or optimizations using AI models like Grok.
- **Testing Integration**: Run Clarinet unit tests directly in the browser.
- **Stacks Wallet Integration**: Connect to Stacks wallets for contract deployment.
- **Localization**: Support multiple languages for global accessibility.

## Getting Started

1. Import required types:
```python
from clarity.types import (
    FixedString, 
    Response, 
    Principal, 
    public
)
```

2. Define your contract using Python-like syntax with proper type annotations
3. Use the converter to generate Clarity code

See the [Syntax Guide](docs/syntax_guide.md) for detailed documentation.

## Usage

### Write Python-like Code:
Use the left editor to write code in the supported Python-like syntax.

Example:
```python
MAX_INPUT_LENGTH = 52
ERR_INVALID_INPUT = 100

map balances: {principal: int}

def validate_base58_input(input: str[52]) -> bool:
    assert len(input) == MAX_INPUT_LENGTH, ERR_INVALID_INPUT
    return True
```

### View Clarity Output:
The right editor displays the converted Clarity code in real-time.

Example output:
```clarity
(define-constant MAX_INPUT_LENGTH u52)
(define-constant ERR_INVALID_INPUT u100)

(define-map balances principal int)

(define-private (validate-base58-input (input (string-ascii 52)))
  (asserts! (is-eq (len input) MAX_INPUT_LENGTH) (err ERR_INVALID_INPUT))
  (ok true))
```

### Interact with Features:
- Click **Load Sample** to populate the editor with example code.
- Toggle **Dark Mode** for a different theme.
- Check the error console for feedback on conversion success or issues.

## Contributing
We welcome contributions to make PyClarity Converter better! To contribute:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit changes (`git commit -m "Add your feature"`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a pull request with a clear description.

Please follow our [Best Practices](#best-practices) and include tests for new features.

## Best Practices
To ensure a high-quality codebase and user experience, we adhere to these practices:

### Code Quality:
- Use ESLint for JavaScript linting.
- Write modular, well-documented code with clear function names.
- Test parser and transpiler changes with unit tests (planned for Jest integration).

### UI/UX:
- Follow Bootstrap's accessibility guidelines (e.g., ARIA attributes).
- Ensure responsive design for all screen sizes.
- Provide immediate feedback for user actions (e.g., errors, success messages).

### Clarity Development:
- Align with Clarity's type system and functional paradigm.
- Validate output against Clarinet's syntax checker.
- Support Stacks' standards (e.g., SIP-010, SIP-009).

### Documentation:
- Keep this README updated with new features and instructions.
- Add inline comments in code for complex logic.
- Provide user-facing docs for supported Python-like syntax.

## Roadmap

### Short-Term (1-2 months):
- Support additional Clarity constructs (fold, map-get?, contract-call?).
- Integrate Clarinet via WebAssembly for full validation.
- Add code templates for common Stacks contracts.
- Implement save/export functionality.

### Medium-Term (3-6 months):
- Add AI-powered code suggestions and error correction.
- Support interactive debugging and testing.
- Enhance UI with customizable themes and split-screen views.

### Long-Term (6-12 months):
- Integrate with Stacks Wallet and Explorer for deployment.
- Build a community gallery for shared contracts.
- Support collaborative editing and localization.

## Resources
- Stacks Documentation: [docs.stacks.co](https://docs.stacks.co)
- Clarity Reference: [docs.hiro.so/stacks/clarity](https://docs.hiro.so/stacks/clarity)
- Clarinet: [github.com/hirosystems/clarinet](https://github.com/hirosystems/clarinet)
- Stacks Explorer: [explorer.stacks.co](https://explorer.stacks.co)
- Community: [stacks.chat](https://stacks.chat)

## License
This project is licensed under the MIT License. See the LICENSE file for details.

Last Updated: April 25, 2023
