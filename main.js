import { basicSetup, EditorView } from "https://esm.sh/codemirror@6.0.1";
import { html } from "https://esm.sh/@codemirror/lang-html@6.4.5";
import { css } from "https://esm.sh/@codemirror/lang-css@6.2.1";
import { python } from "https://esm.sh/@codemirror/lang-python@6.1.2";
import { EditorState } from "https://esm.sh/@codemirror/state@6.5.2";
import { keymap } from "https://esm.sh/@codemirror/view@6.38.1";
import { defaultKeymap, indentWithTab } from "https://esm.sh/@codemirror/commands@6.8.1";
import { indentUnit } from "https://esm.sh/@codemirror/language@6.11.2";
import { decodeSharedCode, generateShareLink as generateShareUrl } from "./shared.js";


function createEditor(parentId, languageExtension, tabSize) {
  const parent = document.getElementById(parentId);
  let state = EditorState.create({
    doc: '',
    extensions: [
        indentUnit.of(" ".repeat(tabSize)),   // Indent with 4 spaces
        keymap.of([indentWithTab, ...defaultKeymap]), // Allow Tab key to indent
        basicSetup,
        languageExtension,
        EditorView.theme({
            "&": {
                height: "100%",
                fontSize: "14px"
            },
            ".cm-scroller": {
                overflow: "auto"
            },
            ".cm-focused": {
                outline: "none"
            }
        }),
    ]
});
  return new EditorView({
    state,
    parent
  });
}

// Initialize editors
const htmlEditor = createEditor("html-editor", html(), 2);
const cssEditor = createEditor("css-editor", css(), 2);
const pythonEditor = createEditor("python-editor", python(), 4);

// Set focus on the Python editor
pythonEditor.focus();

// Centralized settings handler
function getCurrentSettings() {
  // Get PyScript version
  const pyscriptVersion = document.getElementById('pyscript-version').value;

  // Get runtime selection
  const runtimeInput = document.querySelector('input[name="runtime"]:checked');
  const runtime = runtimeInput ? runtimeInput.value : 'micropython';

  // Get checkbox states
  const terminal = document.getElementById('terminal').checked;
  const worker = document.getElementById('worker').checked;

  // Parse packages as array (one per line)
  const packagesText = document.getElementById('packages').value.trim();
  const packages = packagesText ? packagesText.split('\n').map(line => line.trim()).filter(line => line) : [];

  // Parse files as object (key = value pairs)
  const filesText = document.getElementById('files').value.trim();
  const files = {};
  if (filesText) {
    filesText.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('='); // Handle values that contain '='
        
        // Clean key and value by trimming and removing surrounding quotes if present
        let cleanKey = key.trim();
        let cleanValue = value.trim();
        
        // Remove surrounding quotes if they exist
        if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
          cleanKey = cleanKey.slice(1, -1);
        }
        if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
          cleanValue = cleanValue.slice(1, -1);
        }
        
        files[cleanKey] = cleanValue;
      }
    });
  }

  return {
    pyscriptVersion: pyscriptVersion,
    runtime: runtime,
    terminal: terminal,
    worker: worker,
    packages: packages,
    files: files
  };
}

// Apply settings to the UI
function applySettings(settings) {
  // Set PyScript version
  if (settings.pyscriptVersion) {
    const versionSelect = document.getElementById('pyscript-version');
    if (versionSelect) {
      versionSelect.value = settings.pyscriptVersion;
    }
  }

  // Set runtime
  if (settings.runtime) {
    const runtimeInput = document.querySelector(`input[name="runtime"][value="${settings.runtime}"]`);
    if (runtimeInput) runtimeInput.checked = true;
  }

  // Set checkboxes
  if (settings.hasOwnProperty('terminal')) {
    document.getElementById('terminal').checked = settings.terminal;
  }

  if (settings.hasOwnProperty('worker')) {
    document.getElementById('worker').checked = settings.worker;
  }

  // Set packages: convert array back to newline-separated text
  if (settings.packages) {
    const packagesText = settings.packages.join('\n');
    document.getElementById('packages').value = packagesText;
  }

  // Set files: convert object back to key=value pairs
  if (settings.files) {
    const filesText = Object.entries(settings.files)
      .map(([key, value]) => `"${key}" = "${value}"`)
      .join('\n');
    document.getElementById('files').value = filesText;
  }
}

