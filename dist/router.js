"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const upstox_1 = require("./brokers/upstox");
const monitor_1 = require("./core/monitor");
const zerodha_1 = require("./brokers/zerodha");
const router = (app) => {
    app.post("/monitor-init", async (req, res) => {
        try {
            const { access_token } = req.body;
            await monitor_1.Monitor.getInstance(access_token);
            await upstox_1.UpstoxBroker.getInstance();
            res.send("success");
        }
        catch (e) {
            console.log(e);
            res.status(500).send("error while initializing monitor");
        }
    });
    app.post("/place-order", (req, res) => {
        try {
            console.log(req.body);
            const { orderDetails, access_token } = req.body;
            const monitor = monitor_1.Monitor.getInstance(access_token);
            monitor.addOrder(orderDetails);
            res.send("success");
        }
        catch (error) {
            console.log(error);
            res.status(500).send("error while placing order in upstox");
        }
    });
    app.post("/get-orderQueue", (req, res) => {
        try {
            const { access_token } = req.body;
            const monitor = monitor_1.Monitor.getInstance(access_token);
            const orderQueue = monitor.getOrderQueue();
            res.json(orderQueue);
        }
        catch (error) {
            console.log(error);
            res.status(500).send("error while getting order queue");
        }
    });
    app.post("/api/get-instrumentData", (req, res) => {
        try {
            const upstoxBroker = upstox_1.UpstoxBroker.getInstance();
            const instrumentData = upstoxBroker.getInstrumentDataAsObject();
            res.json(instrumentData);
        }
        catch (error) {
            console.log(error);
            res.status(500).send("error while getting instrument data");
        }
    });
    app.get("/kite/auth", async (req, res) => {
        try {
            const { request_token } = req.query;
            const zerodhaBroker = zerodha_1.ZerodhaBroker.getInstance();
            const resp = await zerodhaBroker.handleWebhook(request_token);
            res.send(resp);
        }
        catch (error) {
            console.log(error);
            res.status(500).send("error while zerodha authorization");
        }
    });
    app.post("/place-gtt", async (req, res) => {
        try {
            const zerodhaBroker = zerodha_1.ZerodhaBroker.getInstance();
            const { orderDetails } = req.body;
            const response = await zerodhaBroker.placeGTT(orderDetails);
            res.json(response);
        }
        catch (error) {
            console.log(error);
            res.status(500).send("error while placing gtt");
        }
    });
};
exports.router = router;
