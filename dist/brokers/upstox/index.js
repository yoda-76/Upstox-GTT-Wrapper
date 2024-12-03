"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpstoxBroker = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zlib_1 = __importDefault(require("zlib"));
const csvtojson_1 = __importDefault(require("csvtojson"));
const order_slicer_1 = require("../../utils/order-slicer");
const equity_symbols_1 = require("../../constant/equity-symbols");
class UpstoxBroker {
    // Singleton pattern
    constructor() {
        this.instrumentData = {}; // In-memory store for instrument data
        this.tokenToBeSubscribed = []; // Token to be subscribed to for order updates
        this.instrumentDataSearchMap = new Map(); // In-memory store for instrument data
        this.loadInstrumentData(); // Load instruments when the broker is initialized
    }
    static getInstance() {
        if (!UpstoxBroker.instance) {
            UpstoxBroker.instance = new UpstoxBroker();
        }
        return UpstoxBroker.instance;
    }
    getInstrumentDataAsObject() {
        // console.log(this.instrumentData);
        return this.instrumentData;
    }
    getInstrumentDataSearchMapAsObject() {
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
    async placeOrder(access_token, orderDetails, baseInstrument) {
        //check funds first
        try {
            if (!access_token) {
                throw new Error('no access token found');
            }
            //check if the quantity exceeds the freeze quqntity for that perticular index? if it does, then slice the order quantity accordingly
            let slicedQty;
            // if()
            slicedQty = (0, order_slicer_1.sliceOrderQuantity)(orderDetails.quantity, baseInstrument);
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
                const response = await (0, axios_1.default)(config);
                // console.log(response);
                return response.data.data.order_id;
            }
            return true;
        }
        catch (error) {
            console.log(error);
            throw error;
        }
    }
    async loadInstrumentData() {
        try {
            const folderPath = path_1.default.join(__dirname, 'token_data');
            const compressedFilePath = path_1.default.join(folderPath, 'instrument_data.csv.gz');
            const decompressedFilePath = path_1.default.join(folderPath, 'instrument_data.csv');
            // Ensure the directory exists
            if (!fs_1.default.existsSync(folderPath)) {
                fs_1.default.mkdirSync(folderPath);
            }
            // Download and decompress instrument data
            await (0, axios_1.default)({
                method: 'get',
                url: 'https://assets.upstox.com/market-quote/instruments/exchange/complete.csv.gz',
                responseType: 'stream',
            }).then((response) => {
                const writer = fs_1.default.createWriteStream(compressedFilePath);
                response.data.pipe(writer);
                return new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
            });
            // Decompress file
            await new Promise((resolve, reject) => {
                const input = fs_1.default.createReadStream(compressedFilePath);
                const output = fs_1.default.createWriteStream(decompressedFilePath);
                input.pipe(zlib_1.default.createGunzip()).pipe(output);
                output.on('finish', resolve);
                output.on('error', reject);
            });
            // Convert CSV to JSON and structure data
            const jsonArray = await (0, csvtojson_1.default)().fromFile(decompressedFilePath);
            this.instrumentData = this.structureInstrumentData(jsonArray); // Structure the data
            console.log('Instrument data loaded into memory and structured');
        }
        catch (error) {
            console.error('Error loading instrument data:', error.message || error);
        }
    }
    // Structure instrument data for quick access
    structureInstrumentData(jsonArray) {
        const structuredData = {
            "NSE": {
                "INDEX": {
                    "NIFTY": {},
                    "BANKNIFTY": {},
                    "FINNIFTY": {},
                },
                "EQUITY": {},
                "BANKNIFTY": {},
                "FINNIFTY": {},
                "NIFTY": {}
            },
            "BSE": {
                "INDEX": {
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
        const isNifty50Option = /^NIFTY\d{2}([A-Z]{3}|\d{3})\d{5}(CE|PE)$/;
        jsonArray.forEach(instrument => {
            const { name, instrument_type, tradingsymbol, option_type, expiry, strike, exchange } = instrument;
            // Index handling
            if (instrument_type === "INDEX") {
                if (name === "Nifty 50")
                    structuredData.NSE.INDEX.NIFTY = instrument;
                if (name === "Nifty Bank")
                    structuredData.NSE.INDEX.BANKNIFTY = instrument;
                if (name === "Nifty Fin Service")
                    structuredData.NSE.INDEX.FINNIFTY = instrument;
                if (name === "SENSEX")
                    structuredData.BSE.INDEX.SENSEX = instrument;
                if (name === "BANKEX")
                    structuredData.BSE.INDEX.BANKEX = instrument;
            }
            // Options handling
            if (instrument_type === "OPTIDX" && exchange === "NSE_FO") {
                if (option_type === "CE") {
                    const baseSymbol = tradingsymbol.slice(0, -2);
                    // Match CE with PE
                    jsonArray.forEach(otherInstrument => {
                        if (otherInstrument.option_type === "PE") {
                            const otherBaseSymbol = otherInstrument.tradingsymbol.slice(0, -2);
                            if (baseSymbol === otherBaseSymbol) {
                                if (tradingsymbol.includes("BANKNIFTY")) {
                                    structuredData.NSE.BANKNIFTY[`${expiry} : ${strike}`] = { CE: instrument, PE: otherInstrument };
                                }
                                else if (tradingsymbol.includes("FINNIFTY")) {
                                    structuredData.NSE.FINNIFTY[`${expiry} : ${strike}`] = { CE: instrument, PE: otherInstrument };
                                }
                                else if (isNifty50Option.test(tradingsymbol)) {
                                    structuredData.NSE.NIFTY[`${expiry} : ${strike}`] = { CE: instrument, PE: otherInstrument };
                                }
                            }
                        }
                    });
                }
            }
            else if (instrument_type === "EQUITY" && exchange === "NSE_EQ" && equity_symbols_1.equitySymbols.includes(tradingsymbol)) {
                structuredData.NSE.EQUITY[tradingsymbol] = instrument;
            }
            else if (instrument_type === "EQUITY" && exchange === "BSE_EQ" && equity_symbols_1.equitySymbols.includes(tradingsymbol)) {
                structuredData.BSE.EQUITY[tradingsymbol] = instrument;
            }
            else if (instrument_type === "FUTCOM" && exchange === "MCX_FO" && name === "CRUDE OIL" && (option_type === "PE" || option_type === "CE")) {
                if (option_type === "CE") {
                    const baseSymbol = tradingsymbol.slice(0, -2);
                    // Match CE with PE
                    jsonArray.forEach(otherInstrument => {
                        if (otherInstrument.option_type === "PE") {
                            const otherBaseSymbol = otherInstrument.tradingsymbol.slice(0, -2);
                            if (baseSymbol === otherBaseSymbol) {
                                if (tradingsymbol.includes("CRUDEOIL")) {
                                    structuredData.MCX.CRUDEOIL[`${expiry} : ${strike}.0`] = { CE: instrument, PE: otherInstrument };
                                }
                            }
                        }
                    });
                }
            }
            else if (instrument_type === "OPTIDX" && exchange === "BSE_FO") {
                if (option_type === "CE") {
                    const baseSymbol = tradingsymbol.slice(0, -2);
                    // Match CE with PE
                    jsonArray.forEach(otherInstrument => {
                        if (otherInstrument.option_type === "PE") {
                            const otherBaseSymbol = otherInstrument.tradingsymbol.slice(0, -2);
                            if (baseSymbol === otherBaseSymbol) {
                                if (tradingsymbol.includes("SENSEX")) {
                                    structuredData.BSE.SENSEX[`${expiry} : ${strike}.0`] = { CE: instrument, PE: otherInstrument };
                                }
                                else if (tradingsymbol.includes("BANKEX")) {
                                    structuredData.BSE.BANKEX[`${expiry} : ${strike}.0`] = { CE: instrument, PE: otherInstrument };
                                }
                            }
                        }
                    });
                }
            }
        });
        // kiteInstruments.map((instrument) => {
        //   if(instrument.segment === "NFO-OPT" && (instrument.name === "NIFTY" || instrument.name === "BANKNIFTY" || instrument.name === "FINNIFTY") && (instrument.instrument_type === "PE" || instrument.instrument_type === "CE") &&structuredData.NSE[instrument.name][`${instrument.expiry} : ${instrument.strike}.0`] && structuredData.NSE[instrument.name][`${instrument.expiry} : ${instrument.strike}.0`][instrument.instrument_type]){
        //     structuredData.NSE[instrument.name][`${instrument.expiry} : ${instrument.strike}.0`][instrument.instrument_type].ltpToken = instrument.instrument_token;
        //     //add ltp token to subscribed instruments list
        //     this.tokenToBeSubscribed.push(Number(instrument.instrument_token));
        //     //create a map with symbol from broker as key and info from broker + info from kite as value
        //     const upstoxData = structuredData.NSE[instrument.name][`${instrument.expiry} : ${instrument.strike}.0`][instrument.instrument_type];
        //     this.instrumentDataSearchMap[upstoxData.tradingsymbol] ={...upstoxData, ...instrument}; 
        //   }else if(instrument.segment === "BFO-OPT" && (instrument.name === "BANKEX" || instrument.name === "SENSEX") && (instrument.instrument_type === "PE" || instrument.instrument_type === "CE") &&structuredData.BSE[instrument.name][`${instrument.expiry} : ${instrument.strike}.0`] && structuredData.BSE[instrument.name][`${instrument.expiry} : ${instrument.strike}.0`][instrument.instrument_type]){
        //     structuredData.BSE[instrument.name][`${instrument.expiry} : ${instrument.strike}.0`][instrument.instrument_type].ltpToken = instrument.instrument_token;
        //     //add ltp token to subscribed instruments list
        //     this.tokenToBeSubscribed.push(Number(instrument.instrument_token));
        //     //create a map with symbol from broker as key and info from broker + info from kite as value
        //     const upstoxData = structuredData.BSE[instrument.name][`${instrument.expiry} : ${instrument.strike}.0`][instrument.instrument_type];
        //     this.instrumentDataSearchMap[upstoxData.tradingsymbol] ={...upstoxData, ...instrument}; 
        //   }else if( instrument.segment === "INDICES" ){
        //     if (instrument.name === "NIFTY 50") {
        //       structuredData.NSE.INDEX.NIFTY.ltpToken = instrument.instrument_token;
        //       this.tokenToBeSubscribed.push(Number(instrument.instrument_token));
        //     }
        //     else if (instrument.name === "NIFTY BANK"){
        //       structuredData.NSE.INDEX.BANKNIFTY.ltpToken = instrument.instrument_token;
        //       this.tokenToBeSubscribed.push(Number(instrument.instrument_token));
        //     }
        //     else if (instrument.name === "NIFTY FIN SERVICE") {
        //       structuredData.NSE.INDEX.FINNIFTY.ltpToken = instrument.instrument_token;
        //       this.tokenToBeSubscribed.push(Number(instrument.instrument_token));
        //     }
        //     else if(instrument.name === "SENSEX") {
        //       structuredData.BSE.INDEX.SENSEX.ltpToken = instrument.instrument_token;
        //       this.tokenToBeSubscribed.push(Number(instrument.instrument_token));
        //     }
        //     else if(instrument.name === "BSE INDEX BANKEX") {
        //       structuredData.BSE.INDEX.BANKEX.ltpToken = instrument.instrument_token;
        //       this.tokenToBeSubscribed.push(Number(instrument.instrument_token));
        //     }else if(instrument.name === "MCXCRUDEX") {
        //       structuredData.MCX.INDEX.CRUDEOIL.ltpToken = instrument.instrument_token;
        //       this.tokenToBeSubscribed.push(Number(instrument.instrument_token));
        //     }
        //   }else if(instrument.instrument_type === "EQ" &&structuredData.NSE.EQUITY[instrument.tradingsymbol]){
        //     if(instrument.segment === "NSE"){
        //       structuredData.NSE.EQUITY[instrument.tradingsymbol].ltpToken = instrument.instrument_token;
        //       this.tokenToBeSubscribed.push(Number(instrument.instrument_token));
        //     }else if(instrument.segment === "BSE"){
        //       structuredData.BSE.EQUITY[instrument.tradingsymbol].ltpToken = instrument.instrument_token;
        //       this.tokenToBeSubscribed.push(Number(instrument.instrument_token));
        //     }
        //   }else if(instrument.segment === "MCX-OPT" && instrument.name === "CRUDEOIL" && structuredData.MCX[instrument.name][`${instrument.expiry} : ${instrument.strike}.0`] && structuredData.MCX[instrument.name][`${instrument.expiry} : ${instrument.strike}.0`][instrument.instrument_type]){
        //     structuredData.MCX[instrument.name][`${instrument.expiry} : ${instrument.strike}.0`][instrument.instrument_type].ltpToken = instrument.instrument_token;
        //     //add ltp token to subscribed instruments list
        //     this.tokenToBeSubscribed.push(Number(instrument.instrument_token));
        //     //create a map with symbol from broker as key and info from broker + info from kite as value
        //     const upstoxData = structuredData.MCX[instrument.name][`${instrument.expiry} : ${instrument.strike}.0`][instrument.instrument_type];
        //     this.instrumentDataSearchMap[upstoxData.tradingsymbol] ={...upstoxData, ...instrument}; 
        //   }
        // })
        return structuredData;
    }
    // Get instrument from memory
    getInstrument(base, expiry, strike, side) {
        return this.instrumentData?.[base]?.[`${expiry} : ${strike}`]?.[side] || null;
    }
    getTokensToBeSubscribed() {
        return this.tokenToBeSubscribed;
    }
    //Get funds of an upstox account
    async getFunds(access_token) {
        const url = "https://api.upstox.com/v2/user/get-funds-and-margin";
        const headers = {
            Accept: "application/json",
            Authorization: `Bearer ${access_token}`,
        };
        const resp = await axios_1.default.get(url, { headers });
        console.log(resp);
        return resp.data.data;
    }
}
exports.UpstoxBroker = UpstoxBroker;
UpstoxBroker.authenticatedAccounts = new Map();
UpstoxBroker.instance = null;
