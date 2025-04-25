import { lexer, ClarityParser } from './parser.js';
import { transpile } from './transpiler.js';
import { preprocess } from './preprocessor.js';
import './styles.css';

// Store user settings in localStorage
const userSettings = {
  theme: localStorage.getItem('pyclarity-theme') || 'light',
  autoConvert: localStorage.getItem('pyclarity-autoConvert') !== 'false',
  includeComments: localStorage.getItem('pyclarity-includeComments') !== 'false',
  bottomPanelCollapsed: localStorage.getItem('pyclarity-bottomPanelCollapsed') === 'true',
  editorSplitPosition: localStorage.getItem('pyclarity-editorSplitPosition') || 50, // percentage

  // Save settings to localStorage
  save() {
    localStorage.setItem('pyclarity-theme', this.theme);
    localStorage.setItem('pyclarity-autoConvert', this.autoConvert);
    localStorage.setItem('pyclarity-includeComments', this.includeComments);
    localStorage.setItem('pyclarity-bottomPanelCollapsed', this.bottomPanelCollapsed);
    localStorage.setItem('pyclarity-editorSplitPosition', this.editorSplitPosition);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme
  if (userSettings.theme === 'dark') {
    document.body.classList.add('dark');
  }

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

  // Initialize editors with improved options
  const pythonEditor = CodeMirror.fromTextArea(document.getElementById('pythonEditor'), {
    mode: 'python',
    lineNumbers: true,
    theme: userSettings.theme === 'dark' ? 'monokai' : 'default',
    viewportMargin: Infinity,
    lineWrapping: true,
    tabSize: 4,
    indentWithTabs: false,
    extraKeys: {
      "Tab": function(cm) {
        if (cm.somethingSelected()) {
          cm.indentSelection("add");
        } else {
          cm.replaceSelection("    ", "end");
        }
      }
    }
  });

  // Initialize Clarity editor (read-only)
  const clarityEditor = CodeMirror.fromTextArea(document.getElementById('clarityEditor'), {
    mode: 'clarity',
    lineNumbers: true,
    theme: userSettings.theme === 'dark' ? 'monokai' : 'default',
    readOnly: true,
    viewportMargin: Infinity,
    lineWrapping: true
  });

  // Initialize Preprocessed editor (read-only)
  const preprocessedEditor = CodeMirror.fromTextArea(document.getElementById('preprocessedEditor'), {
    mode: 'python',
    lineNumbers: true,
    theme: userSettings.theme === 'dark' ? 'monokai' : 'default',
    readOnly: true,
    viewportMargin: Infinity,
    lineWrapping: true
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

  // Logging function to add messages to the log console
  function logMessage(message, type = 'info') {
    const logConsole = document.getElementById('logConsole');
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');

    logEntry.className = `log-entry log-${type}`;
    logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-message">${message}</span>`;

    logConsole.appendChild(logEntry);
    logConsole.scrollTop = logConsole.scrollHeight;
  }

  // Error handling function
  function showError(message, details = '') {
    const errorConsole = document.getElementById('errorConsole');
    const errorBadge = document.getElementById('errorBadge');

    // Update error console
    errorConsole.innerHTML = `<div class="error-item">
      <div class="error-message">${message}</div>
      ${details ? `<div class="error-details">${details}</div>` : ''}
    </div>`;

    // Update error badge
    errorBadge.textContent = '1';
    errorBadge.style.display = 'inline-flex';

    // Switch to error tab
    document.querySelector('[data-target="errorTab"]').click();

    // Expand bottom panel if collapsed
    const bottomPanel = document.querySelector('.bottom-panel');
    if (bottomPanel.classList.contains('collapsed')) {
      bottomPanel.classList.remove('collapsed');
      userSettings.bottomPanelCollapsed = false;
      userSettings.save();
    }

    // Log the error
    logMessage(`Error: ${message}`, 'error');
  }

  // Success handling function
  function showSuccess(message) {
    const errorConsole = document.getElementById('errorConsole');
    const errorBadge = document.getElementById('errorBadge');

    // Update error console with success message
    errorConsole.innerHTML = `<div class="success-item">${message}</div>`;

    // Hide error badge
    errorBadge.style.display = 'none';

    // Log the success
    logMessage(`Success: ${message}`, 'success');
  }

  // Preprocess function - returns the preprocessed code and updates UI
  function preprocessCode() {
    const pythonCode = pythonEditor.getValue();
    try {
      // Apply preprocessing
      const preprocessedCode = preprocess(pythonCode);

      // Update preprocessed editor
      preprocessedEditor.setValue(preprocessedCode);

      // Log success
      logMessage('Preprocessing completed successfully');

      return preprocessedCode;
    } catch (e) {
      // Log and show error
      showError('Preprocessing failed', e.message);
      logMessage(`Preprocessing error: ${e.message}`, 'error');
      return null;
    }
  }

  // Conversion function - handles the entire pipeline
  function convert() {
    try {
      // First preprocess the code
      const preprocessedCode = preprocessCode();
      if (!preprocessedCode) {
        throw new Error("Failed to preprocess the code");
      }

      logMessage('Starting conversion process');

      // Tokenize the preprocessed code
      const lexResult = lexer.tokenize(preprocessedCode);
      if (lexResult.errors.length > 0) {
        const errorMessages = lexResult.errors.map(e => e.message).join('; ');
        throw new Error(`Lexing errors: ${errorMessages}`);
      }

      logMessage('Lexical analysis completed successfully');

      // Parse the tokens
      const parser = new ClarityParser();
      parser.input = lexResult.tokens;
      const cst = parser.program();
      if (parser.errors.length > 0) {
        const errorMessages = parser.errors.map(e => e.message).join('; ');
        throw new Error(`Parsing errors: ${errorMessages}`);
      }

      logMessage('Parsing completed successfully');

      // Get the includeComments option from the UI
      const includeComments = userSettings.includeComments;

      // Transpile with options
      const clarityCode = transpile(cst, { includeComments });
      logMessage('Transpilation completed');

      // Validate the generated Clarity code
      const validationError = validateClarity(clarityCode);
      if (validationError) {
        throw new Error(validationError);
      }

      // Update the Clarity editor with the result
      clarityEditor.setValue(clarityCode);

      // Show success message
      showSuccess('Conversion completed successfully');
    } catch (e) {
      // Show error in UI
      showError(e.message);

      // Clear the output if there was an error
      clarityEditor.setValue('');
    }
  }

  // Initialize UI state based on saved settings
  document.getElementById('includeCommentsCheckbox').checked = userSettings.includeComments;
  document.getElementById('autoConvertCheckbox').checked = userSettings.autoConvert;

  // Initialize bottom panel state
  const bottomPanel = document.querySelector('.bottom-panel');
  if (userSettings.bottomPanelCollapsed) {
    bottomPanel.classList.add('collapsed');
  }

  // Set up tab switching in bottom panel
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');

      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // Show target tab content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === targetId) {
          content.classList.add('active');
        }
      });
    });
  });

  // Set up bottom panel collapse/expand
  document.getElementById('collapseBottomPanel').addEventListener('click', () => {
    bottomPanel.classList.toggle('collapsed');
    userSettings.bottomPanelCollapsed = bottomPanel.classList.contains('collapsed');
    userSettings.save();
  });

  // Set up resizable panels
  const resizeHandle = document.getElementById('mainResizeHandle');
  const inputPanel = document.getElementById('inputPanel');
  const outputPanel = document.getElementById('outputPanel');

  let isResizing = false;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const containerRect = resizeHandle.parentElement.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const mouseX = e.clientX - containerRect.left;

    // Calculate percentage (clamped between 20% and 80%)
    const percentage = Math.min(Math.max((mouseX / containerWidth) * 100, 20), 80);

    // Apply the new split
    inputPanel.style.flex = `0 0 ${percentage}%`;
    outputPanel.style.flex = `0 0 ${100 - percentage}%`;

    // Save the position
    userSettings.editorSplitPosition = percentage;
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      userSettings.save();
    }
  });

  // Apply initial split position
  inputPanel.style.flex = `0 0 ${userSettings.editorSplitPosition}%`;
  outputPanel.style.flex = `0 0 ${100 - userSettings.editorSplitPosition}%`;

  // Convert button handler
  document.getElementById('convertBtn').addEventListener('click', convert);

  // Auto-convert checkbox
  document.getElementById('autoConvertCheckbox').addEventListener('change', (e) => {
    userSettings.autoConvert = e.target.checked;
    userSettings.save();

    // If turning on auto-convert, trigger a conversion
    if (e.target.checked) {
      preprocessCode();
      convert();
    }
  });

  // Real-time preprocessing when Python input changes
  pythonEditor.on('change', () => {
    // First update the preprocessed view
    preprocessCode();

    // Then do the conversion if auto-convert is enabled
    if (userSettings.autoConvert) {
      convert();
    }

    // Update log with change info
    logMessage('Input changed, preprocessed code updated');
  });

  // Include comments checkbox
  document.getElementById('includeCommentsCheckbox').addEventListener('change', (e) => {
    userSettings.includeComments = e.target.checked;
    userSettings.save();
    convert();
  });

  // Theme switcher
  document.getElementById('themeBtn').addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    const theme = isDark ? 'monokai' : 'default';

    // Update theme for all editors
    pythonEditor.setOption('theme', theme);
    clarityEditor.setOption('theme', theme);
    preprocessedEditor.setOption('theme', theme);

    // Save theme preference
    userSettings.theme = isDark ? 'dark' : 'light';
    userSettings.save();
  });

  // Settings button (placeholder for future settings panel)
  document.getElementById('settingsBtn').addEventListener('click', () => {
    alert('Settings panel will be implemented in a future update.');
  });

  // Sample code loader
  document.getElementById('sampleBtn').addEventListener('click', () => {
    const sampleCode = `
# Module-level comment
ERR_INVALID_INPUT = 100

@map_type
balances: Dict[Principal, uint]  # User balances map

@public
def validate_and_convert(address: FixedString(52)) -> Response[FixedString(41), int]:
    """Validates a base58 address and converts it to Stacks format.

    Args:
        address: Base58 encoded address (must be exactly 52 chars)
    Returns:
        Response with converted Stacks address or error code
    """
    # Validate input length
    if not _validate_address(address):
        return Err(ERR_INVALID_INPUT)
    return Ok("ST123...")  # Return converted address

@readonly
def get_balance(owner: Principal) -> Response[uint, int]:
    """Gets the balance for a given principal.

    Args:
        owner: Principal to check balance for
    Returns:
        Response with balance or error code
    """
    return Ok(1000)  # Default balance for testing

@private
def _validate_address(address: FixedString(52)) -> bool:
    """Internal helper to validate address format.

    Args:
        address: Address to validate
    Returns:
        True if valid, False otherwise
    """
    return len(address) == 52`;

    // Set the sample code in the editor
    pythonEditor.setValue(sampleCode);

    // Log the action
    logMessage('Loaded sample code');

    // The change event will trigger preprocessing and conversion automatically
  });
});
