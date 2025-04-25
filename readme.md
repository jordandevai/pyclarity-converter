# PyClarity Converter

Welcome to **PyClarity Converter**, a free, open-source tool that makes writing smart contracts for the [Stacks blockchain](https://stacks.co) easier and more approachable! 😊 With PyClarity, you can write smart contracts in a familiar Python-like syntax and instantly convert them to [Clarity](https://docs.stacks.co/clarity), Stacks' native smart contract language. Whether you're new to Stacks or a seasoned developer, this tool is built for the community to simplify Clarity development and spark creativity in the Stacks ecosystem.

This project is free for anyone to use, modify, or contribute to under the [MIT License](#license). We’re excited to see how you use it to build awesome things on Stacks! 🚀

## Table of Contents
- [What is PyClarity Converter?](#what-is-pyclarity-converter)
- [Quick Start](#quick-start)
- [Why Use PyClarity?](#why-use-pyclarity)
- [Features](#features)
- [Usage](#usage)
- [Contributing](#contributing)
- [Development Setup](#development-setup)
- [Roadmap](#roadmap)
- [Resources](#resources)
- [License](#license)

## What is PyClarity Converter?

PyClarity Converter is a browser-based tool that lets you write Stacks smart contracts in a Python-like syntax, which is then transpiled into valid Clarity code. Clarity’s Lisp-like syntax and strict type system can be challenging, so PyClarity bridges the gap by offering:

- A familiar, readable Python-like syntax for writing contracts.
- Real-time conversion to Clarity with instant feedback.
- Support for Clarity’s security and type safety.
- An intuitive interface with syntax highlighting and error handling.

This tool is designed for the Stacks community—whether you’re building tokens, NFTs, or Bitcoin L2 apps, PyClarity aims to make your development process faster and more enjoyable.

## Quick Start

Get started with PyClarity in just a few steps:

1. **Visit the Tool**: Open [PyClarity Converter](https://your-hosted-url.com) in your browser (or run it locally, see [Development Setup](#development-setup)).
2. **Write Python-like Code**: Use the left editor to write your contract. Try this example:
   ```python
   ERR_INVALID_INPUT = 100

   @public
   def validate_address(input: FixedString(52)) -> Response[bool, int]:
       """Validate a Stacks address format."""
       if len(input) != 52:
           return Response.err(ERR_INVALID_INPUT)
       return Response.ok(True)
   ```
3. **See Clarity Output**: The right editor shows the converted Clarity code instantly:
   ```clarity
   (define-constant ERR_INVALID_INPUT u100)

   (define-public (validate-address (input (string-ascii 52)))
     ;; Validate a Stacks address format.
     (if (is-eq (len input) u52)
       (ok true)
       (err ERR_INVALID_INPUT)))
   ```
4. **Explore Features**: Toggle dark mode, load sample code, or check the error console for feedback.

That’s it! You’re ready to start writing Stacks contracts with PyClarity. See [Usage](#usage) for more examples and tips.

## Why Use PyClarity?

Clarity’s unique syntax and type system are powerful but can feel unfamiliar. PyClarity makes Clarity development more accessible by:

- **Simplifying Syntax**: Write in a Python-like style that’s concise and intuitive, then let PyClarity handle the conversion to Clarity’s Lisp-like format.
- **Boosting Productivity**: Get real-time feedback, syntax highlighting, and error messages to catch issues early.
- **Supporting Stacks Developers**: Tailored for Stacks developers, with features aligned to common use cases.
- **Community-Driven**: Free and open-source, built for and by the Stacks community to encourage collaboration and innovation.

Whether you’re a Python developer new to Stacks or a Clarity expert looking to streamline your workflow, PyClarity is here to help.

## Features

PyClarity Converter comes with a growing set of features to make Clarity development smoother:

- **Python-like Syntax**: Write contracts in a familiar syntax that maps directly to Clarity.
- **Real-Time Conversion**: See Clarity output as you type, with instant error feedback.
- **Syntax Highlighting**: Custom highlighting for both Python input and Clarity output.
- **Error Handling**: Clear, actionable error messages for parsing and validation issues.
- **Sample Code**: Load prebuilt examples (e.g., address validation, token contracts) to jumpstart your project.
- **Theme Support**: Toggle between light and dark modes for comfortable coding.
- **Type Support**: Handles Clarity-specific types like `FixedString`, `Response`, and `Principal`.

Check out the [Roadmap](#roadmap) for what’s coming next, like Clarinet integration and AI-assisted code suggestions!

## Usage

### Writing Python-like Code
Use the left editor to write your contract in PyClarity’s Python-like syntax. Here’s an example with a map and a function:

```python
from clarity.types import FixedString, Response, Principal, public, map_type

ERR_INVALID_INPUT = 100

@map_type
balances: Dict[Principal, uint]  # User balances map

@public
def validate_and_convert(address: FixedString(52)) -> Response[FixedString(41), int]:
    """Validates a base58 address and converts it."""
    if len(address) != 52:
        return Response.err(ERR_INVALID_INPUT)
    return Response.ok("ST123...")
```

### Viewing Clarity Output
The right editor shows the transpiled Clarity code in real-time:

```clarity
(define-constant ERR_INVALID_INPUT u100)

(define-map balances principal uint)

(define-public (validate-and-convert (address (string-ascii 52)))
  ;; Validates a base58 address and converts it.
  (if (is-eq (len address) u52)
    (ok "ST123...")
    (err ERR_INVALID_INPUT)))
```

### Tips for Writing PyClarity Code
- **Use Type Hints**: Always specify types for function parameters and return values (e.g., `FixedString(52)`, `Response[bool, int]`).
- **Add Docstrings**: Docstrings are converted to Clarity comments if the “Include Comments” option is enabled.
- **Check Errors**: The bottom panel shows parsing or validation errors to help debug your code.
- **Load Samples**: Click the “Sample” button to explore prebuilt examples.

For a full syntax guide, see [guide coming soon]).

## Contributing

PyClarity is a community project, and we’d love for you to join us! Whether you’re fixing a bug, adding a feature, or improving the docs, every contribution matters. 

See [Development Setup](#development-setup) for how to run the project locally.

## Development Setup

Want to hack on PyClarity? Here’s how to set up the project locally:

1. **Clone the Repo**:
   ```bash
   git clone https://github.com/your-repo/pyclarity-converter.git
   cd pyclarity-converter
   ```

2. **Install Dependencies**:
   Ensure you have [Node.js](https://nodejs.org) installed, then run:
   ```bash
   npm install
   ```

3. **Run the App**:
   Start the development server with:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` (or the port shown) in your browser.

4. **Build for Production**:
   ```bash
   npm run build
   ```

### Tech Stack
- **Frontend**: JavaScript, CodeMirror (for editors), Bootstrap (for UI).
- **Parser/Transpiler**: Chevrotain for lexing/parsing, custom transpiler for Python-to-Clarity conversion.
- **Build Tool**: Vite for fast development and bundling.

### Contributing Guidelines
- **Code Style**: Use ESLint for JavaScript linting (run `npm run lint` to check).
- **Testing**: Tests are planned with Jest (coming soon). For now, manually test changes in the browser.
- **Commits**: Write clear commit messages (e.g., `Add support for map types in parser`).
- **Pull Requests**: Include a description of what you changed and why.


## Roadmap

We’re excited about the future of PyClarity! Here are some planned features (check the GitHub issues for the latest priorities):

- **Syntax Enhancements**: Support more Clarity features 
- **Clarinet Integration**: Validate Clarity output using Clarinet via WebAssembly.
- **Code Templates**: Add prebuilt templates for common contract patterns (e.g., tokens, NFTs).
- **UI Improvements**: Add responsive design, customizable themes, and split-screen views.
- **AI Assistance**: Integrate code suggestions using models like Grok (from xAI).
- **Community Gallery**: Share and explore sample contracts in a public gallery.

Want to help make these happen? Pick an idea and open a PR! 🎉

## Resources

New to Stacks or Clarity? These resources will help you dive in:
- [Stacks Documentation](https://docs.stacks.co): Learn about the Stacks blockchain.
- [Clarity Reference](https://docs.hiro.so/stacks/clarity): Official Clarity language guide.
- [Clarinet](https://github.com/hirosystems/clarinet): Tool for testing and deploying Clarity contracts.
- [Stacks Explorer](https://explorer.stacks.co): Test contracts in the sandbox.
- [Stacks Community](https://stacks.chat): Join the Discord to connect with developers.

## License

PyClarity Converter is licensed under the [MIT License](LICENSE). You’re free to:
- ✅ Use it for any purpose (personal, commercial, or otherwise).
- ✅ Modify and distribute it.
- ✅ Share it with the community.

Just include the original copyright and license notice in any copies. Let’s keep the open-source spirit alive! 🙌

*Last Updated: April 25, 2025* 