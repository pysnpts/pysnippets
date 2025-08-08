// Shared utilities for PySnippets
// Used by both main.js and app.js
import WebCompressor from 'https://unpkg.com/web-compressor?module';

// Initialize the compressor with gzip for better compression
const { compress, decompress } = new WebCompressor('gzip', 'base64');

// Decode shared code from URL parameter
export async function decodeSharedCode() {
  const urlParams = new URLSearchParams(window.location.search);
  const shareParam = urlParams.get('share');
  
  if (shareParam) {
    try {
      // URL-decode the parameter first, then decompress
      const urlDecodedParam = decodeURIComponent(shareParam);
      const decompressed = await decompress(urlDecodedParam);
      return JSON.parse(decompressed);
    } catch (error) {
      console.error('Error loading shared code:', error);
      return null;
    }
  }
  return null;
}

// Generate a shareable link with the provided code data
export async function generateShareLink(shareData, isAppUrl = false) {
  try {
    // Compress the data for smaller URLs
    const jsonString = JSON.stringify(shareData);
    const compressed = await compress(jsonString);
    // URL-encode the compressed data to make it safe for query parameters
    const encodedData = encodeURIComponent(compressed);
    
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
    
    const shareUrl = `${baseUrl}?share=${encodedData}`;
    
    // Check if URL is too long (over 2000 characters)
    if (shareUrl.length > 2000) {
      return {
        error: true,
        message: 'The shared code is too large to create a shareable link. Please try reducing the amount of code or use fewer packages.',
        length: shareUrl.length
      };
    }
    
    return shareUrl;
  } catch (error) {
    console.error('Error compressing share data:', error);
    return {
      error: true,
      message: 'Failed to generate share link. Please try again.',
      length: 0
    };
  }
}

