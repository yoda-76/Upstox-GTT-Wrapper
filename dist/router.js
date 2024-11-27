"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const upstox_1 = require("./brokers/upstox");
const monitor_1 = require("./core/monitor");
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
            res.status(500).send("error");
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
        }
    });
    app.post("/api/get-instrumentData", (req, res) => {
        const upstoxBroker = upstox_1.UpstoxBroker.getInstance();
        const instrumentData = upstoxBroker.getInstrumentDataAsObject();
        res.json(instrumentData);
    });
};
exports.router = router;
