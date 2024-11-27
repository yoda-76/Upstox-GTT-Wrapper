import express from "express";
import { router } from "./router";
import { Server } from "socket.io";
import { createServer } from "node:http";
import { redisClient } from "./lib/redis";

let upstoxWS: any;


const app = express();
const server = createServer(app);
app.use(express.json());



app.listen(3000, () => {
    router(app)
    console.log("Server is running on port 3000");
});


  