import axios from "axios";
import { UpstoxBroker } from "../brokers/upstox";
import { OrderDetails, OrderQueue, upstoxOrderDetails } from "../interface";
import { socketRedisClient } from "../lib/redis";
import { extractExpiryAndStrike } from "../utils/extractExpiryAndStrike";

export class Monitor {
    private upstox_access_token: string = "";
    private orderMap: Map<number, OrderQueue> = new Map();
    private currentIndex: number = 1;
    private static instance: Monitor;

    constructor() {}

    public static getInstance(access_token?: string) {
        if (!Monitor.instance) {
            if (!access_token) throw Error("No access token is provided!");
            Monitor.instance = new Monitor();
            Monitor.instance.upstox_access_token = access_token;
            Monitor.instance.socketClientInitialize();
        }
        return Monitor.instance;
    }

    public async socketClientInitialize() {
        socketRedisClient.subscribe("market-data");
        socketRedisClient.on("message", (channel, message) => {
            const ticks = JSON.parse(message);
            
            for (const [orderId, order] of this.orderMap) {
                let ltp: any = undefined;
                if (ticks.feeds[order.brokerOrderDetails.instrument_token]) {
                    ltp = ticks.feeds[order.brokerOrderDetails.instrument_token].ltpc.ltp;
                }
                // console.log(ltp);
                
                if (ltp) {
                    const updatedOrder = { ...order, ltp };
                    this.orderMap.set(orderId, updatedOrder);

                    if (order.status === "OPEN" && 
                        (ltp === order.orderDetails.entryPrice || 
                        (order.orderDetails.entryRange && 
                         ltp >= order.orderDetails.entryRange[0] && 
                         ltp <= order.orderDetails.entryRange[1]))) {
                        this.handleEntryOrder(orderId, order);
                    }
                    else if (order.status === "ENTRY" && 
                            (ltp === order.orderDetails.exitPrice || 
                            (order.orderDetails.exitRange && 
                             ltp >= order.orderDetails.exitRange[0] && 
                             ltp <= order.orderDetails.exitRange[1]))) {
                        this.handleExitOrder(orderId, order);
                    }
                    else if (order.status === "ENTRY" && ltp <= order.orderDetails.stopLoss) {
                        this.handleStopLossOrder(orderId, order);
                    }
                }
            }
        });
    }

    private async handleEntryOrder(orderId: number, order: OrderQueue) {
        const updatedOrder: OrderQueue = { ...order, status: "ENTRY" };
        this.orderMap.set(orderId, updatedOrder);
        
        try {
            const upstoxBroker = UpstoxBroker.getInstance();
            const response = await upstoxBroker.placeOrder(
                this.upstox_access_token, 
                order.brokerOrderDetails, 
                order.orderDetails.baseInstrument
            );
            console.log("entry order placed - Symbol: ", order.orderDetails.baseInstrument,"    LTP: ", updatedOrder.ltp, "     Order ID: ", updatedOrder.orderId);
        } catch (error) {
            console.log("error", error);
            updatedOrder.status = "OPEN";
            this.orderMap.set(orderId, updatedOrder);
        }
    }

    private async handleExitOrder(orderId: number, order: OrderQueue) {
        const updatedOrder: OrderQueue = { ...order, status: "CLOSED" };
        this.orderMap.set(orderId, updatedOrder);
        
        try {
            const upstoxBroker = UpstoxBroker.getInstance();
            const orderData: upstoxOrderDetails = {
                ...order.brokerOrderDetails,
                transaction_type: order.brokerOrderDetails.transaction_type === "BUY" ? "SELL" : "BUY"
            };
            const order_id = await upstoxBroker.placeOrder(
                this.upstox_access_token, 
                orderData, 
                order.orderDetails.baseInstrument
            );
            updatedOrder.brokerExitOrderId = order_id;
            updatedOrder.closedAt = new Date();
            this.orderMap.set(orderId, updatedOrder);
            console.log("exit order placed - Symbol: ", order.orderDetails.baseInstrument,"    LTP: ", updatedOrder.ltp, "     Order ID: ", updatedOrder.orderId);

        } catch (error) {
            console.log(error);
            updatedOrder.status = "ENTRY";
            this.orderMap.set(orderId, updatedOrder);
        }
    }

    private async handleStopLossOrder(orderId: number, order: OrderQueue) {
        const updatedOrder: OrderQueue = { ...order, status: "CLOSED" };
        this.orderMap.set(orderId, updatedOrder);
        
        try {
            const upstoxBroker = UpstoxBroker.getInstance();
            const orderData: upstoxOrderDetails = {
                ...order.brokerOrderDetails,
                transaction_type: order.brokerOrderDetails.transaction_type === "BUY" ? "SELL" : "BUY"
            };
            const order_id = await upstoxBroker.placeOrder(
                this.upstox_access_token, 
                orderData, 
                order.orderDetails.baseInstrument
            );
            updatedOrder.brokerExitOrderId = order_id;
            updatedOrder.closedAt = new Date();
            this.orderMap.set(orderId, updatedOrder);
            console.log("stop loss order placed - Symbol: ", order.orderDetails.baseInstrument,"    LTP: ", updatedOrder.ltp, "     Order ID: ", updatedOrder.orderId);
        } catch (error) {
            console.log(error);
            updatedOrder.status = "ENTRY";
            this.orderMap.set(orderId, updatedOrder);
        }
    }

