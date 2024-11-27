"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchInstruments = fetchInstruments;
const axios_1 = __importDefault(require("axios"));
const zlib_1 = __importDefault(require("zlib"));
const csvtojson_1 = __importDefault(require("csvtojson"));
async function fetchInstruments(api_key, access_token) {
    try {
        // Fetch instrument list
        const instrumentResponse = await axios_1.default.get('https://api.kite.trade/instruments', {
            responseType: 'arraybuffer', // Ensure response is in binary format
            headers: {
                'X-Kite-Version': '3',
                'Authorization': `token ${api_key}:${access_token}`
            }
        });
        const encoding = instrumentResponse.headers['content-encoding'];
        let csvString = '';
        if (encoding && encoding.includes('gzip')) {
            // Decompress gzipped response
            const decompressedData = await new Promise((resolve, reject) => {
                zlib_1.default.gunzip(instrumentResponse.data, (err, result) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(result);
                });
            });
            csvString = decompressedData.toString('utf-8');
        }
        else {
            // No need to decompress, handle as regular CSV
            csvString = instrumentResponse.data.toString('utf-8');
        }
        // Convert CSV to JSON
        const instrumentJsonArray = await (0, csvtojson_1.default)().fromString(csvString);
        return instrumentJsonArray;
    }
    catch (err) {
        console.error("Error fetching instruments:", err);
        throw new Error("Failed to fetch instruments");
    }
}