// Shared modal functionality
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
    // Return focus to the Python editor
    pythonEditor.focus();
  }
}

// Generate a shareable link with the current code
async function generateShareLink() {
  const html = htmlEditor.state.doc.toString();
  const css = cssEditor.state.doc.toString();
  const python = pythonEditor.state.doc.toString();
  
  // Get current settings using centralized function
  const settings = getCurrentSettings();
  
  // Create a data object with all the code and settings
  const shareData = {
    html: html,
    css: css,
    python: python,
    ...settings
  };
  
  // Show loading state in inputs
  const shareLinkInput = document.getElementById('share-link');
  const appLinkInput = document.getElementById('app-link');
  shareLinkInput.value = 'Generating share link...';
  appLinkInput.value = 'Generating app link...';
  
  try {
    // Use shared utility to generate the URLs (now async)
    const shareUrl = await generateShareUrl(shareData, false); // Editor URL
    const appUrl = await generateShareUrl(shareData, true);    // App URL
    
    // Check if either URL returned an error
    if ((shareUrl && shareUrl.error) || (appUrl && appUrl.error)) {
      const errorUrl = shareUrl.error ? shareUrl : appUrl;
      showUrlTooLongError(errorUrl.message, errorUrl.length);
      return false; // Indicate error occurred
    }
    
    // Update the share link inputs
    shareLinkInput.value = shareUrl;
    appLinkInput.value = appUrl;
    
    // Generate QR codes
    generateQRCodes(shareUrl, appUrl);
    return true; // Indicate success
  } catch (error) {
    console.error('Error generating share links:', error);
    shareLinkInput.value = 'Error generating link';
    appLinkInput.value = 'Error generating link';
    return false; // Indicate error occurred
  }
}

// Show error modal for URL that's too long
function showUrlTooLongError(message, length) {
  const errorMessage = document.getElementById('error-message');
  errorMessage.textContent = `${message} (Current length: ${length} characters, maximum: 2000)`;
  openModal('error-modal');
}

// Generate QR codes for share URLs
function generateQRCodes(editorUrl, appUrl) {
  // Clear any existing QR codes
  const editorQRContainer = document.getElementById('editor-qr');
  const appQRContainer = document.getElementById('app-qr');
  
  if (editorQRContainer) {
    editorQRContainer.innerHTML = '';
  }
  if (appQRContainer) {
    appQRContainer.innerHTML = '';
  }
  
  // Check if QRCode library is available
  if (!window.QRCode) {
    console.error('QRCode library not loaded');
    return;
  }
  
  // QR code options - larger size for better visibility
  const qrOptions = {
    width: 200,
    height: 200,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  };
  
  // Generate QR code for editor link
  if (editorQRContainer) {
    try {
      new QRCode(editorQRContainer, {
        text: editorUrl,
        ...qrOptions
      });
    } catch (error) {
      console.error('Error generating editor QR code:', error);
    }
  }
  
  // Generate QR code for app link
  if (appQRContainer) {
    try {
      new QRCode(appQRContainer, {
        text: appUrl,
        ...qrOptions
      });
    } catch (error) {
      console.error('Error generating app QR code:', error);
    }
  }
}

// Toggle QR code display for editor link
function toggleEditorQR() {
  const qrContainer = document.getElementById('editor-qr-container');
  const qrButton = document.getElementById('qr-toggle-btn');
  
  if (qrContainer.style.display === 'none') {
    qrContainer.style.display = 'flex';
    qrButton.classList.add('active');
  } else {
    qrContainer.style.display = 'none';
    qrButton.classList.remove('active');
  }
}

// Toggle QR code display for app link
function toggleAppQR() {
  const qrContainer = document.getElementById('app-qr-container');
  const qrButton = document.getElementById('app-qr-toggle-btn');
  
  if (qrContainer.style.display === 'none') {
    qrContainer.style.display = 'flex';
    qrButton.classList.add('active');
  } else {
    qrContainer.style.display = 'none';
    qrButton.classList.remove('active');
  }
}

