/**
 * Preprocessor for PyClarity Converter
 *
 * This module preprocesses Python-like code before it's passed to the lexer/parser:
 * 1. Converts docstrings (""" """) to # comments
 * 2. Removes empty lines and normalizes whitespace
 * 3. Validates basic syntax
 */

/**
 * Preprocesses Python-like code to make it easier to parse
 * @param {string} code - Raw Python-like input code
 * @returns {string} - Preprocessed code ready for lexing/parsing
 */
export function preprocess(code) {
  if (!code || typeof code !== 'string') {
    return '';
  }

  // Track preprocessing steps for debugging
  console.log('[DEBUG] preprocess: Starting preprocessing');
  console.log('[DEBUG] preprocess: Input length:', code.length);

  // Step 1: Convert docstrings to # comments
  let processedCode = convertDocstrings(code);

  // Step 2: Remove empty lines and normalize whitespace
  processedCode = normalizeWhitespace(processedCode);

  // Step 3: Basic syntax validation (could be expanded)
  validateSyntax(processedCode);

  console.log('[DEBUG] preprocess: Preprocessing complete');
  console.log('[DEBUG] preprocess: Output length:', processedCode.length);

  return processedCode;
}

/**
 * Converts triple-quoted docstrings to # comments
 * @param {string} code - Input code
 * @returns {string} - Code with docstrings converted to # comments
 */
function convertDocstrings(code) {
  console.log('[DEBUG] convertDocstrings: Converting docstrings');

  // Regex to match triple-quoted docstrings (both """ and ''')
  // This handles multi-line docstrings with proper indentation preservation
  // The regex looks for indentation, then triple quotes, then content, then triple quotes
  const docstringRegex = /^(\s*)(?:"""([\s\S]*?)"""|'''([\s\S]*?)''')/gm;

  return code.replace(docstringRegex, (match, indent, tripleDoubleContent, tripleSingleContent) => {
    // Get the content from either """ or ''' docstring
    const content = tripleDoubleContent || tripleSingleContent || '';

    if (!content.trim()) {
      return ''; // Empty docstring, remove it
    }

    // Split content into lines, add # prefix to each, and preserve indentation
    const commentLines = content
      .split('\n')
      .map((line, index) => {
        // Get the indentation of this line
        const lineIndent = line.match(/^[^\S\n]*/)[0];
        const trimmedLine = line.trim();

        if (!trimmedLine) {
          return ''; // Skip empty lines
        }

        // For the first line, use the original function indentation + #
        // For subsequent lines, preserve their relative indentation
        if (index === 0) {
          return `${indent}# ${trimmedLine}`;
        } else {
          // Calculate the relative indentation (original + line's own indentation)
          return `${indent}# ${trimmedLine}`;
        }
      })
      .filter(line => line); // Remove empty lines

    return commentLines.join('\n');
  });
}

/**
 * Normalizes whitespace and removes empty lines
 * @param {string} code - Input code
 * @returns {string} - Code with normalized whitespace
 */
function normalizeWhitespace(code) {
  console.log('[DEBUG] normalizeWhitespace: Normalizing whitespace');

  // Remove consecutive empty lines, keeping indentation
  const normalizedCode = code
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace 3+ consecutive newlines with 2
    .replace(/[ \t]+$/gm, ''); // Remove trailing whitespace

  return normalizedCode;
}

/**
 * Performs basic syntax validation
 * @param {string} code - Input code
 * @throws {Error} - If syntax is invalid
 */
function validateSyntax(code) {
  console.log('[DEBUG] validateSyntax: Validating syntax');

  // Check for balanced parentheses
  let parenCount = 0;
  for (const char of code) {
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (parenCount < 0) {
      throw new Error('Syntax error: Unbalanced parentheses');
    }
  }
  if (parenCount !== 0) {
    throw new Error(`Syntax error: Unbalanced parentheses (count: ${parenCount})`);
  }

  // Check for balanced quotes (simple check)
  const doubleQuotes = (code.match(/"/g) || []).length;
  if (doubleQuotes % 2 !== 0) {
    throw new Error('Syntax error: Unbalanced double quotes');
  }

  const singleQuotes = (code.match(/'/g) || []).length;
  if (singleQuotes % 2 !== 0) {
    throw new Error('Syntax error: Unbalanced single quotes');
  }
}
