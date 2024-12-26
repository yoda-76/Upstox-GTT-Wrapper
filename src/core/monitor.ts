import axios from "axios";
import { UpstoxBroker } from "../brokers/upstox";
import { OrderDetails, OrderQueue, upstoxOrderDetails } from "../interface";
import { socketRedisClient } from "../lib/redis";
import { extractExpiryAndStrike } from "../utils/extractExpiryAndStrike";
export class Monitor {
    // private static Socket:any;
    private upstox_access_token:string="";
    private orderQueue: OrderQueue[] = [];
    private orderMap: Map<string, OrderQueue> = new Map();
    private currentIndex: number = 0;
    private static instance: Monitor;
    constructor() {}
    public static getInstance(access_token?:string) {
        if(!Monitor.instance) { 
            if(!access_token) throw Error("No access token is provided!")
            Monitor.instance = new Monitor();
            Monitor.instance.upstox_access_token=access_token;
            Monitor.instance.socketClientInitialize();
        }
        return Monitor.instance;
    }

    public async socketClientInitialize() {
        socketRedisClient.subscribe("market-data");
        socketRedisClient.on("message", (channel, message) => {
        const ticks = JSON.parse(message);
        // console.log(ticks);
        this.orderQueue.forEach(async (order) => {
            //updatxing order queue ltp
            let ltp:any=undefined;
            if(ticks.feeds[order.brokerOrderDetails.instrument_token]) ltp=ticks.feeds[order.brokerOrderDetails.instrument_token].ltpc.ltp;
            if(ltp){
                this.orderQueue[order.orderId].ltp = ltp
                //if either entry or exit condition is met, place order accordingly
                if(order.status === "OPEN" && (ltp===order.orderDetails.entryPrice || (order.orderDetails.entryRange && ltp >= order.orderDetails.entryRange[0] && ltp <= order.orderDetails.entryRange[1]))){
                    //place entry order (SL)
                    console.log("place entry order (SL)")
                    this.orderQueue[order.orderId].status = "ENTRY";
                    try {
                        const upstoxBroker = UpstoxBroker.getInstance();
                        const response = await upstoxBroker.placeOrder(this.upstox_access_token, order.brokerOrderDetails, order.orderDetails.baseInstrument);
                    } catch (error) {
                        console.log("error", error);
                        this.orderQueue[order.orderId].status = "OPEN";
                    }

                }
                else if(order.status === "ENTRY" && (ltp===order.orderDetails.exitPrice || (order.orderDetails.exitRange && ltp >= order.orderDetails.exitRange[0] && ltp <= order.orderDetails.exitRange[1]))){
                    //[TODO] check position status of that perticular instrument
                    //place exit order
                    console.log("TARGET HIT")
                    this.orderQueue[order.orderId].status = "CLOSED";
                    try {
                        const upstoxBroker = UpstoxBroker.getInstance();
                        const orderData:upstoxOrderDetails = {...order.brokerOrderDetails,transaction_type:order.brokerOrderDetails.transaction_type==="BUY"?"SELL":"BUY"}
                        const order_id = await upstoxBroker.placeOrder(this.upstox_access_token, orderData, order.orderDetails.baseInstrument);
                        this.orderQueue[order.orderId].brokerExitOrderId = order_id;
                        this.orderQueue[order.orderId].closedAt = new Date();
                    } catch (error) {
                        console.log(error)
                        this.orderQueue[order.orderId].status = "ENTRY";
                    }
    
                    
                }
                else if(order.status === "ENTRY" && ltp<=order.orderDetails.stopLoss){
                    console.log("SL HIT")
                    this.orderQueue[order.orderId].status = "CLOSED";
                    try {
                        const upstoxBroker = UpstoxBroker.getInstance();
                        const orderData:upstoxOrderDetails = {...order.brokerOrderDetails,transaction_type:order.brokerOrderDetails.transaction_type==="BUY"?"SELL":"BUY"}
                        const order_id = await upstoxBroker.placeOrder(this.upstox_access_token, orderData, order.orderDetails.baseInstrument);
                        this.orderQueue[order.orderId].brokerExitOrderId = order_id;
                        this.orderQueue[order.orderId].closedAt = new Date();
                    } catch (error) {
                        console.log(error)
                        this.orderQueue[order.orderId].status = "ENTRY";
                    }
                }
            } 
        })

        });
    }

    

