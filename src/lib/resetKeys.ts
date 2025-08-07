import redis from "./redis";

// Time to live for the reset key in seconds (20 minutes default)
const REDIS_TTL = process.env.REDIS_TTL ? parseInt(process.env.REDIS_TTL) : 1200;

export async function setResetKey() {
  // Set a Redis key to indicate the counter has been reset due to inactivity
  console.log("Setting reset key in Redis");
  await redis.set("reset_counter", "1", "EX", REDIS_TTL);
}