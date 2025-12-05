export { query, withTransaction, getPool, closePool } from "./client.js";
export { BaseRepository } from "./baseRepository.js";
export { ProductRepository } from "./repositories/productRepository.js";
export { VariantRepository } from "./repositories/variantRepository.js";
export type {
  DBProduct,
  DBVariant,
  CreateProductInput,
  CreateVariantInput,
} from "./types.js";





