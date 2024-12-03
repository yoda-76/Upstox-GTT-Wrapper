import { Express, Request, Response } from "express";
import { OrderDetails, zerodhaOrderDetails } from "./interface";
import { UpstoxBroker } from "./brokers/upstox";
import { Monitor } from "./core/monitor";
import { ZerodhaBroker } from "./brokers/zerodha";

export const router = (app: Express) => {  

    app.post("/monitor-init", async (req: Request, res: Response) => {

        try{
            const {access_token}=req.body
            await  Monitor.getInstance(access_token);
            await UpstoxBroker.getInstance();
            res.send("success");
        }catch(e){
            console.log(e)
            res.status(500).send("error while initializing monitor");
        }
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
            res.status(500).send("error while placing order in upstox");
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
            res.status(500).send("error while getting order queue");
        }
      })

    app.post("/api/get-instrumentData", (req: Request, res: Response) => {
        try {
            const upstoxBroker = UpstoxBroker.getInstance();
            const instrumentData = upstoxBroker.getInstrumentDataAsObject();
            res.json(instrumentData);
        } catch (error) {
            console.log(error)
            res.status(500).send("error while getting instrument data");
        }
      })

    app.get("/kite/auth", async (req: Request, res: Response) => {
        try {
            const { request_token } = req.query;
            const zerodhaBroker = ZerodhaBroker.getInstance();
            const resp=await zerodhaBroker.handleWebhook(request_token as string);
            res.send(resp);
        } catch (error) {
            console.log(error)
            res.status(500).send("error while zerodha authorization");
        }
    })

    app.post("/place-gtt", async (req: Request, res: Response) => {
        try {
            const zerodhaBroker = ZerodhaBroker.getInstance();
            const {orderDetails}:{orderDetails : zerodhaOrderDetails} = req.body
            const response = await zerodhaBroker.placeGTT(orderDetails);
            res.json(response);
        } catch (error) {
            console.log(error)
            res.status(500).send("error while placing gtt");
        }
      })
}   