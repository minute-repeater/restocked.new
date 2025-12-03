import type { FetchResult } from "../fetcher/types.js";
import { loadDom, type CheerioAPI } from "../parser/loadDom.js";
import { safeQuery, getAttr, findAll } from "../parser/queryHelpers.js";
import { extractCleanText } from "../parser/textExtraction.js";
import { extractEmbeddedJson } from "../parser/jsonExtraction.js";
import { detectDynamicContent } from "../parser/detectDynamicContent.js";
import { extractVariants } from "../variants/index.js";
import type { VariantExtractionContext } from "../variants/variantTypes.js";
import { extractPrice } from "../pricing/index.js";
import type { PriceExtractionContext } from "../pricing/priceTypes.js";
import { extractStock } from "../stock/index.js";
import type { StockExtractionContext } from "../stock/stockTypes.js";
import type { ProductShell } from "./productTypes.js";
import { ExtractorDebugLogger } from "./debugLogger.js";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";

/**
 * Extract product title using best-effort queries
 * Tries multiple selectors in order of preference
 *
 * @param $ - Cheerio root instance
 * @param jsonBlobs - Pre-extracted JSON blobs from the page
 * @param debugLogger - Optional debug logger
 * @returns Extracted title or null
 */
function extractTitle($: CheerioAPI, jsonBlobs: any[] = [], debugLogger?: ExtractorDebugLogger): string | null {
  // Strategy 1: Extract from embedded JSON (JSON-LD and Shopify JSON)
  debugLogger?.log(`Checking ${jsonBlobs.length} JSON blob(s) for title`);
  
  for (let i = 0; i < jsonBlobs.length; i++) {
    const json = jsonBlobs[i];
    if (json && typeof json === "object") {
      // Handle arrays of JSON-LD objects
      const objects = Array.isArray(json) ? json : [json];
      debugLogger?.log(`JSON blob ${i + 1}: ${Array.isArray(json) ? `array of ${json.length}` : "object"}`);
      
      for (let j = 0; j < objects.length; j++) {
        const obj = objects[j];
        if (!obj || typeof obj !== "object") continue;

        // JSON-LD Product schema
        if (obj["@type"] === "Product" || (Array.isArray(obj["@type"]) && obj["@type"].includes("Product"))) {
          if (obj.name) {
            const name = typeof obj.name === "string" ? obj.name : String(obj.name);
            debugLogger?.logStrategy("JSON-LD Product.name", "success", { name });
            return name.trim();
    }
  }

        // Shopify product JSON structure: { product: { title: "..." } }
        if (obj.product && typeof obj.product === "object" && obj.product.title) {
          const title = typeof obj.product.title === "string" ? obj.product.title : String(obj.product.title);
          debugLogger?.logStrategy("Shopify product.title", "success", { title, blobIndex: i, objectIndex: j });
          return title.trim();
        }

        // Direct product object (some sites)
        if (obj.title && !obj["@type"]) {
          const title = typeof obj.title === "string" ? obj.title : String(obj.title);
          debugLogger?.logStrategy("Direct product.title", "success", { title });
          return title.trim();
    }
  }
    }
  }
  
  debugLogger?.log("No title found in JSON blobs");

  // Strategy 2: Open Graph title
  const ogTitle = safeQuery($, 'meta[property="og:title"]');
  if (ogTitle) {
    const ogTitleContent = getAttr(ogTitle, "content");
    if (ogTitleContent && ogTitleContent.trim()) {
      debugLogger?.logSelector('meta[property="og:title"]', true, ogTitleContent);
      return ogTitleContent.trim();
    }
  }
  debugLogger?.logSelector('meta[property="og:title"]', false);

  // Strategy 3: Twitter card title
  const twitterTitle = safeQuery($, 'meta[name="twitter:title"]');
  if (twitterTitle) {
    const twitterTitleContent = getAttr(twitterTitle, "content");
    if (twitterTitleContent && twitterTitleContent.trim()) {
      debugLogger?.logSelector('meta[name="twitter:title"]', true, twitterTitleContent);
      return twitterTitleContent.trim();
    }
  }
  debugLogger?.logSelector('meta[name="twitter:title"]', false);

  // Strategy 4: Product-specific selectors
  const productTitleSelectors = [
    ".product-title",
    ".product__title",
    "[itemprop='name']",
    ".product-name",
    ".product__name",
    "h1.product-title",
    "h1.product__title",
  ];

  for (const selector of productTitleSelectors) {
    const element = safeQuery($, selector);
    if (element) {
      const text = extractCleanText(element);
      if (text && text.trim()) {
        debugLogger?.logSelector(selector, true, text);
        return text.trim();
      }
    }
  }

  // Strategy 5: <h1> tag
  const h1Tag = safeQuery($, "h1");
  if (h1Tag) {
    const h1Text = extractCleanText(h1Tag);
    if (h1Text && h1Text.trim()) {
      debugLogger?.logSelector("h1", true, h1Text);
      return h1Text.trim();
    }
  }
  debugLogger?.logSelector("h1", false);

  // Strategy 6: Meta title attribute
  const metaTitle = safeQuery($, 'meta[name="title"]');
  if (metaTitle) {
    const metaTitleContent = getAttr(metaTitle, "content");
    if (metaTitleContent && metaTitleContent.trim()) {
      debugLogger?.logSelector('meta[name="title"]', true, metaTitleContent);
      return metaTitleContent.trim();
    }
  }
  debugLogger?.logSelector('meta[name="title"]', false);

  // Fallback: <title> tag (clean it up)
  const titleTag = safeQuery($, "title");
  if (titleTag) {
    const titleText = extractCleanText(titleTag);
    if (titleText && titleText.trim()) {
      // Clean up common title patterns (e.g., "Product Name | Store Name")
      const cleaned = titleText.split("|")[0].split("-")[0].trim();
      if (cleaned) {
        debugLogger?.logStrategy("Fallback: <title> tag", "success", { original: titleText, cleaned });
        return cleaned;
      }
    }
  }

  debugLogger?.logStrategy("Title extraction", "fail", { reason: "No selectors matched" });
  return null;
}

