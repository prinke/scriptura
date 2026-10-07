/**
 * ESV API Client
 * 
 * Provides helper functions for interacting with the ESV (English Standard Version)
 * Bible API. Supports both direct passage lookup and phrase-based search.
 * 
 * API Documentation: https://api.esv.org/docs/
 * 
 * Required Environment Variables:
 * - ESV_API_KEY: Authentication token from api.esv.org
 * 
 * @module helpers/esv_api_request
 */

/** @constant {string} ESV API endpoint for passage text retrieval */
const ESV_PASSAGE_URL = 'https://api.esv.org/v3/passage/text/';

/** @constant {string} ESV API endpoint for passage audio (redirects to an MP3) */
const ESV_AUDIO_URL = "https://api.esv.org/v3/passage/audio/";

/** @constant {string} ESV API endpoint for search queries */
const ESV_SEARCH_URL = 'https://api.esv.org/v3/passage/search/';

/** @constant {string} ESV API authentication key from environment */
const ESV_API_KEY = process.env.ESV_API_KEY;

/** @constant {number} Request timeout in milliseconds (10 seconds) */
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Fetch function with Node.js compatibility layer.
 * 
 * Uses native fetch if available (Node 18+), otherwise dynamically
 * imports node-fetch for older Node versions. This lazy-loading
 * approach avoids unnecessary dependencies on newer Node versions.
 * 
 * @private
 * @constant {Function}
 */
const fetchFn = (() => {
	if (typeof fetch === 'function') {
		return fetch;
	}
	let cachedFetch;
	return async (...args) => {
		if (!cachedFetch) {
			({ default: cachedFetch } = await import('node-fetch'));
		}
		return cachedFetch(...args);
	};
})();

// Validate ESV API key on module load
if (!ESV_API_KEY) {
	throw new Error('ESV_API_KEY is not defined in the environment variables.');
}

/** @constant {Object} Authorization headers for ESV API requests */
const ESV_HEADERS = {
	Authorization: `Token ${ESV_API_KEY}`,
};

/**
 * Executes an HTTP request to the ESV API with timeout handling.
 * 
 * Features:
 * - Automatic timeout after REQUEST_TIMEOUT_MS
 * - HTTP status code validation
 * - JSON response parsing
 * - Detailed error logging
 * 
 * @private
 * @param {string} url - Full URL to request (including query parameters)
 * @returns {Promise<Object>} Parsed JSON response from ESV API
 * @throws {Error} On network failure, timeout, or non-2xx status codes
 */
async function esvRequest(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchFn(url, {
      method: "GET",
      headers: ESV_HEADERS,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(
        "ESV API error:",
        response.status,
        response.statusText,
        errorBody,
      );
      throw new Error(`ESV API request failed with status ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        `ESV API request timed out after ${REQUEST_TIMEOUT_MS}ms`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches a Bible passage by reference (e.g., "John 3:16").
 * 
 * Returns formatted passage text with configurable options.
 * Footnotes, headings, and copyright notices are excluded for cleaner output by default.
 * 
 * Response includes:
 * - passages: Array of passage text
 * - passage_meta: Metadata including canonical reference
 * - query: The processed verse reference
 * 
 * @param {string} verse - Bible reference (e.g., "Genesis 1:1", "Psalm 23", "John 3:16-17")
 * @param {Object} [options={}] - Passage formatting options
 * @param {boolean} [options.includeFootnotes=false] - Include footnotes in the passage text
 * @param {boolean} [options.includeHeadings=false] - Include section headings in the passage text
 * @param {boolean} [options.includeVerseNumbers=true] - Include verse numbers in the passage text
 * @returns {Promise<Object>} ESV API passage response
 * @throws {Error} On API failure or timeout
 * 
 * @example
 * const result = await esvPassageRequest('John 3:16');
 * console.log(result.passages[0]); // "For God so loved the world..."
 */
async function esvPassageRequest(
  verse,
  { includeFootnotes = false, includeHeadings = false, includeVerseNumbers = true } = {},
) {
  const query = new URLSearchParams({
    "include-footnote-body": includeFootnotes ? "true" : "false",
    "include-footnotes": includeFootnotes ? "true" : "false",
    "include-passage-references": "false",
    "include-short-copyright": "false",
    "include-headings": includeHeadings ? "true" : "false",
    "include-verse-numbers": includeVerseNumbers ? "true" : "false",
    q: verse,
  });

  const url = `${ESV_PASSAGE_URL}?${query.toString()}`;
  return esvRequest(url);
}

/**
 * Searches the ESV Bible for a phrase or keyword.
 * 
 * Returns paginated search results with verse references and content.
 * Useful when the user query is not a direct verse reference.
 * 
 * Response includes:
 * - results: Array of matching verses with reference and content
 * - total_results: Total number of matches across all pages
 * - page: Current page number
 * - total_pages: Total number of pages available
 * 
 * @param {string} text - Search phrase or keywords
 * @param {Object} [options={}] - Search options
 * @param {number} [options.page] - Page number for pagination (1-indexed)
 * @param {number} [options.pageSize] - Number of results per page
 * @returns {Promise<Object>} ESV API search response
 * @throws {Error} On API failure or timeout
 * 
 * @example
 * const results = await esvSearchRequest('love your neighbor', { page: 1, pageSize: 10 });
 * console.log(results.total_results); // e.g., 42
 */
async function esvSearchRequest(text, { page, pageSize } = {}) {
  const query = new URLSearchParams({
    q: text,
  });

  if (typeof page === "number") query.set("page", String(page));
  if (typeof pageSize === "number") query.set("page-size", String(pageSize));

  const url = `${ESV_SEARCH_URL}?${query.toString()}`;
  return esvRequest(url);
}

/**
 * Resolves the MP3 URL for a passage's ESV audio recording.
 *
 * The ESV API responds with a redirect to a public MP3 on audio.esv.org.
 * The redirect target is returned instead of followed so the caller can
 * stream it without sending the API token.
 *
 * @param {string} passage - Bible reference (e.g., "John 3", "Psalm 23")
 * @returns {Promise<string|null>} MP3 URL, or null if the passage is invalid
 * @throws {Error} On API failure or timeout
 *
 * @example
 * const url = await esvAudioUrl('John 3');
 * // "https://audio.esv.org/hw/John%203.mp3"
 */
async function esvAudioUrl(passage) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const url = `${ESV_AUDIO_URL}?${new URLSearchParams({ q: passage })}`;

  try {
    const response = await fetchFn(url, {
      method: "GET",
      headers: ESV_HEADERS,
      redirect: "manual",
      signal: controller.signal,
    });

    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      return new URL(location, url).toString();
    }
    if (response.status === 400) return null;

    throw new Error(`ESV audio request failed with status ${response.status}`);
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        `ESV API request timed out after ${REQUEST_TIMEOUT_MS}ms`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = {
  esvPassageRequest,
  esvSearchRequest,
  esvAudioUrl,
};
