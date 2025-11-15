/**
 * Fetch with timeout utility
 * Wraps fetch with AbortController to prevent hanging requests
 * 
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @param {number} timeout - Timeout in milliseconds (default 30000)
 * @returns {Promise<Response>} - Fetch response
 * @throws {Error} - Throws error if request times out or fails
 */
export const fetchWithTimeout = async (url, options = {}, timeout = 30000) => {
  const controller = new AbortController();
  const { signal } = controller;

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    
    throw error;
  }
};
