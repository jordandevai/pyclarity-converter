import { lexer, ClarityParser } from './parser.js';
import { transpile } from './transpiler.js';
import './styles.css';

document.addEventListener('DOMContentLoaded', () => {
  // Define custom Clarity mode
  CodeMirror.defineMode('clarity', function() {
    return {
      token: function(stream) {
        if (stream.match(/define-(public|private|constant|read-only|map)/)) return 'keyword';
        if (stream.match(/ok|err|response|string-ascii|bool|int|uint|buff|asserts!/)) return 'type';
        if (stream.match(/[a-zA-Z_][\w-]*/)) return 'variable';
        if (stream.match(/[u]?[0-9]+/)) return 'number';
        if (stream.match(/".*"/)) return 'string';
        if (stream.match(/[()]/)) return 'bracket';
        stream.next();
        return null;
      }
    };
  });

  // Initialize Python editor
  const pythonEditor = CodeMirror.fromTextArea(document.getElementById('pythonEditor'), {
    mode: 'python',
    lineNumbers: true,
    theme: 'default',
    viewportMargin: Infinity
  });

  // Initialize Clarity editor (read-only)
  const clarityEditor = CodeMirror.fromTextArea(document.getElementById('clarityEditor'), {
    mode: 'clarity',
    lineNumbers: true,
    theme: 'default',
    readOnly: true,
    viewportMargin: Infinity
  });

  // Simple Clarity syntax validator
  function validateClarity(code) {
    let parenCount = 0;
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      parenCount += (line.match(/\(/g) || []).length;
      parenCount -= (line.match(/\)/g) || []).length;
      if (parenCount < 0) {
        return `Syntax error: Unmatched closing parenthesis at line ${i + 1}`;
      }
    }
    if (parenCount !== 0) {
      return `Syntax error: Unmatched parentheses (count: ${parenCount})`;
    }
    return null;
  }

  // Conversion function
  function convert() {
    const pythonCode = pythonEditor.getValue();
    try {
      const lexResult = lexer.tokenize(pythonCode);
      if (lexResult.errors.length > 0) {
        throw new Error(`Lexing errors: ${lexResult.errors.map(e => e.message).join('; ')}`);
      }

      const parser = new ClarityParser();
      parser.input = lexResult.tokens;
      const cst = parser.program();
      if (parser.errors.length > 0) {
        throw new Error(`Parsing errors: ${parser.errors.map(e => e.message).join('; ')}`);
      }

      const clarityCode = transpile(cst);
      const validationError = validateClarity(clarityCode);
      if (validationError) {
        throw new Error(validationError);
      }

      clarityEditor.setValue(clarityCode);
      document.getElementById('errorConsole').innerText = 'Conversion successful';
      document.getElementById('errorConsole').className = 'mt-3 text-success';
    } catch (e) {
      document.getElementById('errorConsole').innerText = `Error: ${e.message}`;
      document.getElementById('errorConsole').className = 'mt-3 text-danger';
      clarityEditor.setValue('');
    }
  }

  // Convert button handler
  document.getElementById('convertBtn').addEventListener('click', convert);

  // Real-time conversion
  pythonEditor.on('change', () => {
    convert();
  });

  // Theme switcher
  document.getElementById('themeBtn').addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const theme = document.body.classList.contains('dark') ? 'monokai' : 'default';
    pythonEditor.setOption('theme', theme);
    clarityEditor.setOption('theme', theme);
  });

  // Sample code loader
  document.getElementById('sampleBtn').addEventListener('click', () => {
    const sampleCode = `
MAX_INPUT_LENGTH = 52
ERR_INVALID_INPUT = 100

map balances: {principal: int}

def validate_base58_input(input: str[52]) -> bool:
    assert len(input) == MAX_INPUT_LENGTH, ERR_INVALID_INPUT
    return True

def base58_to_stacks(address: str[52]) -> Response[str[41], int]:
    if len(address) != MAX_INPUT_LENGTH:
        return Err(ERR_INVALID_INPUT)
    return Ok("ST123...")
`.trim();
    pythonEditor.setValue(sampleCode);
    convert();
  });
});