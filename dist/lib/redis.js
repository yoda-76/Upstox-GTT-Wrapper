"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketRedisClient = exports.redisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
exports.redisClient = new ioredis_1.default("rediss://default:AeQcAAIjcDE0MjMyYTMzNDEwYzc0Y2ZiOWFkMzk1M2JlZTgwM2IwMHAxMA@helpful-polliwog-58396.upstash.io:6379");
exports.socketRedisClient = new ioredis_1.default("redis://127.0.0.1:6379");
// const userID = {
//   threadId: 1,
//   tradeBook: [],
//   tradeBookLength: 0,
//   active-child: [uid]
// };
