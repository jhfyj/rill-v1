import { Redis } from "@upstash/redis";

/**
 * Shared Upstash Redis client.
 * Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env.
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const COMPANIES_KEY = "rill:companies";

/**
 * Fetch all companies from Redis.
 * @returns {Promise<Company[]>}
 */
export async function getAllCompanies() {
  const data = await redis.get(COMPANIES_KEY);
  if (!data) return [];
  // Upstash already parses JSON for us
  return Array.isArray(data) ? data : [];
}

/**
 * Persist the full companies array to Redis.
 * @param {Company[]} companies
 */
export async function saveAllCompanies(companies) {
  await redis.set(COMPANIES_KEY, companies);
}
