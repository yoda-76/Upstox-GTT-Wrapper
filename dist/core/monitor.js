"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Monitor = void 0;
const axios_1 = __importDefault(require("axios"));
const upstox_1 = require("../brokers/upstox");
const redis_1 = require("../lib/redis");
// const upstox_access_token=process.env.UPSTOX_ACCESS_TOKEN || "eyJ0eXAiOiJKV1QiLCJrZXlfaWQiOiJza192MS4wIiwiYWxnIjoiSFMyNTYifQ.eyJzdWIiOiJLTDI3NzAiLCJqdGkiOiI2NzQ2ZDg1MDU4Y2Q2NzM1N2IzMjY2NTAiLCJpc011bHRpQ2xpZW50IjpmYWxzZSwiaWF0IjoxNzMyNjk2MTQ0LCJpc3MiOiJ1ZGFwaS1nYXRld2F5LXNlcnZpY2UiLCJleHAiOjE3MzI3NDQ4MDB9.kzn4naH8DRTcHqt4QGwRTMujronP_a-JGz68Lurgqv4"
class Monitor {
    constructor() {
        // private static Socket:any;
        this.upstox_access_token = "";
        this.orderQueue = [];
        this.orderMap = new Map();
        this.currentIndex = 0;
    }
    static getInstance(access_token) {
        if (!Monitor.instance) {
            if (!access_token)
                throw Error("No access token is provided!");
            Monitor.instance = new Monitor();
            Monitor.instance.upstox_access_token = access_token;
            Monitor.instance.socketClientInitialize();
            axios_1.default.post('http://localhost:3001/market-feed-init', { access_token });
        }
        return Monitor.instance;
    }
    async socketClientInitialize() {
        redis_1.socketRedisClient.subscribe("market-data");
        redis_1.socketRedisClient.on("message", (channel, message) => {
            const ticks = JSON.parse(message);
            // console.log(ticks);
            this.orderQueue.forEach(async (order) => {
                //updating order queue ltp
                const ltp = ticks.feeds[order.brokerOrderDetails.instrument_token].ltpc.ltp;
                if (ltp) {
                    this.orderQueue[order.orderId].ltp = ltp;
                    //if either entry or exit condition is met, place order accordingly
                    if (order.status === "OPEN" && (ltp === order.orderDetails.entryPrice || (order.orderDetails.entryRange && ltp >= order.orderDetails.entryRange[0] && ltp <= order.orderDetails.entryRange[1]))) {
                        //place entry order (SL)
                        console.log("place entry order (SL)");
                        this.orderQueue[order.orderId].status = "ENTRY";
                        try {
                            const upstoxBroker = upstox_1.UpstoxBroker.getInstance();
                            const response = await upstoxBroker.placeOrder(this.upstox_access_token, order.brokerOrderDetails, order.orderDetails.baseInstrument);
                        }
                        catch (error) {
                            console.log("error", error);
                            this.orderQueue[order.orderId].status = "OPEN";
                        }
                    }
                    else if (order.status === "ENTRY" && (ltp === order.orderDetails.exitPrice || (order.orderDetails.exitRange && ltp >= order.orderDetails.exitRange[0] && ltp <= order.orderDetails.exitRange[1]))) {
                        //place exit order
                        console.log("TARGET HIT");
                        const upstoxBroker = upstox_1.UpstoxBroker.getInstance();
                        const orderData = { ...order.brokerOrderDetails, transaction_type: order.brokerOrderDetails.transaction_type === "BUY" ? "SELL" : "BUY" };
                        const order_id = await upstoxBroker.placeOrder(this.upstox_access_token, orderData, order.orderDetails.baseInstrument);
                        this.orderQueue[order.orderId].brokerExitOrderId = order_id;
                        this.orderQueue[order.orderId].closedAt = new Date();
                        this.orderQueue[order.orderId].status = "CLOSED";
                    }
                    else if (order.status === "ENTRY" && ltp <= order.orderDetails.stopLoss) {
                        console.log("SL HIT");
                        const upstoxBroker = upstox_1.UpstoxBroker.getInstance();
                        const orderData = { ...order.brokerOrderDetails, transaction_type: order.brokerOrderDetails.transaction_type === "BUY" ? "SELL" : "BUY" };
                        const order_id = await upstoxBroker.placeOrder(this.upstox_access_token, orderData, order.orderDetails.baseInstrument);
                        this.orderQueue[order.orderId].brokerExitOrderId = order_id;
                        this.orderQueue[order.orderId].closedAt = new Date();
                        this.orderQueue[order.orderId].status = "CLOSED";
                    }
                }
            });
        });
    }
    async addOrder(order) {
        //TODO: validate order
        console.log(order);
        const orderId = this.currentIndex++;
        let instrumentDetails;
        let brokerOrderDetails;
        let brokerOrderDetailsSL;
        // get broker specific data and store it too in orderQueue so that when we need to place order it wont waste time to search it from broker's instrumentData.
        if (order.broker === "UPSTOX") {
            const upstoxBroker = upstox_1.UpstoxBroker.getInstance();
            const brokerInstrumentData = upstoxBroker.getInstrumentDataAsObject();
            if (order.instrumentType === "OPT") {
                if (!order.optionType)
                    return new Error('Option type not found');
                instrumentDetails = brokerInstrumentData[order.exchange][order.baseInstrument][`${order.expiry} : ${order.strike}.0`][order.optionType];
                console.log(instrumentDetails);
            }
            else if (order.instrumentType === "EQ") {
                instrumentDetails = brokerInstrumentData[order.exchange].EQUITY[order.baseInstrument];
            }
            //TODO: check if order already exists, if yes add to quantity, do not add a second order
            const existingOrder = this.orderQueue.filter(o => (o.brokerOrderDetails.instrument_token === instrumentDetails.instrument_key));
            if (existingOrder[0]) {
                console.log("c1");
                if (existingOrder[0].status === "OPEN") {
                    console.log("c2");
                    const orignalQty = this.orderQueue[existingOrder[0].orderId].orderDetails.qty;
                    this.orderQueue[existingOrder[0].orderId].orderDetails.qty = orignalQty + order.qty;
                    this.orderQueue[existingOrder[0].orderId].brokerOrderDetails.quantity = orignalQty + order.qty;
                    this.orderQueue[existingOrder[0].orderId].brokerOrderDetailsSL.quantity = orignalQty + order.qty;
                }
                else if (existingOrder[0] && existingOrder[0].status === "ENTRY") {
                    throw Error("Order with this instrument already exist and is executed on broker");
                }
            }
            else {
                console.log("c3");
                brokerOrderDetails = {
                    quantity: order.qty,
                    product: order.productType,
                    validity: "DAY",
                    price: 0,
                    tag: "string",
                    instrument_token: instrumentDetails.instrument_key,
                    order_type: "MARKET",
                    transaction_type: order.side,
                    disclosed_quantity: 0,
                    trigger_price: 0,
                    is_amo: false
                };
                brokerOrderDetailsSL = {
                    quantity: order.qty,
                    product: order.productType,
                    validity: "DAY",
                    price: 0,
                    tag: "string",
                    instrument_token: instrumentDetails.instrument_key,
                    order_type: "SL-M",
                    transaction_type: order.side === "BUY" ? "SELL" : "BUY",
                    disclosed_quantity: 0,
                    trigger_price: order.stopLoss,
                    is_amo: false
                };
                this.orderQueue.push({
                    orderId,
                    orderDetails: order,
                    brokerOrderDetails: brokerOrderDetails,
                    brokerOrderDetailsSL: brokerOrderDetailsSL,
                    brokerEntryOrderId: "",
                    brokerExitOrderId: "",
                    ltp: 0,
                    status: "OPEN",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    closedAt: null,
                    closedReason: null,
                    pnl: null
                });
                console.log("order queue: ", this.orderQueue);
            }
        }
        else {
            throw new Error('Broker not supported');
        }
        const resp = await axios_1.default.post('http://localhost:3001/subscribe', { instrumentKeys: [instrumentDetails.instrument_key] });
        if (resp.status !== 200)
            throw new Error(resp.data);
    }
    getOrderQueue() {
        return this.orderQueue;
    }
    updateOrderStatus(orderId, status) {
        this.orderQueue[orderId].status = status;
    }
}
exports.Monitor = Monitor;
// if("order has reached my systed but entry is not placed" AND "either ltp is equal to entryPrice" OR "ltp is between entryRange"){){
//     place entry order (SL-Market)
// }
// else if("Entry SL-Market order is placed" && ("either ltp is equal to exitPrice/Target" OR "ltp is between exitRange") ){
//     place exit order
//     cancel entry order
// }
// else if("Entry SL-Market order is placed" AND  "ltp is less than or equal to stopLoss"){
//     check order status on broker to confirm the position is exited and update order status ( prevent exit order if the sl is hit )
// }
