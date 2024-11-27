import Redis from "ioredis";

export const redisClient = new Redis(
  "rediss://default:AeQcAAIjcDE0MjMyYTMzNDEwYzc0Y2ZiOWFkMzk1M2JlZTgwM2IwMHAxMA@helpful-polliwog-58396.upstash.io:6379"
);

export const socketRedisClient = new Redis(
  "redis://127.0.0.1:6379"
);

// const userID = {
//   threadId: 1,
//   tradeBook: [],
//   tradeBookLength: 0,
//   active-child: [uid]
// };
