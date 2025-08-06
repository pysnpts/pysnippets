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
      // First try to decompress (new format)
      try {
        const decompressed = await decompress(shareParam);
        return JSON.parse(decompressed);
      } catch (decompressError) {
        // Fallback to old format (uncompressed base64)
        console.log('Falling back to legacy format');
        return JSON.parse(decodeURIComponent(atob(shareParam)));
      }
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
    const encodedData = '' + compressed; // Convert to string representation
    
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
    // Fallback to old method if compression fails
    const jsonString = JSON.stringify(shareData);
    const encodedData = btoa(encodeURIComponent(jsonString));
    
    let baseUrl = `${window.location.origin}`;
    if (isAppUrl) {
      if (window.location.pathname.includes('/app/')) {
        baseUrl += window.location.pathname;
      } else {
        baseUrl += '/app/';
      }
    } else {
      baseUrl += '/';
    }
    
    const fallbackUrl = `${baseUrl}?share=${encodedData}`;
    
    // Check fallback URL length too
    if (fallbackUrl.length > 2000) {
      return {
        error: true,
        message: 'The shared code is too large to create a shareable link. Please try reducing the amount of code or use fewer packages.',
        length: fallbackUrl.length
      };
    }
    
    return fallbackUrl;
  }
}