/**
 * Extract product description using best-effort queries
 * Tries multiple selectors in order of preference
 *
 * @param $ - Cheerio root instance
 * @returns Extracted description or null
 */
function extractDescription($: CheerioAPI): string | null {
  // Try meta description first
  const metaDesc = safeQuery($, 'meta[name="description"]');
  if (metaDesc) {
    const descContent = getAttr(metaDesc, "content");
    if (descContent && descContent.trim()) {
      return descContent.trim();
    }
  }

  // Try Open Graph description
  const ogDesc = safeQuery($, 'meta[property="og:description"]');
  if (ogDesc) {
    const ogDescContent = getAttr(ogDesc, "content");
    if (ogDescContent && ogDescContent.trim()) {
      return ogDescContent.trim();
    }
  }

  // Try Twitter card description
  const twitterDesc = safeQuery($, 'meta[name="twitter:description"]');
  if (twitterDesc) {
    const twitterDescContent = getAttr(twitterDesc, "content");
    if (twitterDescContent && twitterDescContent.trim()) {
      return twitterDescContent.trim();
    }
  }

  return null;
}

/**
 * Extract product images from the page
 * Collects from Open Graph images, JSON-LD, and <img> tags
 * Deduplicates URLs and limits to top 10
 *
 * @param $ - Cheerio root instance
 * @param jsonBlobs - Array of extracted JSON-LD objects
 * @param debugLogger - Optional debug logger
 * @returns Array of image URLs
 */
