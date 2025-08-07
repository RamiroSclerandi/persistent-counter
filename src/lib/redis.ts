import Redis from "ioredis";

// Create a Redis client instance with the configuration from environment variables
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 39001,
  password: process.env.REDIS_PASSWORD,
});

export default redis;