    public async addOrder(order: OrderDetails) {

        //TODO: validate order
        
        // console.log(order)
        const orderId = this.currentIndex++
        let instrumentDetails:any;
        let brokerOrderDetails:upstoxOrderDetails;
        let brokerOrderDetailsSL:upstoxOrderDetails;

        // get broker specific data and store it too in orderQueue so that when we need to place order it wont waste time to search it from broker's instrumentData.
        if(order.broker === "UPSTOX"){
            const upstoxBroker = UpstoxBroker.getInstance();
            const brokerInstrumentData = upstoxBroker.getInstrumentDataAsObject();
            if(order.instrumentType === "OPT"){
                if(!order.optionType) return new Error('Option type not found');
                const tempExpiryDates:string[] = [];
                Object.keys(brokerInstrumentData[order.exchange][order.baseInstrument]).map((op) => {
                    const result = extractExpiryAndStrike(op);
                    if (!tempExpiryDates.includes(result.expiryDate))
                        tempExpiryDates.push(result.expiryDate);
                    });
                    tempExpiryDates.sort((date1: string, date2: string) => new Date(date1).getTime() - new Date(date2).getTime());
                    const latestExpiryDate = tempExpiryDates[0];


                instrumentDetails = brokerInstrumentData[order.exchange][order.baseInstrument][`${latestExpiryDate} : ${order.strike}`][order.optionType];
            }
            else if(order.instrumentType === "EQ"){
                instrumentDetails = brokerInstrumentData[order.exchange].EQUITY[order.baseInstrument];
            }
            //TODO: check if order already exists, if yes add to quantity, do not add a second order

            const existingOrder = this.orderQueue.filter(o=>(o.brokerOrderDetails.instrument_token === instrumentDetails.instrument_key));
            if(existingOrder[0]){
                existingOrder.map(o=>{
                    if(!(o.status==="CLOSED" || o.status==="CANCELLED")){ 
                        this.orderQueue[o.orderId].status = "CANCELLED"
                    }
                })
            }else{
            }
            brokerOrderDetails={
                quantity: order.qty,
                product:  order.productType,
                validity: "DAY",
                price: 0,
                tag: "string",
                instrument_token: instrumentDetails.instrument_key,
                order_type: "MARKET",
                transaction_type: order.side,
                disclosed_quantity: 0,
                trigger_price: 0,
                is_amo: false
            }
            brokerOrderDetailsSL={
                quantity: order.qty,
                product:  order.productType,
                validity: "DAY",
                price: 0,
                tag: "string",
                instrument_token: instrumentDetails.instrument_key,
                order_type: "SL-M",
                transaction_type: order.side === "BUY" ? "SELL" : "BUY",
                disclosed_quantity: 0,
                trigger_price: order.stopLoss,
                is_amo: false
              }

              this.orderQueue.push({
                orderId,
                orderDetails: order,
                brokerOrderDetails: brokerOrderDetails,
                brokerOrderDetailsSL: brokerOrderDetailsSL,
                brokerEntryOrderId: "", 
                brokerExitOrderId: "",
                ltp:0,
                status: "OPEN",
                createdAt: new Date(),
                updatedAt: new Date(),
                closedAt: null,
                closedReason: null,
                pnl: null
            });
            console.log("order queue: ", this.orderQueue)
            
            
            
        }else{
            throw new Error('Broker not supported');
        }

        

        const resp= await axios.post('http://localhost:3001/subscribe', {instrumentKeys:[instrumentDetails.instrument_key]});
            if(resp.status !== 200) throw new Error(resp.data);
        return orderId
    }

    public async cancelOrder(orderId: number) {
        if(!this.orderQueue[0]) throw new Error('Order Queue is Empty');
        const order = this.orderQueue[orderId];
        if(!order) throw new Error('Order not found');
        if(order.orderDetails.broker === "UPSTOX"){
            // const upstoxBroker = UpstoxBroker.getInstance();
            // await upstoxBroker.cancelOrder(order.brokerOrderDetails.instrument_token, order.brokerOrderDetails.order_id);
            this.orderQueue[orderId].status = "CANCELLED";
        }
        else{
            throw new Error('Broker not supported');
        }
        return {message:`orderId: ${orderId} cancelled`};
    }

    public getOrderQueue() {
        return this.orderQueue;
    }

    public updateOrderStatus(orderId: number, status: "OPEN" | "CLOSED" | "CANCELLED" | "ENTRY") {
        this.orderQueue[orderId].status = status;
    }   

}




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