function extractImages($: CheerioAPI, jsonBlobs: any[] = [], debugLogger?: ExtractorDebugLogger): string[] {
  const imageUrls = new Set<string>();

  // Strategy 1: Open Graph image (highest priority)
  const ogImage = safeQuery($, 'meta[property="og:image"]');
  if (ogImage) {
    const ogImageUrl = getAttr(ogImage, "content");
    if (ogImageUrl && ogImageUrl.trim()) {
      imageUrls.add(ogImageUrl.trim());
      debugLogger?.logSelector('meta[property="og:image"]', true, ogImageUrl);
    }
  } else {
    debugLogger?.logSelector('meta[property="og:image"]', false);
  }

  // Strategy 2: Twitter card image
  const twitterImage = safeQuery($, 'meta[name="twitter:image"]');
  if (twitterImage) {
    const twitterImageUrl = getAttr(twitterImage, "content");
    if (twitterImageUrl && twitterImageUrl.trim()) {
      imageUrls.add(twitterImageUrl.trim());
      debugLogger?.logSelector('meta[name="twitter:image"]', true, twitterImageUrl);
    }
  } else {
    debugLogger?.logSelector('meta[name="twitter:image"]', false);
  }

  // Strategy 3: Extract from JSON-LD structured data
  for (const json of jsonBlobs) {
    if (!json || typeof json !== "object") continue;

    // Handle arrays of JSON-LD objects
    const objects = Array.isArray(json) ? json : [json];
    for (const obj of objects) {
    // Handle Product schema (schema.org)
      const isProduct = obj["@type"] === "Product" ||
        obj["@type"] === "http://schema.org/Product" ||
        obj["@type"] === "https://schema.org/Product" ||
        (Array.isArray(obj["@type"]) && obj["@type"].includes("Product"));

      if (isProduct && obj.image) {
      // Try image field (can be string or array)
        if (typeof obj.image === "string") {
          imageUrls.add(obj.image.trim());
        } else if (Array.isArray(obj.image)) {
          obj.image.forEach((img: any) => {
            if (typeof img === "string") {
              imageUrls.add(img.trim());
            } else if (img && typeof img === "object") {
              if (img.url) imageUrls.add(String(img.url).trim());
              if (img.contentUrl) imageUrls.add(String(img.contentUrl).trim());
            }
          });
        } else if (obj.image && typeof obj.image === "object") {
          if (obj.image.url) imageUrls.add(String(obj.image.url).trim());
          if (obj.image.contentUrl) imageUrls.add(String(obj.image.contentUrl).trim());
      }
    }

    // Handle nested product data (common in e-commerce sites)
      if (obj.product && obj.product.image) {
        const product = obj.product;
        if (typeof product.image === "string") {
          imageUrls.add(product.image.trim());
        } else if (Array.isArray(product.image)) {
          product.image.forEach((img: any) => {
            if (typeof img === "string") {
              imageUrls.add(img.trim());
            } else if (img && typeof img === "object") {
              if (img.url) imageUrls.add(String(img.url).trim());
              if (img.contentUrl) imageUrls.add(String(img.contentUrl).trim());
            }
          });
        }
      }

      // Handle Shopify product JSON structure: { product: { images: [...] } }
      if (obj.product) {
        // Shopify product.images array
        if (obj.product.images && Array.isArray(obj.product.images)) {
          obj.product.images.forEach((img: any) => {
            if (typeof img === "string") {
              imageUrls.add(img.trim());
            } else if (img && typeof img === "object") {
              if (img.src) imageUrls.add(String(img.src).trim());
              if (img.url) imageUrls.add(String(img.url).trim());
              if (img.originalSrc) imageUrls.add(String(img.originalSrc).trim());
            }
          });
        }
        // Shopify product.image (single image object)
        if (obj.product.image && typeof obj.product.image === "object") {
          if (obj.product.image.src) imageUrls.add(String(obj.product.image.src).trim());
          if (obj.product.image.url) imageUrls.add(String(obj.product.image.url).trim());
        }
      }

      // Handle direct images array (some JSON structures)
      if (obj.images && Array.isArray(obj.images)) {
        obj.images.forEach((img: any) => {
        if (typeof img === "string") {
          imageUrls.add(img.trim());
        } else if (img && typeof img === "object") {
          if (img.src) imageUrls.add(String(img.src).trim());
          if (img.url) imageUrls.add(String(img.url).trim());
          if (img.originalSrc) imageUrls.add(String(img.originalSrc).trim());
        }
      });
    }
    }
  }

  const jsonLdImages = Array.from(imageUrls);
  if (jsonLdImages.length > 0) {
    debugLogger?.logImages("JSON-LD", jsonLdImages);
  }

  // Strategy 4: Product-specific image selectors
  const productImageSelectors = [
    ".product-image img",
    ".product__image img",
    ".product__media img",
    ".product-images img",
    "[itemprop='image']",
    ".product-gallery img",
    ".product-photos img",
  ];

  for (const selector of productImageSelectors) {
    const images = findAll($, selector);
    if (images.length > 0) {
      images.forEach((img) => {
        const src = getAttr(img, "src");
        const dataSrc = getAttr(img, "data-src");
        if (src) imageUrls.add(src.trim());
        if (dataSrc) imageUrls.add(dataSrc.trim());
      });
      debugLogger?.logSelector(selector, true, `${images.length} images found`);
    }
  }

  // Strategy 5: Collect from all <img> tags (fallback)
  if (imageUrls.size === 0) {
    const imgTags = findAll($, "img");
    const imgData: Array<{ src: string; width: number; height: number }> = [];

    imgTags.forEach((element) => {
      const src = getAttr(element, "src") || getAttr(element, "data-src");
      if (!src) return;

      const width = parseInt(getAttr(element, "width") || "0", 10);
      const height = parseInt(getAttr(element, "height") || "0", 10);
      const size = width * height;

      imgData.push({ src: src.trim(), width, height });
    });

    // Sort by size (largest first) and take the largest
    imgData.sort((a, b) => b.width * b.height - a.width * a.height);
    if (imgData.length > 0) {
      const largest = imgData[0];
      imageUrls.add(largest.src);
      debugLogger?.logStrategy("Fallback: Largest <img> tag", "success", {
        src: largest.src,
        size: `${largest.width}x${largest.height}`,
      });
    }
  } else {
    // Still collect additional images from <img> tags
    const imgTags = findAll($, "img");
    imgTags.forEach((element) => {
      const src = getAttr(element, "src");
      const dataSrc = getAttr(element, "data-src");
      const srcSet = getAttr(element, "srcset");

      if (src) imageUrls.add(src.trim());
      if (dataSrc) imageUrls.add(dataSrc.trim());
      if (srcSet) {
      // Parse srcset (format: "url1 1x, url2 2x")
        const srcsetUrls = srcSet
        .split(",")
        .map((s: string) => s.trim().split(/\s+/)[0])
        .filter((url: string) => url);
      srcsetUrls.forEach((url: string) => imageUrls.add(url.trim()));
    }
  });
  }

  // Filter out empty strings and invalid URLs, resolve relative URLs
  const validUrls = Array.from(imageUrls)
    .filter((url) => url && url.trim())
    .map((url) => {
      // Resolve relative URLs (basic implementation)
      if (url.startsWith("//")) {
        return `https:${url}`;
      }
      if (url.startsWith("/")) {
        // Would need base URL to resolve properly, but keep as-is for now
        return url;
      }
      return url;
    })
    .filter((url) => url.startsWith("http") || url.startsWith("/"));

  const finalImages = validUrls.slice(0, 10); // Limit to 10 images
  debugLogger?.logImages("Final", finalImages);
  return finalImages;
}

