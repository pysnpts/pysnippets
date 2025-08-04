import { basicSetup, EditorView } from "https://esm.sh/codemirror@6.0.1";
import { html } from "https://esm.sh/@codemirror/lang-html@6.4.5";
import { css } from "https://esm.sh/@codemirror/lang-css@6.2.1";
import { python } from "https://esm.sh/@codemirror/lang-python@6.1.2";


let htmlEditor, cssEditor, pythonEditor;

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


window.addEventListener("DOMContentLoaded", () => {
  htmlEditor = createEditor("html-editor", html());
  cssEditor = createEditor("css-editor", css());
  pythonEditor = createEditor("python-editor", python());

  // Set focus on the Python editor
  pythonEditor.focus();

  // Synchronize radio buttons between desktop and mobile
  function syncRadioButtons() {
    // Desktop to Mobile sync
    document.getElementById('micropython').addEventListener('change', function() {
      if (this.checked) {
        document.getElementById('micropython-mobile').checked = true;
        document.getElementById('pyodide-mobile').checked = false;
      }
    });
    
    document.getElementById('pyodide').addEventListener('change', function() {
      if (this.checked) {
        document.getElementById('pyodide-mobile').checked = true;
        document.getElementById('micropython-mobile').checked = false;
      }
    });

    // Mobile to Desktop sync
    document.getElementById('micropython-mobile').addEventListener('change', function() {
      if (this.checked) {
        document.getElementById('micropython').checked = true;
        document.getElementById('pyodide').checked = false;
      }
    });
    
    document.getElementById('pyodide-mobile').addEventListener('change', function() {
      if (this.checked) {
        document.getElementById('pyodide').checked = true;
        document.getElementById('micropython').checked = false;
      }
    });
  }

  // Initialize radio button synchronization
  syncRadioButtons();

  // Function to handle running the code
  function runCode() {
    const html = htmlEditor.state.doc.toString();
    const cssCode = `<style>${cssEditor.state.doc.toString()}</style>`;
    const py = pythonEditor.state.doc.toString();

    // Get runtime selection (check desktop first, then mobile as fallback)
    let runtime = 'micropython'; // default
    const desktopRuntime = document.querySelector('input[name="runtime-desktop"]:checked');
    const mobileRuntime = document.querySelector('input[name="runtime-mobile"]:checked');
    
    if (desktopRuntime) {
      runtime = desktopRuntime.value;
    } else if (mobileRuntime) {
      runtime = mobileRuntime.value;
    }
    
    const scriptType = runtime === 'micropython' ? 'mpy' : 'py';

    // Get checkbox states (check both desktop and mobile inputs)
    const enableTerminal = document.getElementById('terminal').checked || 
                          document.getElementById('terminal-mobile').checked;
    const enableWorker = document.getElementById('worker').checked || 
                        document.getElementById('worker-mobile').checked;

    // Build script tag attributes
    let scriptAttributes = `type="${scriptType}"`;
    if (enableTerminal) {
      scriptAttributes += ' terminal';
    }
    if (enableWorker) {
      scriptAttributes += ' worker';
    }

    const iframe = document.getElementById("output");
    
    // Reset the iframe by recreating it
    const newIframe = iframe.cloneNode(false);
    iframe.parentNode.replaceChild(newIframe, iframe);
    
    const doc = newIframe.contentDocument || newIframe.contentWindow.document;

    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="stylesheet" href="https://pyscript.net/releases/2025.7.3/core.css" />
  <script type="module" src="https://pyscript.net/releases/2025.7.3/core.js"></script>
  ${cssCode}
</head>
<body>
  ${html}
  <script ${scriptAttributes}>
${py}
  </script>
</body>
</html>`);
    doc.close();

    // Focus and scroll to output pane after running code
    setTimeout(() => {
      const outputPane = document.getElementById("output").closest('.pane');
      if (outputPane) {
        outputPane.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Try to focus the iframe
        const iframe = document.getElementById("output");
        iframe.focus();
      }
    }, 100);
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
});
