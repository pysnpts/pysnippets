import { basicSetup, EditorView } from "https://esm.sh/codemirror@6.0.1";
import { html } from "https://esm.sh/@codemirror/lang-html@6.4.5";
import { css } from "https://esm.sh/@codemirror/lang-css@6.2.1";
import { python } from "https://esm.sh/@codemirror/lang-python@6.1.2";


function createEditor(parentId, languageExtension) {
  const parent = document.getElementById(parentId);
  return new EditorView({
    doc: '',
    extensions: [
        basicSetup,
        languageExtension
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

// Settings modal
const settingsBtn = document.getElementById('settings-btn');
settingsBtn.addEventListener('click', () => openModal('settings-modal'));

// About modal
const aboutLink = document.getElementById('about-link');
aboutLink.addEventListener('click', (e) => {
  e.preventDefault();
  openModal('about-modal');
});

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