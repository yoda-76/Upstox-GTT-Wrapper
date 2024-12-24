import axios from 'axios';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import csvtojson from 'csvtojson';
import { sliceOrderQuantity } from '../../utils/order-slicer';
import { equitySymbols } from '../../constant/equity-symbols';
import { upstoxOrderDetails } from '../../interface';

export class UpstoxBroker {
  private static authenticatedAccounts: Map<string, { accessToken: string, expiresAt: Date }> = new Map();
  private static instance: UpstoxBroker | null = null;
  private instrumentData: Record<string, any> = {};  // In-memory store for instrument data
  private tokenToBeSubscribed: number[] = [];  // Token to be subscribed to for order updates
  private instrumentDataSearchMap: Map<string, any> = new Map();  // In-memory store for instrument data

  // Singleton pattern
  private constructor() {
    this.loadInstrumentData();  // Load instruments when the broker is initialized
  }

  public static getInstance(): UpstoxBroker {
    if (!UpstoxBroker.instance) {
      UpstoxBroker.instance = new UpstoxBroker();
    }
    return UpstoxBroker.instance;
  }

  public getInstrumentDataAsObject() {
    // console.log(this.instrumentData);
    return this.instrumentData;
  }

  public getInstrumentDataSearchMapAsObject() {
    // console.log(this.instrumentDataSearchMap);
    return this.instrumentDataSearchMap;
  }

  // Handle access token received via webhook
  // public async handleWebhook(id: string, authcode: string): Promise<string> {
  //   try {
  //     //fetch userData
  //     // Fetch access token using the authorization code
  //     console.log({
  //       code: authcode,
  //       client_id: userData.key,
  //       client_secret: userData.secret,
  //       redirect_uri: process.env.UPSTOX_REDIRECT_URL,
  //       grant_type: "authorization_code",
  //     });
  //     const response = await axios.post(
  //       "https://api.upstox.com/v2/login/authorization/token",
  //       new URLSearchParams({
  //         code: authcode,
  //         client_id: userData.key,
  //         client_secret: userData.secret,
  //         redirect_uri: process.env.UPSTOX_REDIRECT_URL,
  //         grant_type: "authorization_code",
  //       }),
  //       {
  //         headers: {
  //           Accept: "application/json",
  //           "Api-Version": "2.0",
  //           "Content-Type": "application/x-www-form-urlencoded",
  //         },
  //       }
  //     );

  //     // Process the response
  //     
  //     // Store the access token in-memory and update DB
  //     
  //     // Get the singleton instance of AccountManager and add the account
  //     console.log("Access token for account stored successfully.");
  //     return `Access token for account ${id} stored successfully.`
  //   } catch (error) {
  //     console.error("Error in handleWebhook:", error);
  //     throw new Error("Error authorizing with Upstox : .Controllers/Authorization: handleWebhook");
  //   }
  // }


  // public isAuthenticated(accountId: string): boolean {
  //   const account = UpstoxBroker.authenticatedAccounts.get(accountId);
  //   if (!account) return false;

  //   const now = new Date();
  //   return account.expiresAt > now;
  // }

  

