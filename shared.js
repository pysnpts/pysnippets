// Shared utilities for PySnippets
// Used by both main.js and app.js

// Decode shared code from URL parameter
export function decodeSharedCode() {
  const urlParams = new URLSearchParams(window.location.search);
  const shareParam = urlParams.get('share');
  
  if (shareParam) {
    try {
      return JSON.parse(decodeURIComponent(atob(shareParam)));
    } catch (error) {
      console.error('Error loading shared code:', error);
      return null;
    }
  }
  return null;
}

// Generate a shareable link with the provided code data
export function generateShareLink(shareData, isAppUrl = false) {
  // Encode the data as a URL parameter (Unicode-safe)
  const jsonString = JSON.stringify(shareData);
  const encodedData = btoa(encodeURIComponent(jsonString));
  
  // Determine the base URL
  let baseUrl = `${window.location.origin}`;
  if (isAppUrl) {
    // For app URLs, ensure we're pointing to the app directory
    if (window.location.pathname.includes('/app/')) {
      baseUrl += window.location.pathname;
    } else {
      baseUrl += '/app/';
    }
  } else {
    // For editor URLs, point to the root
    baseUrl += '/';
  }
  
  return `${baseUrl}?share=${encodedData}`;
}

// Execute PyScript code in a container
export function executeCode(shareData, containerId = 'output') {
  const html = shareData.html || '';
  const cssCode = shareData.css ? `<style>${shareData.css}</style>` : '';
  const py = shareData.python || '';

  // Get runtime selection
  const runtime = shareData.runtime || 'micropython';
  const scriptType = runtime === 'micropython' ? 'mpy' : 'py';

  // Get settings
  const enableTerminal = shareData.terminal || false;
  const enableWorker = shareData.worker || false;
  const packagesInput = shareData.packages || '';
  const filesInput = shareData.files || '';

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

  // Generate the HTML document
  const docContent = `
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
  `.trim();

  // Find the container and execute
  const container = document.getElementById(containerId);
  if (container) {
    if (container.tagName.toLowerCase() === 'iframe') {
      // If it's an iframe, write to it
      const doc = container.contentDocument || container.contentWindow.document;
      doc.open();
      doc.write(docContent);
      doc.close();
    } else {
      // If it's a div or other container, write the content directly
      container.innerHTML = docContent;
    }
  }

  return docContent;
}
