/**
 * OrderSarthi — Central API Client
 * Robust client for Google Apps Script REST API with deduplication, auto-auth, timeout, and CORS handling.
 */

class ApiClient {
  constructor() {
    this.inFlightRequests = new Map();
  }

  /**
   * Get auth token based on user/admin context
   * @param {boolean} isAdmin
   * @returns {string|null}
   */
  getToken(isAdmin = false) {
    try {
      const key = isAdmin ? CONFIG.STORAGE_KEYS.ADMIN_TOKEN : CONFIG.STORAGE_KEYS.AUTH_TOKEN;
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  /**
   * Core request dispatcher with timeout and request deduplication
   * @param {'GET'|'POST'} method
   * @param {string} action
   * @param {Object} payload
   * @param {boolean} isAdmin
   * @returns {Promise<any>}
   */
  async request(method, action, payload = {}, isAdmin = false) {
    const isGet = method.toUpperCase() === 'GET';
    const dedupeKey = isGet ? `${action}_${JSON.stringify(payload)}_${isAdmin}` : null;

    // Deduplicate identical simultaneous GET requests
    if (dedupeKey && this.inFlightRequests.has(dedupeKey)) {
      return this.inFlightRequests.get(dedupeKey);
    }

    const requestPromise = (async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

      try {
        let url = CONFIG.API_BASE_URL;
        const options = {
          method: 'GET',
          headers: {},
          signal: controller.signal
        };

        const token = this.getToken(isAdmin);

        if (isGet) {
          const params = new URLSearchParams({ action, ...payload });
          if (token) params.set('token', token);
          url += (url.includes('?') ? '&' : '?') + params.toString();
        } else {
          options.method = 'POST';
          // Google Apps Script Web Apps receive payload through e.postData.contents
          // Send as text/plain or application/x-www-form-urlencoded to avoid CORS preflight issues
          const postBody = {
            action,
            token,
            data: payload
          };
          options.body = JSON.stringify(postBody);
          options.headers['Content-Type'] = 'text/plain;charset=utf-8';
        }

        const response = await fetch(url, options);
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Network response error: ${response.status} ${response.statusText}`);
        }

        const text = await response.text();
        let result;
        try {
          result = JSON.parse(text);
        } catch (parseErr) {
          console.error("Failed to parse backend response:", text);
          throw new Error("Invalid response format from server.");
        }

        if (!result.success) {
          const errCode = result.error?.code || 'ERROR';
          const errMsg = result.error?.message || 'An unexpected error occurred.';
          const error = new Error(errMsg);
          error.code = errCode;
          error.details = result.error;
          throw error;
        }

        return result.data;
      } catch (err) {
        if (err.name === 'AbortError') {
          throw new Error('Request timed out. Please check your internet connection.');
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
        if (dedupeKey) {
          this.inFlightRequests.delete(dedupeKey);
        }
      }
    })();

    if (dedupeKey) {
      this.inFlightRequests.set(dedupeKey, requestPromise);
    }

    return requestPromise;
  }

  /**
   * Helper for GET requests
   * @param {string} action
   * @param {Object} params
   * @param {boolean} isAdmin
   */
  async get(action, params = {}, isAdmin = false) {
    return this.request('GET', action, params, isAdmin);
  }

  /**
   * Helper for POST requests
   * @param {string} action
   * @param {Object} data
   * @param {boolean} isAdmin
   */
  async post(action, data = {}, isAdmin = false) {
    return this.request('POST', action, data, isAdmin);
  }
}

// Export singleton API client
const api = new ApiClient();
