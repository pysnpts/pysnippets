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
    