// Copy share link to clipboard
function copyShareLink() {
  const shareLinkInput = document.getElementById('share-link');
  shareLinkInput.select();
  shareLinkInput.setSelectionRange(0, 99999); // For mobile devices
  
  try {
    navigator.clipboard.writeText(shareLinkInput.value).then(() => {
      // Visual feedback for successful copy
      const copyBtn = document.getElementById('copy-link-btn');
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>Copied!';
      copyBtn.style.background = '#4CAF50';
      
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.style.background = '';
      }, 2000);
    });
  } catch (err) {
    // Fallback for older browsers
    document.execCommand('copy');
    console.log('Link copied to clipboard');
  }
}

// Open is.gd URL shortening page in a new tab
function generateShortUrl() {
  const shareLinkInput = document.getElementById('share-link');
  const shortUrlBtn = document.getElementById('short-url-btn');
  const originalUrl = shareLinkInput.value;
  
  if (!originalUrl || originalUrl === 'Generating share link...') {
    return;
  }
  
  // URL encode the original URL for the query parameter
  const encodedUrl = encodeURIComponent(originalUrl);
  const shortUrlCreationUrl = `https://is.gd/create.php?url=${encodedUrl}`;
  
  // Open the URL shortening page in a new tab
  window.open(shortUrlCreationUrl, '_blank');
  
  // Visual feedback for opening the tab
  const originalText = shortUrlBtn.innerHTML;
  shortUrlBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/></svg>Opened';
  shortUrlBtn.style.background = '#5a6268';
  
  setTimeout(() => {
    shortUrlBtn.innerHTML = originalText;
    shortUrlBtn.style.background = '';
  }, 2000);
}

// Copy app share link to clipboard
function copyAppShareLink() {
  const appLinkInput = document.getElementById('app-link');
  appLinkInput.select();
  appLinkInput.setSelectionRange(0, 99999); // For mobile devices
  
  try {
    navigator.clipboard.writeText(appLinkInput.value).then(() => {
      // Visual feedback for successful copy
      const copyBtn = document.getElementById('copy-app-link-btn');
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>Copied!';
      copyBtn.style.background = '#4CAF50';
      
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.style.background = '';
      }, 2000);
    });
  } catch (err) {
    // Fallback for older browsers
    document.execCommand('copy');
    console.log('App link copied to clipboard');
  }
}

// Open is.gd URL shortening page for app link in a new tab
function generateShortAppUrl() {
  const appLinkInput = document.getElementById('app-link');
  const shortUrlBtn = document.getElementById('short-app-url-btn');
  const originalUrl = appLinkInput.value;
  
  if (!originalUrl || originalUrl === 'Generating app link...') {
    return;
  }
  
  // URL encode the original URL for the query parameter
  const encodedUrl = encodeURIComponent(originalUrl);
  const shortUrlCreationUrl = `https://is.gd/create.php?url=${encodedUrl}`;
  
  // Open the URL shortening page in a new tab
  window.open(shortUrlCreationUrl, '_blank');
  
  // Visual feedback for opening the tab
  const originalText = shortUrlBtn.innerHTML;
  shortUrlBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/></svg>Opened';
  shortUrlBtn.style.background = '#5a6268';
  
  setTimeout(() => {
    shortUrlBtn.innerHTML = originalText;
    shortUrlBtn.style.background = '';
  }, 2000);
}

// Load shared code from URL parameter
async function loadSharedCode() {
  try {
    const shareData = await decodeSharedCode();
    
    if (shareData) {
      // Load code into editors
      if (shareData.html) {
        htmlEditor.dispatch({
          changes: { from: 0, to: htmlEditor.state.doc.length, insert: shareData.html }
        });
      }
      
      if (shareData.css) {
        cssEditor.dispatch({
          changes: { from: 0, to: cssEditor.state.doc.length, insert: shareData.css }
        });
      }
      
      if (shareData.python) {
        pythonEditor.dispatch({
          changes: { from: 0, to: pythonEditor.state.doc.length, insert: shareData.python }
        });
      }
      
      // Load PyScript version and settings using centralized function
      applySettings(shareData);
      
      // Automatically run the shared code after a short delay to ensure everything is loaded
      setTimeout(() => {
        runCode();
      }, 100);
    }
  } catch (error) {
    console.error('Error loading shared code:', error);
  }
}

// Settings modal
const settingsBtn = document.getElementById('settings-btn');
settingsBtn.addEventListener('click', () => openModal('settings-modal'));

