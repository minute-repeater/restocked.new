import * as fs from "fs";
import * as path from "path";

const DEBUG_ENABLED = process.env.EXTRACTOR_DEBUG === "true" || process.env.NODE_ENV === "development";

/**
 * Debug logger for product extraction
 * Logs diagnostic information when EXTRACTOR_DEBUG=true or NODE_ENV=development
 */
export class ExtractorDebugLogger {
  private logs: string[] = [];
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Log a diagnostic message
   */
  log(message: string, data?: any): void {
    if (!DEBUG_ENABLED) return;

    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.logs.push(logEntry);

    if (data !== undefined) {
      this.logs.push(`  Data: ${JSON.stringify(data, null, 2)}`);
    }

    console.log(`[Extractor Debug] ${logEntry}`);
    if (data !== undefined) {
      console.log(`[Extractor Debug]   Data:`, data);
    }
  }

  /**
   * Log which extraction strategy is running
   */
  logStrategy(strategyName: string, status: "start" | "success" | "fail", details?: any): void {
    if (!DEBUG_ENABLED) return;

    const message = `Strategy: ${strategyName} - ${status}`;
    this.log(message, details);
  }

  /**
   * Log selector matches
   */
  logSelector(selector: string, matched: boolean, value?: string): void {
    if (!DEBUG_ENABLED) return;

    this.log(`Selector: ${selector} - ${matched ? "MATCHED" : "NOT FOUND"}`, value || null);
  }

  /**
   * Log JSON-LD blocks found
   */
  logJsonLd(blocks: any[]): void {
    if (!DEBUG_ENABLED) return;

    this.log(`Found ${blocks.length} JSON-LD block(s)`);
    blocks.forEach((block, index) => {
      if (block && typeof block === "object") {
        const type = block["@type"] || "unknown";
        const hasProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));
        this.log(`  Block ${index + 1}: @type=${JSON.stringify(type)}, isProduct=${hasProduct}`);
      }
    });
  }

  /**
   * Log Shopify detection
   */
  logShopify(detected: boolean, jsonFound: boolean, details?: any): void {
    if (!DEBUG_ENABLED) return;

    this.log(`Shopify: detected=${detected}, jsonFound=${jsonFound}`, details);
  }

  /**
   * Log images found
   */
  logImages(source: string, images: string[]): void {
    if (!DEBUG_ENABLED) return;

    this.log(`Images from ${source}: ${images.length} found`, images.slice(0, 5)); // Log first 5
  }

  /**
   * Save HTML dump to /tmp/extractor-debug.html
   */
  saveHtmlDump(html: string): void {
    if (!DEBUG_ENABLED) return;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `extractor-debug-${timestamp}.html`;
      const filepath = path.join("/tmp", filename);

      // Save first 5000 chars
      const htmlSnippet = html.substring(0, 5000);
      const dump = `<!-- Extracted from: ${this.url} -->\n<!-- Timestamp: ${new Date().toISOString()} -->\n${htmlSnippet}\n\n<!-- ... (truncated) ... -->`;

      fs.writeFileSync(filepath, dump, "utf-8");
      this.log(`HTML dump saved: ${filepath}`);
    } catch (error) {
      this.log(`Failed to save HTML dump: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all logs as array
   */
  getLogs(): string[] {
    return [...this.logs];
  }

  /**
   * Save logs to file
   */
  saveLogs(): void {
    if (!DEBUG_ENABLED) return;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `extractor-debug-${timestamp}.log`;
      const filepath = path.join("/tmp", filename);

      const logContent = [
        `Extraction Debug Log`,
        `URL: ${this.url}`,
        `Timestamp: ${new Date().toISOString()}`,
        ``,
        ...this.logs,
      ].join("\n");

      fs.writeFileSync(filepath, logContent, "utf-8");
      this.log(`Debug logs saved: ${filepath}`);
    } catch (error) {
      // Silently fail - logging is optional
    }
  }
}

