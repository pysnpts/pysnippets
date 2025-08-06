import { basicSetup, EditorView } from "https://esm.sh/codemirror@6.0.1";
import { html } from "https://esm.sh/@codemirror/lang-html@6.4.5";
import { css } from "https://esm.sh/@codemirror/lang-css@6.2.1";
import { python } from "https://esm.sh/@codemirror/lang-python@6.1.2";
import { decodeSharedCode, generateShareLink as generateShareUrl } from "./shared.js";


function createEditor(parentId, languageExtension) {
  const parent = document.getElementById(parentId);
  return new EditorView({
    doc: '',
    extensions: [
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
        })
    ],
    parent
  });
}

// Initialize editors
const htmlEditor = createEditor("html-editor", html());
const cssEditor = createEditor("css-editor", css());
const pythonEditor = createEditor("python-editor", python());

// Set focus on the Python editor
pythonEditor.focus();

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
function generateShareLink() {
  const html = htmlEditor.state.doc.toString();
  const css = cssEditor.state.doc.toString();
  const python = pythonEditor.state.doc.toString();
  
  // Get current settings
  const runtimeInput = document.querySelector('input[name="runtime"]:checked');
  const runtime = runtimeInput ? runtimeInput.value : 'micropython';
  const enableTerminal = document.getElementById('terminal').checked;
  const enableWorker = document.getElementById('worker').checked;
  const packages = document.getElementById('packages').value.trim();
  const files = document.getElementById('files').value.trim();
  
  // Create a data object with all the code and settings
  const shareData = {
    html: html,
    css: css,
    python: python,
    runtime: runtime,
    terminal: enableTerminal,
    worker: enableWorker,
    packages: packages,
    files: files
  };
  
  // Use shared utility to generate the URLs
  const shareUrl = generateShareUrl(shareData, false); // Editor URL
  const appUrl = generateShareUrl(shareData, true);    // App URL
  
  // Update the share link inputs
  const shareLinkInput = document.getElementById('share-link');
  shareLinkInput.value = shareUrl;
  
  const appLinkInput = document.getElementById('app-link');
  appLinkInput.value = appUrl;
  
  // Generate QR codes
  generateQRCodes(shareUrl, appUrl);
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
function loadSharedCode() {
  const shareData = decodeSharedCode();
  
  if (shareData) {
    try {
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
      
      // Load settings
      if (shareData.runtime) {
        const runtimeInput = document.querySelector(`input[name="runtime"][value="${shareData.runtime}"]`);
        if (runtimeInput) runtimeInput.checked = true;
      }
      
      if (shareData.hasOwnProperty('terminal')) {
        document.getElementById('terminal').checked = shareData.terminal;
      }
      
      if (shareData.hasOwnProperty('worker')) {
        document.getElementById('worker').checked = shareData.worker;
      }
      
      if (shareData.packages) {
        document.getElementById('packages').value = shareData.packages;
      }
      
      if (shareData.files) {
        document.getElementById('files').value = shareData.files;
      }
      
      // Automatically run the shared code after a short delay to ensure everything is loaded
      setTimeout(() => {
        runCode();
      }, 100);
      
    } catch (error) {
      console.error('Error loading shared code:', error);
    }
  }
}

// Settings modal
const settingsBtn = document.getElementById('settings-btn');
settingsBtn.addEventListener('click', () => openModal('settings-modal'));

// Share button
const shareBtn = document.getElementById('share-btn');
shareBtn.addEventListener('click', () => {
  generateShareLink();
  openModal('share-modal');
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
  const py = pythonEditor.state.doc.toString();

  // Get runtime selection
  const runtimeInput = document.querySelector('input[name="runtime"]:checked');
  const runtime = runtimeInput ? runtimeInput.value : 'micropython';
  const scriptType = runtime === 'micropython' ? 'mpy' : 'py';

  // Get checkbox states
  const enableTerminal = document.getElementById('terminal').checked;
  const enableWorker = document.getElementById('worker').checked;

  // Get packages and files input
  const packagesInput = document.getElementById('packages').value.trim();
  const filesInput = document.getElementById('files').value.trim();

  // Build configuration element if needed
  let configElement = '';
  if (packagesInput || filesInput) {
    const configTag = runtime === 'micropython' ? 'mpy-config' : 'py-config';
    let configContent = '';
    
    if (packagesInput) {
      configContent += `packages = [${packagesInput}]\n`;
    }
    
    if (filesInput) {
      configContent += '[files]\n';
      // Split by lines and add each file mapping
      const fileLines = filesInput.split('\n').filter(line => line.trim());
      fileLines.forEach(line => {
        if (line.trim()) {
          configContent += `${line.trim()}\n`;
        }
      });
    }
    
    if (configContent) {
      configElement = `<${configTag}>\n${configContent}</${configTag}>\n`;
    }
  }

  // Build script tag attributes
  let scriptAttributes = `type="${scriptType}"`;
  if (enableTerminal) {
    scriptAttributes += ' terminal';
  }
  if (enableWorker) {
    scriptAttributes += ' worker';
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
        <link rel="stylesheet" href="https://pyscript.net/releases/2025.7.3/core.css">
        <script type="module" src="https://pyscript.net/releases/2025.7.3/core.js"></script>
        ${cssCode}
      </head>
      <body>
        ${configElement}${html}
        <script ${scriptAttributes}>
      ${py}
        </script>
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