// Share button
const shareBtn = document.getElementById('share-btn');
shareBtn.addEventListener('click', async () => {
  const success = await generateShareLink();
  if (success) {
    openModal('share-modal');
  }
  // If not successful, the error modal will already be shown
});

// About modal
const aboutLink = document.getElementById('about-link');
aboutLink.addEventListener('click', (e) => {
  e.preventDefault();
  openModal('about-modal');
});

// Copy share link button
const copyLinkBtn = document.getElementById('copy-link-btn');
copyLinkBtn.addEventListener('click', copyShareLink);

// QR toggle button for editor link
const qrToggleBtn = document.getElementById('qr-toggle-btn');
qrToggleBtn.addEventListener('click', toggleEditorQR);

// Short URL button
const shortUrlBtn = document.getElementById('short-url-btn');
shortUrlBtn.addEventListener('click', generateShortUrl);

// Copy app share link button
const copyAppLinkBtn = document.getElementById('copy-app-link-btn');
copyAppLinkBtn.addEventListener('click', copyAppShareLink);

// QR toggle button for app link
const appQrToggleBtn = document.getElementById('app-qr-toggle-btn');
appQrToggleBtn.addEventListener('click', toggleAppQR);

// Short app URL button
const shortAppUrlBtn = document.getElementById('short-app-url-btn');
shortAppUrlBtn.addEventListener('click', generateShortAppUrl);

// Close buttons with data-modal attribute
document.querySelectorAll('.close-button[data-modal]').forEach(button => {
  button.addEventListener('click', () => {
    const modalId = button.getAttribute('data-modal');
    closeModal(modalId);
  });
});

// Close modal when clicking outside of it
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal(modal.id);
    }
  });
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const openModal = document.querySelector('.modal.show');
    if (openModal) {
      closeModal(openModal.id);
    }
  }
});

// Function to handle running the code
function runCode() {
  const html = htmlEditor.state.doc.toString();
  const cssCode = `<style>${cssEditor.state.doc.toString()}</style>`;
  const py = pythonEditor.state.doc.toString().trim();

  // Get current settings using centralized function
  const settings = getCurrentSettings();
  const { pyscriptVersion, runtime, terminal: enableTerminal, worker: enableWorker, packages, files } = settings;
  const scriptType = runtime === 'micropython' ? 'mpy' : 'py';

  // Build script tag attributes
  let scriptAttributes = `type="${scriptType}"`;
  if (enableTerminal) {
    scriptAttributes += ' terminal';
  }
  if (enableWorker) {
    scriptAttributes += ' worker';
  }
  
  // Add config attribute if there are packages or files
  if (packages.length > 0 || Object.keys(files).length > 0) {
    const config = {};
    if (packages.length > 0) {
      config.packages = packages;
    }
    if (Object.keys(files).length > 0) {
      config.files = files;
    }
    const configJson = JSON.stringify(config);
    scriptAttributes += ` config='${configJson}'`;
  }

  const oldFrame = document.getElementById("output");

  // Reset the iframe by recreating it
  const iframe = oldFrame.cloneNode(false);
  oldFrame.replaceWith(iframe);

  // Focus and scroll to output pane after running code
  iframe.onload = () => {
    const outputPane = iframe.closest('.pane');
    if (outputPane) {
      outputPane.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Try to focus the iframe
      iframe.focus();
    }
  };

  const doc = iframe.contentDocument || iframe.contentWindow.document;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://pyscript.net/releases/${pyscriptVersion}/core.css">
        <script type="module" src="https://pyscript.net/releases/${pyscriptVersion}/core.js"></script>
        ${cssCode}
      </head>
      <body>
        ${html}
        <script ${scriptAttributes}>${py}</script>
      </body>
    </html>
  `.trim());
  doc.close();
}

// Add click event listener to the run button
document.getElementById("run-btn").addEventListener("click", runCode);

// Add keyboard event listener for Ctrl+S (or Cmd+S on Mac)
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault(); // Prevent the default save behavior
    runCode();
  }
});

// Load shared code if present in URL on page load
document.addEventListener('DOMContentLoaded', loadSharedCode);

// If DOMContentLoaded has already fired, call loadSharedCode immediately
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSharedCode);
} else {
  loadSharedCode();
}