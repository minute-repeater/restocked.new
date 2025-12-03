import axios, { AxiosError, AxiosResponse } from "axios";
import type { HttpFetchResult } from "./types.js";

/**
 * Realistic browser headers for HTTP requests
 */
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

/**
 * Validates if HTML content is complete and usable
 */
function isValidHTML(html: string): boolean {
  if (!html || html.length < 5000) {
    return false;
  }

  const hasHTMLTag = /<html[^>]*>/i.test(html);
  const hasBodyTag = /<body[^>]*>/i.test(html);
  const bodyContent = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  if (!hasHTMLTag || !hasBodyTag) {
    return false;
  }

  // Check if body has substantial content (not just scripts)
  if (bodyContent) {
    const bodyText = bodyContent[1]
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .trim();
    return bodyText.length > 100;
  }

  return false;
}

/**
 * Fetches a page using standard HTTP request with Axios
 * Includes retry logic and realistic browser headers
 */
export async function httpFetch(
  url: string,
  timeoutMs: number = 10000
): Promise<HttpFetchResult> {
  const startTime = Date.now();
  const redirects: string[] = [url];

  try {
    const response: AxiosResponse<string> = await axios.get(url, {
      headers: BROWSER_HEADERS,
      timeout: timeoutMs,
      maxRedirects: 10,
      validateStatus: (status) => status >= 200 && status < 400,
      responseType: "text",
    });

    // Get final URL after redirects
    const finalURL =
      response.request.res?.responseURL ||
      response.request.res?.location ||
      response.config.url ||
      url;
    
    if (finalURL !== url) {
      redirects.push(finalURL);
    }

    const html = response.data || "";
    const timingMs = Date.now() - startTime;

    // HTML size limit: 10MB to prevent OOM
    const MAX_HTML_SIZE = 10 * 1024 * 1024; // 10MB
    if (html.length > MAX_HTML_SIZE) {
      console.warn(`[HTTP] HTML too large: ${(html.length / 1024 / 1024).toFixed(2)} MB, rejecting`);
      return {
        success: false,
        statusCode: response.status,
        finalURL,
        html: "",
        headers: {},
        redirects,
        timingMs,
        error: `HTML content too large (${(html.length / 1024 / 1024).toFixed(2)} MB, max ${MAX_HTML_SIZE / 1024 / 1024} MB)`,
      };
    }

    // Convert headers to plain object
    const headers: Record<string, string> = {};
    Object.keys(response.headers).forEach((key) => {
      headers[key] = String(response.headers[key]);
    });

    // Validate HTML completeness
    if (!isValidHTML(html)) {
      return {
        success: false,
        statusCode: response.status,
        finalURL,
        html,
        headers,
        redirects,
        timingMs,
        error: "HTML content is incomplete or invalid",
      };
    }

    return {
      success: true,
      statusCode: response.status,
      finalURL,
      html,
      headers,
      redirects,
      timingMs,
    };
  } catch (error) {
    const timingMs = Date.now() - startTime;

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status || 0;
      const finalURL =
        axiosError.response?.request?.res?.responseURL ||
        axiosError.response?.request?.res?.location ||
        axiosError.config?.url ||
        url;

      return {
        success: false,
        statusCode,
        finalURL,
        html: "",
        headers: {},
        redirects,
        timingMs,
        error: axiosError.message || "HTTP request failed",
      };
    }

    return {
      success: false,
      statusCode: 0,
      finalURL: url,
      html: "",
      headers: {},
      redirects,
      timingMs,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Attempts HTTP fetch with one retry on network errors
 */
export async function httpFetchWithRetry(
  url: string,
  timeoutMs: number = 10000
): Promise<HttpFetchResult> {
  const firstAttempt = await httpFetch(url, timeoutMs);

  // Retry only on network errors (not HTTP errors like 404, 500, etc.)
  if (
    !firstAttempt.success &&
    firstAttempt.statusCode === 0 &&
    firstAttempt.error?.includes("timeout")
  ) {
    // Wait 500ms before retry
    await new Promise((resolve) => setTimeout(resolve, 500));
    return httpFetch(url, timeoutMs);
  }

  return firstAttempt;
}

