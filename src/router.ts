import { Express, Request, Response } from "express";
import { OrderDetails } from "./interface";
import { OrderQueue } from "./interface";
import { UpstoxBroker } from "./brokers/upstox";
import { Monitor } from "./core/monitor";

export const router = (app: Express) => {  

    app.post("/monitor-init", async (req: Request, res: Response) => {

        try{
            const {access_token}=req.body
            await  Monitor.getInstance(access_token);
            await UpstoxBroker.getInstance();
        res.send("success");}catch(e){console.log(e)}
    })

    app.post("/place-order", (req: Request, res: Response) => {
        try {
            console.log(req.body)
            const {orderDetails, access_token}:{orderDetails : OrderDetails, access_token:string} = req.body
            const monitor = Monitor.getInstance(access_token);
            monitor.addOrder(orderDetails);
            res.send("success");
        } catch (error) {
            console.log(error)
            res.status(500).send("error");
        }
    });

    app.post("/get-orderQueue", (req: Request, res: Response) => {
        try {
            const {access_token}=req.body
            const monitor = Monitor.getInstance(access_token);
            const orderQueue = monitor.getOrderQueue();
            res.json(orderQueue);
        } catch (error) {
            console.log(error)
        }
      })

    app.post("/api/get-instrumentData", (req: Request, res: Response) => {
        
        const upstoxBroker = UpstoxBroker.getInstance();
        const instrumentData = upstoxBroker.getInstrumentDataAsObject();
        res.json(instrumentData);
      })
}   