"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderManager = void 0;
// import { AccountManager } from "./accounts";
const upstox_1 = require("../brokers/upstox");
// import { access } from "fs";
// Add other broker imports as needed
// {index: string, qty: number, price: number, order_type: string, product: string, key: number, transaction_type: string, trigger_price: number}
// interface CustomOrderBook {
//   [accountId: string]: {
//     orders: {
//       [orderId: string]: {
//         orderDetails: any;
//         childOrders: {accountId: string, orderId: string}[]; // Child order IDs
//       };
//     };
//   };
// }
class OrderManager {
    //   private customOrderBook: CustomOrderBook = {};
    // Private constructor for singleton pattern
    constructor() { }
    // Singleton pattern to get the instance of OrderManager
    static getInstance() {
        if (!OrderManager.instance) {
            OrderManager.instance = new OrderManager();
        }
        return OrderManager.instance;
    }
    // Place order in master and child accounts
    async placeOrder(access_token, orderDetails, broker) {
        if (!broker)
            throw new Error("Broker not found for this account");
        const orderId = await this.placeOrderInBroker(access_token, orderDetails, broker);
        // const orderDetailsFromBroker  = await this.getOrderDetailsByOrderId(access_token, orderId, broker); 
        // this.addOrderToOrderBook(access_token, orderId, orderDetailsFromBroker);
        return;
    }
    // private async getPositionByOrderDetails(accountId: string, orderDetails: OrderDetails) {
    //   const upstoxBroker = UpstoxBroker.getInstance();
    //   const position = await upstoxBroker.getPositionByOrderDetails(accountId, orderDetails);
    //   // console.log("positions from broker", position);
    //   return position;
    // }
    async getOrderDetailsByOrderId(access_token, orderId, broker) {
        let orderDetails;
        switch (broker) {
            case "UPSTOCKS":
                const upstoxBroker = upstox_1.UpstoxBroker.getInstance();
                orderDetails = await upstoxBroker.getOrderDetailsByOrderId(access_token, orderId);
                console.log("order in upstox", orderDetails);
                return orderDetails;
            //   // Add cases for other brokers
            //   case "ZERODHA":
            //     const angelBroker = AngelOne.getInstance();
            //     orderDetails = await angelBroker.getOrderDetailsByOrderId(accountId, orderId);
            //     console.log("order in angel", orderDetails);
            //     return orderDetails;
            default:
                throw new Error("Broker not supported");
        }
    }
    // Helper method to place order with broker
    async placeOrderInBroker(access_token, orderDetails, broker) {
        let order_id = "";
        try {
            switch (broker) {
                case "UPSTOCKS":
                    const upstoxBroker = upstox_1.UpstoxBroker.getInstance();
                    order_id = await upstoxBroker.placeOrder(access_token, orderDetails);
                    console.log("order in upstox");
                    return order_id;
                // case "ZERODHA":
                //   const angelBroker = AngelOne.getInstance();
                //   order_id = await angelBroker.placeOrder(accountId, orderDetails);
                //   console.log("order in angel");
                //   return order_id;
                // Add cases for other brokers
                default:
                    throw new Error("Broker not supported");
            }
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    // Add order to custom order book
    //   private addOrderToOrderBook(access_token: string, orderId: string, orderDetails: any): void {
    //     //fetch this order from broker
    //     //convert it to base
    //     //add it to custom order book
    //     if (!this.customOrderBook[accountId]) {
    //       this.customOrderBook[accountId] = { orders: {} };
    //     }
    //     this.customOrderBook[accountId].orders[orderId] = {
    //       orderDetails,
    //       childOrders: []
    //     };
    //   }
    // Add child order to existing master order in the order book
    //   private addChildOrderToOrderBook(masterAccountId: string, childAccountId: string, masterOrderId: string, childOrderId: string): void {
    //     const masterOrder = this.customOrderBook[masterAccountId]?.orders[masterOrderId];
    //     if (masterOrder) {
    //       masterOrder.childOrders.push({accountId:childAccountId , orderId: childOrderId});
    //     }
    //   }
    //   private updateOrderDetailsInOrderBook(accountId: string, orderId: string, orderDetails: any) {
    //     const order = this.customOrderBook[accountId]?.orders[orderId];
    //     if (order) {
    //       order.orderDetails = orderDetails;
    //     }
    //   }
    // Cancel an order in master and child accounts
    //   public async cancelOrder(accountId: string, orderId: string): Promise<void> {
    //     const accountManager = AccountManager.getInstance();
    //     const broker = accountManager.getBroker(accountId);
    //     if (!broker) throw new Error("Broker not found for this account");
    //     await this.cancelOrderInBroker(accountId, orderId, broker);
    //     // Cancel child orders
    //     const childOrders = this.customOrderBook[accountId]?.orders[orderId]?.childOrders;
    //     if (childOrders) {
    //       for (const childOrder of childOrders) {
    //         await this.cancelOrderInBroker(childOrder.accountId, childOrder.orderId, broker);
    //       }
    //     }
    //     const newOrderDetails = await this.getOrderDetailsByOrderId(accountId, orderId, broker);
    //     this.updateOrderDetailsInOrderBook(accountId, orderId, newOrderDetails);
    //     return 
    //     // this.removeOrderFromOrderBook(accountId, orderId);//update orderbook insted of removing the cancelled orders
    //   }
    // Helper method to cancel order with broker
    //   private async cancelOrderInBroker(accountId: string, orderId: string, broker: "UPSTOCKS" | "DHAN" | "ANGEL" | "ESPRESSO"): Promise<void> {
    //     switch (broker) {
    //       case "UPSTOCKS":
    //         const upstoxBroker = UpstoxBroker.getInstance();
    //         return await upstoxBroker.cancelOrder(accountId, orderId);
    //       case "DHAN":
    //         const dhanBroker = DhanBroker.getInstance();
    //         return await dhanBroker.cancelOrder(accountId, orderId);
    //       // Add cases for other brokers
    //       default:
    //         throw new Error("Broker not supported");
    //     }
    //   }
    // Remove an order from custom order book
    // private removeOrderFromOrderBook(accountId: string, orderId: string): void {
    //   delete this.customOrderBook[accountId]?.orders[orderId];
    // }
    // Cancel all orders for a master and child accounts
    //   public async cancelAllOrders(accountId: string): Promise<void> {
    //     const accountOrders = this.customOrderBook[accountId]?.orders;
    //     console.log(accountOrders);
    //     if (accountOrders) {
    //       for (const orderId of Object.keys(accountOrders)) {
    //         // inclued a check where we see if the order is not already cancelled
    //         await this.cancelOrder(accountId, orderId);
    //       }
    //     }
    //   }
    //   public async getOrderBook(accountId: string): Promise<any> {
    //     const accountOrders = this.customOrderBook[accountId]?.orders;
    //     if (accountOrders) {
    //       return accountOrders;
    //     }
    //     return {};
    //   }
    //   private async persistOrderbook(accountId: string): Promise<void> {
    //     const accountOrders = this.customOrderBook[accountId]?.orders;
    //     if (accountOrders) {
    //       this.customOrderBook[accountId].orders = accountOrders;
    //     }
    //     Object.keys(accountOrders).forEach(async (key) => {
    //       const orderDetails = accountOrders[key].orderDetails;
    //       const childOrders = accountOrders[key].childOrders;
    //       await dbClient.persistOrderbook(accountId, key, orderDetails, childOrders);
    //     })
    //     //save to db
    //   }
    // Exit a single position based on account ID and instrument identifier
    async exitSinglePosition(access_token, position, broker, ltp) {
        // if(position.netQty === 0 || position.netQty === "0" ) return;
        // //convert position into orderDetail
        // const orderDetails: OrderDetails = {
        //   baseInstrument: position.baseInstrument,
        //   instrumentType: position.instrumentType==="PE" || position.instrumentType==="CE" || position.instrumentType==="OPTIDX"? "OPT" : "EQ",
        //   expiry: position.expiry,
        //   strike: position.strike,
        //   optionType: position.optionType,
        //   exchange: position.exchange==="NFO"?"NSE":position.exchange==="BFO"?"BSE":position.exchange,
        //   qty: position.netQty, 
        //   entryPrice: ltp, 
        //   stopLoss: 0, 
        //   orderType: position.exchange==="BFO"?"LIMIT":"MARKET", 
        //   side: position.netQty<0?"BUY":"SELL",
        //   productType: position.product
        // }
        // const order = this.placeOrder(access_token, orderDetails, broker);
    }
    // Exit all positions for master and child accounts
    async exitAllPositions(accountId) {
        // const accountManager = AccountManager.getInstance();
        // const broker = accountManager.getBroker(accountId);
        //CALL EXIT ALL POSITIONS API
        console.log(`Exiting all positions for account ${accountId}`);
    }
    async getPositions(access_token, broker) {
        if (broker === "UPSTOCKS") {
            const upstoxBroker = upstox_1.UpstoxBroker.getInstance();
            const position = await upstoxBroker.getPositions(access_token);
            return position;
        }
        // else if(account.broker === "ZERODHA"){
        //   const upstoxBroker = UpstoxBroker.getInstance();
        //   const position = await upstoxBroker.getPositions(access_token);
        //   return position;
        // }
        else {
            throw new Error('Broker not supported');
        }
    }
}
exports.OrderManager = OrderManager;