    public async addOrder(order: OrderDetails) {
        const orderId = this.currentIndex++;
        let expiry: string;
        let instrumentDetails: any;
        let brokerOrderDetails: upstoxOrderDetails;
        let brokerOrderDetailsSL: upstoxOrderDetails;

        if (order.broker === "UPSTOX") {
            const upstoxBroker = UpstoxBroker.getInstance();
            const brokerInstrumentData = upstoxBroker.getInstrumentDataAsObject();
            const data = await this.getInstrumentDetails(
                order, 
                brokerInstrumentData
            ); 
            instrumentDetails = data.instrumentData
            expiry = data.expiry

            // Check for existing active orders for the same instrument
            for (const [_, existingOrder] of this.orderMap) {
                if (existingOrder.brokerOrderDetails.instrument_token === instrumentDetails.instrument_key &&
                    !["CLOSED", "CANCELLED"].includes(existingOrder.status)) {
                    existingOrder.status = "CANCELLED";
                }
            }

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
                ...brokerOrderDetails,
                order_type: "SL-M",
                transaction_type: order.side === "BUY" ? "SELL" : "BUY",
                trigger_price: order.stopLoss
            };
            const newOrder: OrderQueue = {
                orderId,
                orderDetails: {...order, expiry: expiry},
                brokerOrderDetails,
                brokerOrderDetailsSL,
                brokerEntryOrderId: "",
                brokerExitOrderId: "",
                ltp: 0,
                status: "OPEN",
                createdAt: new Date(),
                updatedAt: new Date(),
                closedAt: null,
                closedReason: null,
                pnl: null
            };
            console.log("New Order: ", newOrder);

            this.orderMap.set(orderId, newOrder);

            const resp = await axios.post('http://localhost:3001/subscribe', {
                instrumentKeys: [instrumentDetails.instrument_key]
            });
            
            if (resp.status !== 200) throw new Error(resp.data);
            
            return orderId;
        } else {
            throw new Error('Broker not supported');
        }
    }

    public editOrder(orderId: number, order: {entryPrice: number ;
        exitPrice: number ,
        entryRange: number[] | null,
        exitRange: number[] | null,
        stopLoss: number }) {
        const existingOrder = this.orderMap.get(orderId);
        if (!existingOrder) throw new Error('Order not found');
        existingOrder.orderDetails.entryPrice = order.entryPrice;
        existingOrder.orderDetails.exitPrice = order.exitPrice;
        existingOrder.orderDetails.entryRange = order.entryRange;
        existingOrder.orderDetails.exitRange = order.exitRange;
        existingOrder.orderDetails.stopLoss = order.stopLoss;
        existingOrder.updatedAt = new Date();

        this.orderMap.set(orderId, existingOrder);
        return true
    }

    private async getInstrumentDetails(order: OrderDetails, brokerInstrumentData: any) {
        if (order.instrumentType === "OPT") {
            if (!order.optionType) throw new Error('Option type not found');
            
            const tempExpiryDates: string[] = [];
            Object.keys(brokerInstrumentData[order.exchange][order.baseInstrument]).forEach((op) => {
                const result = extractExpiryAndStrike(op);
                if (!tempExpiryDates.includes(result.expiryDate)) {
                    tempExpiryDates.push(result.expiryDate);
                }
            });
            
            tempExpiryDates.sort((date1: string, date2: string) => 
                new Date(date1).getTime() - new Date(date2).getTime()
            );
            
            const latestExpiryDate = tempExpiryDates[0];
            return {instrumentData:brokerInstrumentData[order.exchange][order.baseInstrument]
                [`${latestExpiryDate} : ${order.strike}`][order.optionType], expiry: latestExpiryDate};
        } else if (order.instrumentType === "EQ") {
            // return brokerInstrumentData[order.exchange].EQUITY[order.baseInstrument];
            return {instrumentData:brokerInstrumentData[order.exchange].EQUITY[order.baseInstrument], expiry: ""};
        }
        
        throw new Error('Invalid instrument type');
    }

    public async cancelOrder(orderId: number) {
        const order = this.orderMap.get(orderId);
        if (!order) throw new Error('Order not found');
        
        if (order.orderDetails.broker === "UPSTOX") {
            const updatedOrder: OrderQueue = { ...order, status: "CANCELLED" };
            this.orderMap.set(orderId, updatedOrder);
        } else {
            throw new Error('Broker not supported');
        }
        
        return { message: `orderId: ${orderId} cancelled` };
    }

    public getOrderQueue() {
        return Array.from(this.orderMap.values());
    }

    public updateOrderStatus(orderId: number, status: "OPEN" | "CLOSED" | "CANCELLED" | "ENTRY") {
        const order = this.orderMap.get(orderId);
        if (!order) throw new Error('Order not found');
        
        const updatedOrder = { ...order, status };
        this.orderMap.set(orderId, updatedOrder);
    }
}