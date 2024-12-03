import { GTTDetails, zerodhaOrderDetails } from '../../interface';
import { KiteConnect } from 'kiteconnect';

export class ZerodhaBroker {
  private  kc: any;
  private static instance: ZerodhaBroker | null = null;
  private static api_key: string = "KITE-API-KEY";
  private static api_secret: string = "KITE-API-SECRET";

  private constructor() {
}

// Singleton pattern
  public static getInstance(): ZerodhaBroker {
    if (!ZerodhaBroker.instance) {
      ZerodhaBroker.instance = new ZerodhaBroker();
    }
    return ZerodhaBroker.instance;
  }

  // Handle access token received via webhook
  public async handleWebhook(request_token: string): Promise<string> {
    try {
        const kc = new KiteConnect({ api_key: ZerodhaBroker.api_key });
        const response = await kc.generateSession(request_token, ZerodhaBroker.api_secret);
        kc.setAccessToken(response.access_token);
        this.kc = kc;
        console.log("Session generated:", response);
        return `Access token stored successfully.`
    } catch (error) {
        console.error("Error in handleWebhook:", error);
        throw new Error("Error authorizing with Upstox : .Controllers/Authorization: handleWebhook");
    }
  }


  public async placeGTT(orderDetails: zerodhaOrderDetails) {
    const orders = orderDetails.orders.map((order:GTTDetails) => {
        return ({
            transaction_type: order.transaction_type==="BUY"?this.kc.TRANSACTION_TYPE_BUY:this.kc.TRANSACTION_TYPE_SELL,
            quantity: order.quantity,
            product: this.kc.PRODUCT_CNC,
            order_type: this.kc.ORDER_TYPE_LIMIT,
            price: order.price
        })
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
    } catch (err) {
        console.error('Error placing GTT:', err);
    }
}
  public async getProfile() {
    try {
      const profile = await this.kc.profile();
      console.log("Profile:", profile);
      return profile
    } catch (err) {
      console.error("Error getting profile:", err);
    }
  }


  public isAuthenticated(accountId: string): boolean {
    if (!this.kc) return false;
    return true
  }

}