/**
 * Extract ProductShell from FetchResult
 * This is a scaffold function that extracts basic fields only
 * Variants, pricing, and stock are empty shells to be populated later
 *
 * @param fetchResult - Result from fetchProductPage
 * @returns ProductShell with basic extracted fields
 */
export async function extractProductShell(
  fetchResult: FetchResult
): Promise<ProductShell> {
  const notes: string[] = [];
  const debugLogger = new ExtractorDebugLogger(fetchResult.originalURL);

  debugLogger.log("Starting product extraction", {
    url: fetchResult.originalURL,
    finalURL: fetchResult.finalURL,
    mode: fetchResult.modeUsed,
  });

  // Determine which HTML to use (prefer rawHTML, fallback to renderedHTML)
  let htmlToParse =
    fetchResult.rawHTML || fetchResult.renderedHTML || "";

  // Robust empty HTML handling
  if (!htmlToParse || !htmlToParse.trim()) {
    notes.push("No HTML content available — fetcher returned empty result.");
    notes.push("No usable HTML detected.");
    debugLogger.log("No HTML content available");
  }

  // HTML size limit: 10MB to prevent OOM during parsing
  const MAX_HTML_SIZE = 10 * 1024 * 1024; // 10MB
  if (htmlToParse.length > MAX_HTML_SIZE) {
    console.warn(`[Extractor] HTML too large: ${(htmlToParse.length / 1024 / 1024).toFixed(2)} MB, truncating to ${MAX_HTML_SIZE / 1024 / 1024} MB`);
    htmlToParse = htmlToParse.substring(0, MAX_HTML_SIZE);
    notes.push(`HTML truncated from ${(htmlToParse.length / 1024 / 1024).toFixed(2)} MB to ${MAX_HTML_SIZE / 1024 / 1024} MB`);
  }

  // Save HTML dump in debug mode
  debugLogger.saveHtmlDump(htmlToParse);

  // Load DOM with scripts/styles stripped to reduce memory usage
  const $ = loadDom(htmlToParse, { stripScriptsAndStyles: true });
  debugLogger.log("DOM loaded", { htmlLength: htmlToParse.length });

  // Extract embedded JSON first (needed for image extraction)
  const jsonBlobs = extractEmbeddedJson(htmlToParse);
  debugLogger.logJsonLd(jsonBlobs);

  // Check for Shopify JSON
  const hasShopifyJson = jsonBlobs.some((json) => {
    if (!json || typeof json !== "object") return false;
    const objects = Array.isArray(json) ? json : [json];
    return objects.some((obj) => obj.product || obj.products || obj.variants);
  });
  debugLogger.logShopify(hasShopifyJson, hasShopifyJson, { jsonBlobsCount: jsonBlobs.length });

  // Extract basic fields
  debugLogger.logStrategy("Title extraction", "start");
  const title = extractTitle($, jsonBlobs, debugLogger);
  debugLogger.logStrategy("Title extraction", title ? "success" : "fail", { title });

  debugLogger.logStrategy("Description extraction", "start");
  const description = extractDescription($);
  debugLogger.logStrategy("Description extraction", description ? "success" : "fail", { description });

  debugLogger.logStrategy("Image extraction", "start");
  const images = extractImages($, jsonBlobs, debugLogger);
  debugLogger.logStrategy("Image extraction", images.length > 0 ? "success" : "fail", {
    imageCount: images.length,
    images: images.slice(0, 3), // Log first 3
  });

  // Detect dynamic content
  const dynamicContentResult = detectDynamicContent(htmlToParse);
  debugLogger.log("Dynamic content detection", {
    isLikelyDynamic: dynamicContentResult.isLikelyDynamic,
    indicators: dynamicContentResult.indicators,
  });

  // Build VariantExtractionContext for variant extraction
  const variantContext: VariantExtractionContext = {
    $,
    html: htmlToParse,
    jsonBlobs,
    finalURL: fetchResult.finalURL || null,
  };

  // Extract variants using the variant extraction engine
  debugLogger.logStrategy("Variant extraction", "start");
  const variantResult = extractVariants(variantContext);
  debugLogger.logStrategy("Variant extraction", variantResult.variants.length > 0 ? "success" : "fail", {
    variantCount: variantResult.variants.length,
  });

  // Build PriceExtractionContext for price extraction
  const priceContext: PriceExtractionContext = {
    $,
    html: htmlToParse,
    jsonBlobs,
    finalURL: fetchResult.finalURL || null,
  };

  // Extract price using the price extraction engine
  debugLogger.logStrategy("Price extraction", "start");
  const priceResult = extractPrice(priceContext);
  debugLogger.logStrategy("Price extraction", priceResult.price ? "success" : "fail", {
    price: priceResult.price?.amount,
  });

  // Build StockExtractionContext for stock extraction
  const stockContext: StockExtractionContext = {
    $,
    html: htmlToParse,
    jsonBlobs,
    finalURL: fetchResult.finalURL || null,
  };

  // Extract stock using the stock extraction engine
  debugLogger.logStrategy("Stock extraction", "start");
  const stockResult = extractStock(stockContext);
  debugLogger.logStrategy("Stock extraction", stockResult.stock ? "success" : "fail", {
    stock: stockResult.stock?.status,
  });

  // Combine notes from product extraction, variant extraction, price extraction, and stock extraction
  const allNotes = [...notes];
  if (variantResult.notes && variantResult.notes.length > 0) {
    allNotes.push(...variantResult.notes);
  }
  if (priceResult.notes && priceResult.notes.length > 0) {
    allNotes.push(...priceResult.notes);
  }
  if (stockResult.notes && stockResult.notes.length > 0) {
    allNotes.push(...stockResult.notes);
  }

  // Build ProductShell
  const productShell: ProductShell = {
    url: fetchResult.originalURL,
    finalURL: fetchResult.finalURL,
    fetchedAt: fetchResult.fetchedAt,
    title,
    description,
    images,
    rawHTML: fetchResult.rawHTML || "",
    renderedHTML: fetchResult.renderedHTML || null,
    notes: allNotes.length > 0 ? allNotes : undefined,
    variants: variantResult.variants, // Integrated variant extraction results
    pricing: priceResult.price, // Integrated price extraction results
    stock: stockResult.stock, // Integrated stock extraction results
    metadata: {
      isLikelyDynamic: dynamicContentResult.isLikelyDynamic,
      dynamicIndicators: dynamicContentResult.indicators,
      jsonBlobsCount: jsonBlobs.length,
    },
  };

  // Save debug logs
  debugLogger.saveLogs();

  // Log final summary
  debugLogger.log("Extraction complete", {
    title: productShell.title || "MISSING",
    imageCount: productShell.images.length,
    variantCount: productShell.variants.length,
    hasPrice: !!productShell.pricing,
    hasStock: !!productShell.stock,
  });

  return productShell;
}