  // Place order using the access token
  public async placeOrder(access_token: string, orderDetails: upstoxOrderDetails, baseInstrument: string) {
      
      //check funds first
      try {
        if (!access_token) {
          throw new Error('no access token found');
        }
        //check if the quantity exceeds the freeze quqntity for that perticular index? if it does, then slice the order quantity accordingly
        let slicedQty: number[];
        // if()
        slicedQty = sliceOrderQuantity(orderDetails.quantity, baseInstrument);
        // slicedQty = [orderDetails.quantity];
    

        // console.log(slicedQty);
        for (let i = 0; i < slicedQty.length; i++) {
          let config = {
            url: "https://api.upstox.com/v2/order/place",
            method: "post", // Add the 'method' property and set it to 'post'
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${access_token}`,
            },
            data: orderDetails,
          };
          
    
          const response = await axios(config);
          // console.log(response);
          return response.data.data.order_id;
        }
        return true;
      } catch (error) {
        console.log(error);
        throw error;
      }
  }

  
 

  private async loadInstrumentData() {
    try {
      const folderPath = path.join(__dirname, "..", "..", "..", 'upstox_token_data');
      const compressedFilePath = path.join(folderPath, 'instrument_data.json');
      const decompressedFilePath = path.join(folderPath, 'instrument_data2.json');

      // Ensure the directory exists
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }

      // Download and decompress instrument data
      await axios({
        method: 'get',
        url: 'https://assets.upstox.com/market-quote/instruments/exchange/complete.json.gz',
        responseType: 'stream',
      }).then((response) => {
        const writer = fs.createWriteStream(compressedFilePath);
        response.data.pipe(writer);
        return new Promise<void>((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
      });

      // Decompress file
      await new Promise<void>((resolve, reject) => {
        const input = fs.createReadStream(compressedFilePath);
        const output = fs.createWriteStream(decompressedFilePath);
        input.pipe(zlib.createGunzip()).pipe(output);
        output.on('finish', resolve);
        output.on('error', reject);
      });

      // Convert CSV to JSON and structure data
      // const jsonArray = await csvtojson().fromFile(decompressedFilePath);
      const unparsedJsonArray: any = fs.readFileSync(decompressedFilePath, 'utf8');
      const jsonArray = JSON.parse(unparsedJsonArray);

      //fetch kite instruments
      // const kiteAccessToken = await redisClient.get('KITE_CONNECT_access_token');
      // const kiteInstruments = await fetchInstruments(process.env.KITE_API_KEY, kiteAccessToken);
      this.instrumentData = this.structureInstrumentData(jsonArray);  // Structure the data
      // this.instrumentData = kiteInstruments  // Structure the data


      console.log('Instrument data loaded into memory and structured');
    } catch (error: any) {
      console.error('Error loading instrument data:', error.message || error);
    }
  }

  // Structure instrument data for quick access
  private structureInstrumentData(jsonArray: any[]): Record<string, any> {
    const equityMap = () => {
      const map = equitySymbols.reduce((acc:any, key) => {
        acc[key] = {};
        return acc;
      }, {});
      return map
    }
    const structuredData: Record<string, any> = {
      "NSE": {
        "INDEX": {
          "NIFTY": {},
          "BANKNIFTY": {},
          "FINNIFTY": {},
        },
        "EQUITY": {},
        "EQUITY_OPTION": equityMap(),
        "FUTURES": {
          "EQUITY": equityMap(),
          "NIFTY": {},
          "BANKNIFTY": {},
          "FINNIFTY": {},
        },
        "BANKNIFTY": {},
        "FINNIFTY": {},
        "NIFTY": {},
      },
      "BSE": {
        "INDEX": {
          "BANKEX": {},
          "SENSEX": {}
        },
        "EQUITY_OPTION": equityMap(),
        "FUTURES": {
          "EQUITY": equityMap(),
          "BANKEX": {},
          "SENSEX": {}
        },
        "EQUITY": {},
        "BANKEX": {},
        "SENSEX": {}
      },
      "MCX": {
        "INDEX": {
          "CRUDEOIL": {}
        },
        "CRUDEOIL": {}
      }
    };


    jsonArray.forEach(instrument => {
      const { instrument_type, trading_symbol, segment, underlying_symbol } = instrument;
      // console.log(instrument,"\n", typeof instrument.expiry)

      // Index handling
      if (instrument_type === "INDEX") {
        if (trading_symbol === "NIFTY") structuredData.NSE.INDEX.NIFTY = instrument;
        if (trading_symbol === "BANKNIFTY") structuredData.NSE.INDEX.BANKNIFTY = instrument;
        if (trading_symbol === "FINNIFTY") structuredData.NSE.INDEX.FINNIFTY = instrument;

        if (trading_symbol === "SENSEX") structuredData.BSE.INDEX.SENSEX = instrument;
        if (trading_symbol === "BANKEX") structuredData.BSE.INDEX.BANKEX = instrument;


      }

      // Options handling
      if (segment === "NSE_FO" || segment === "BSE_FO") {
        const strike = instrument.strike_price;
        const date = new Date(Number(instrument.expiry));
        // Format the date as YYYY-MM-DD
        const expiry = date.toISOString().split('T')[0];
        if (instrument_type === "CE" || instrument_type === "PE") {

          if (underlying_symbol === "BANKNIFTY") {
            if (instrument_type === "CE") {
              if (!structuredData.NSE.BANKNIFTY[`${expiry} : ${strike}`]) {
                structuredData.NSE.BANKNIFTY[`${expiry} : ${strike}`] = { CE: instrument, PE: null };
              } else {
                structuredData.NSE.BANKNIFTY[`${expiry} : ${strike}`].CE = instrument;
              }
            } else if (instrument_type === "PE") {
              if (!structuredData.NSE.BANKNIFTY[`${expiry} : ${strike}`]) {
                structuredData.NSE.BANKNIFTY[`${expiry} : ${strike}`] = { CE: null, PE: instrument };
              } else {
                structuredData.NSE.BANKNIFTY[`${expiry} : ${strike}`].PE = instrument;
              }
            }

          }
          else if (underlying_symbol === "FINNIFTY") {

            if (instrument_type === "CE") {
              if (!structuredData.NSE.FINNIFTY[`${expiry} : ${strike}`]) {
                structuredData.NSE.FINNIFTY[`${expiry} : ${strike}`] = { CE: instrument, PE: null };
              } else {
                structuredData.NSE.FINNIFTY[`${expiry} : ${strike}`].CE = instrument;
              }
            } else if (instrument_type === "PE") {
              if (!structuredData.NSE.FINNIFTY[`${expiry} : ${strike}`]) {
                structuredData.NSE.FINNIFTY[`${expiry} : ${strike}`] = { CE: null, PE: instrument };
              } else {
                structuredData.NSE.FINNIFTY[`${expiry} : ${strike}`].PE = instrument;
              }
            }
          } else if (underlying_symbol === "NIFTY") {
            if (instrument_type === "CE") {
              if (!structuredData.NSE.NIFTY[`${expiry} : ${strike}`]) {
                structuredData.NSE.NIFTY[`${expiry} : ${strike}`] = { CE: instrument, PE: null };
              } else {
                structuredData.NSE.NIFTY[`${expiry} : ${strike}`].CE = instrument;
              }
            } else if (instrument_type === "PE") {
              if (!structuredData.NSE.NIFTY[`${expiry} : ${strike}`]) {
                structuredData.NSE.NIFTY[`${expiry} : ${strike}`] = { CE: null, PE: instrument };
              } else {
                structuredData.NSE.NIFTY[`${expiry} : ${strike}`].PE = instrument;
              }
            }
          } else if (underlying_symbol === "SENSEX") {
            if (instrument_type === "CE") {
              if (!structuredData.BSE.SENSEX[`${expiry} : ${strike}`]) {
                structuredData.BSE.SENSEX[`${expiry} : ${strike}`] = { CE: instrument, PE: null };
              } else {
                structuredData.BSE.SENSEX[`${expiry} : ${strike}`].CE = instrument;
              }
            } else if (instrument_type === "PE") {
              if (!structuredData.BSE.SENSEX[`${expiry} : ${strike}`]) {
                structuredData.BSE.SENSEX[`${expiry} : ${strike}`] = { CE: null, PE: instrument };
              } else {
                structuredData.BSE.SENSEX[`${expiry} : ${strike}`].PE = instrument;
              }
            }
          } else if (underlying_symbol === "BANKEX") {
            if (instrument_type === "CE") {
              if (!structuredData.BSE.BANKEX[`${expiry} : ${strike}`]) {
                structuredData.BSE.BANKEX[`${expiry} : ${strike}`] = { CE: instrument, PE: null };
              } else {
                structuredData.BSE.BANKEX[`${expiry} : ${strike}`].CE = instrument;
              }
            } else if (instrument_type === "PE") {
              if (!structuredData.BSE.BANKEX[`${expiry} : ${strike}`]) {
                structuredData.BSE.BANKEX[`${expiry} : ${strike}`] = { CE: null, PE: instrument };
              } else {
                structuredData.BSE.BANKEX[`${expiry} : ${strike}`].PE = instrument;
              }
            }
          }
          else if (equitySymbols.includes(underlying_symbol)) {
            if (instrument_type === "CE") {

              if (!structuredData.NSE.EQUITY_OPTION[underlying_symbol][`${underlying_symbol} : ${expiry} : ${strike}`]) {
                structuredData.NSE.EQUITY_OPTION[underlying_symbol][`${underlying_symbol} : ${expiry} : ${strike}`] = { CE: instrument, PE: null };
              } else {
                structuredData.NSE.EQUITY_OPTION[underlying_symbol][`${underlying_symbol} : ${expiry} : ${strike}`].CE = instrument;
              }
            } else if (instrument_type === "PE") {
              if (!structuredData.NSE.EQUITY_OPTION[underlying_symbol][`${underlying_symbol} : ${expiry} : ${strike}`]) {
                structuredData.NSE.EQUITY_OPTION[underlying_symbol][`${underlying_symbol} : ${expiry} : ${strike}`] = { CE: null, PE: instrument };
              } else {
                structuredData.NSE.EQUITY_OPTION[underlying_symbol][`${underlying_symbol} : ${expiry} : ${strike}`].PE = instrument;
              }
            }
          }
        }
        else if (instrument_type === "FUT") {
          if (underlying_symbol === "BANKNIFTY") {
            if (!structuredData.NSE.FUTURES.BANKNIFTY[`${expiry} : ${strike}`]) {
              structuredData.NSE.FUTURES.BANKNIFTY[`${expiry} : ${strike}`] = instrument;
            }
          }
          else if (underlying_symbol === "NIFTY") {
            if (!structuredData.NSE.FUTURES.NIFTY[`${expiry} : ${strike}`]) {
              structuredData.NSE.FUTURES.NIFTY[`${expiry} : ${strike}`] = instrument;
            }
          } else if (underlying_symbol === "FINNIFTY") {
            if (!structuredData.NSE.FUTURES.FINNIFTY[`${expiry} : ${strike}`]) {
              structuredData.NSE.FUTURES.FINNIFTY[`${expiry} : ${strike}`] = instrument;
            }
          } else if (underlying_symbol === "BANKEX") {
            if (!structuredData.BSE.FUTURES.BANKEX[`${expiry} : ${strike}`]) {
              structuredData.BSE.FUTURES.BANKEX[`${expiry} : ${strike}`] = instrument;
            }
          } else if (underlying_symbol === "SENSEX") {
            if (!structuredData.BSE.FUTURES.SENSEX[`${expiry} : ${strike}`]) {
              structuredData.BSE.FUTURES.SENSEX[`${expiry} : ${strike}`] = instrument;
            }
          }
          else if (equitySymbols.includes(underlying_symbol)) {
            if (segment === "NSE_FO" && !structuredData.NSE.FUTURES.EQUITY[underlying_symbol][`${underlying_symbol} : ${expiry} : ${strike}`]) {
              structuredData.NSE.FUTURES.EQUITY[underlying_symbol][`${underlying_symbol} : ${expiry} : ${strike}`] = instrument;
            } else if (segment === "BSE_FO" && !structuredData.BSE.FUTURES.EQUITY[underlying_symbol][`${underlying_symbol} : ${expiry} : ${strike}`]) {
              structuredData.BSE.FUTURES.EQUITY[underlying_symbol][`${underlying_symbol} : ${expiry} : ${strike}`] = instrument;
            }
          }
        }
      }
      else if (instrument_type === "EQ" && segment === "NSE_EQ" && equitySymbols.includes(trading_symbol)) {
        structuredData.NSE.EQUITY[trading_symbol] = instrument;
      } else if (segment === "BSE_EQ" && equitySymbols.includes(trading_symbol)) {

        structuredData.BSE.EQUITY[trading_symbol] = instrument;
      }
      // else if(instrument_type === "FUTCOM" && exchange === "MCX_FO" && name === "CRUDE OIL" && (option_type === "PE" || option_type === "CE")){
      //   if (option_type === "CE") {
      //     const baseSymbol = trading_symbol.slice(0, -2);

      //     // Match CE with PE
      //     jsonArray.forEach(otherInstrument => {
      //       if (otherInstrument.option_type === "PE") {
      //         const otherBaseSymbol = otherInstrument.trading_symbol.slice(0, -2);

      //         if (baseSymbol === otherBaseSymbol) {
      //           if (trading_symbol.includes("CRUDEOIL")) {
      //             structuredData.MCX.CRUDEOIL[`${expiry} : ${strike}.0`] = { CE: instrument, PE: otherInstrument };
      //           }
      //         }
      //       }
      //     });
      //   }
      // }

    });
    // return structuredData;
    return structuredData;

    // return optionSearchMap
  }

  // Get instrument from memory
  public getInstrument(base: string, expiry: string, strike: number, side: string): any {
    return this.instrumentData?.[base]?.[`${expiry} : ${strike}`]?.[side] || null;
  }

  public getTokensToBeSubscribed() {
    return this.tokenToBeSubscribed;
  }

  //Get funds of an upstox account
  public async getFunds(access_token: string): Promise<any> {
    const url = "https://api.upstox.com/v2/user/get-funds-and-margin";

    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${access_token}`,
    };
    const resp = await axios.get(url, { headers })
    console.log(resp);
    return resp.data.data;
  }

}
