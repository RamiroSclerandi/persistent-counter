import redis from "./redis";

export async function setResetKey() {
  // Set a Redis key to indicate the counter has been reset due to inactivity
  console.log("Setting reset key in Redis");
  await redis.set("reset_counter", "1", "EX", 1200);
}