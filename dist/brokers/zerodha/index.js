"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZerodhaBroker = void 0;
const kiteconnect_1 = require("kiteconnect");
class ZerodhaBroker {
    constructor() {
    }
    // Singleton pattern
    static getInstance() {
        if (!ZerodhaBroker.instance) {
            ZerodhaBroker.instance = new ZerodhaBroker();
        }
        return ZerodhaBroker.instance;
    }
    // Handle access token received via webhook
    async handleWebhook(request_token) {
        try {
            const kc = new kiteconnect_1.KiteConnect({ api_key: ZerodhaBroker.api_key });
            const response = await kc.generateSession(request_token, ZerodhaBroker.api_secret);
            kc.setAccessToken(response.access_token);
            this.kc = kc;
            console.log("Session generated:", response);
            return `Access token stored successfully.`;
        }
        catch (error) {
            console.error("Error in handleWebhook:", error);
            throw new Error("Error authorizing with Upstox : .Controllers/Authorization: handleWebhook");
        }
    }
    async placeGTT(orderDetails) {
        const orders = orderDetails.orders.map((order) => {
            return ({
                transaction_type: order.transaction_type === "BUY" ? this.kc.TRANSACTION_TYPE_BUY : this.kc.TRANSACTION_TYPE_SELL,
                quantity: order.quantity,
                product: this.kc.PRODUCT_CNC,
                order_type: this.kc.ORDER_TYPE_LIMIT,
                price: order.price
            });
        });
        try {
            const gtt = await this.kc.placeGTT({
                trigger_type: this.kc.GTT_TYPE_OCO,
                tradingsymbol: orderDetails.tradingsymbol,
                exchange: orderDetails.exchange,
                trigger_values: orderDetails.trigger_values,
                last_price: orderDetails.last_price,
                orders
            });
            console.log('GTT Placed:', gtt);
        }
        catch (err) {
            console.error('Error placing GTT:', err);
        }
    }
    async getProfile() {
        try {
            const profile = await this.kc.profile();
            console.log("Profile:", profile);
            return profile;
        }
        catch (err) {
            console.error("Error getting profile:", err);
        }
    }
    isAuthenticated(accountId) {
        if (!this.kc)
            return false;
        return true;
    }
}
exports.ZerodhaBroker = ZerodhaBroker;
ZerodhaBroker.instance = null;
ZerodhaBroker.api_key = "KITE-API-KEY";
ZerodhaBroker.api_secret = "KITE-API-SECRET";
