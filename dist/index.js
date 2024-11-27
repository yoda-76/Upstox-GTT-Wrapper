"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router_1 = require("./router");
const node_http_1 = require("node:http");
let upstoxWS;
const app = (0, express_1.default)();
const server = (0, node_http_1.createServer)(app);
app.use(express_1.default.json());
app.listen(3000, () => {
    (0, router_1.router)(app);
    console.log("Server is running on port 3000");
});
