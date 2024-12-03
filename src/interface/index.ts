export interface OrderDetails {
    broker: "ZERODHA" | "UPSTOX";
    baseInstrument: string;
    instrumentType: "FUT" | "OPT" | "EQ";
    expiry: string | null;
    strike: number | null;
    optionType: "CE" | "PE" | null;
    exchange: "NSE" | "BSE";
    qty: number;
    entryPrice: number ;
    exitPrice: number ;
    entryRange: number[] | null;
    exitRange: number[] | null;
    stopLoss: number ;
    orderType: "LIMIT" | "MARKET" | "SL" | "SL-M" ;
    side: "BUY" | "SELL";
    productType: "I" | "D";
  }
  
  export interface OrderQueue {
    orderId: number;
    orderDetails: OrderDetails;
    brokerOrderDetails: upstoxOrderDetails ;
    brokerOrderDetailsSL: upstoxOrderDetails ;
    brokerEntryOrderId: string;
    brokerExitOrderId: string;
    ltp:number;
    status: "OPEN" | "CLOSED" | "CANCELLED" | "ENTRY";
    createdAt: Date;
    updatedAt: Date;
    closedAt: Date | null;
    closedReason: "SL Hit" | "Target Hit" | "Canceled" | "Manual" | null;
    pnl: number | null;
  }

  export interface upstoxOrderDetails {
    quantity: number,
    product:  "I" | "D",
    validity: "DAY",
    price: number,
    tag: "string",
    instrument_token: string,
    order_type: "LIMIT" | "MARKET" | "SL" | "SL-M",
    transaction_type: "BUY" | "SELL",
    disclosed_quantity: number,
    trigger_price: number,
    is_amo: boolean,
  }

  export interface zerodhaOrderDetails {
    tradingsymbol: string,
    exchange: string,
    last_price: number,
    trigger_values: number[],
    orders: GTTDetails[],
  }

  export interface GTTDetails {
    transaction_type: "BUY" | "SELL",
    quantity: number,
    price: number
  }
