// Main extraction API
export { extractProductData, type ExtractionResult } from './extractor.js';

// Fetcher utilities (for advanced usage)
export { fetchPage, closeBrowser, type FetchResult } from './fetcher/index.js';

// Individual parsers (for testing/debugging)
export { extractFromJsonLd } from './parser/jsonld.js';
export { extractFromMeta } from './parser/meta.js';
export { extractFromDom } from './parser/dom.js';
