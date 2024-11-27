import axios from "axios";
import zlib from 'zlib';
import csvtojson from 'csvtojson';

export async function fetchInstruments(api_key: string, access_token: string) {
    try {
        // Fetch instrument list
        const instrumentResponse = await axios.get('https://api.kite.trade/instruments', {
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
            const decompressedData = await new Promise<Buffer>((resolve, reject) => {
                zlib.gunzip(instrumentResponse.data, (err, result) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(result);
                });
            });
            csvString = decompressedData.toString('utf-8');
        } else {
            // No need to decompress, handle as regular CSV
            csvString = instrumentResponse.data.toString('utf-8');
        }   

        // Convert CSV to JSON
        const instrumentJsonArray = await csvtojson().fromString(csvString);
        return instrumentJsonArray;

    } catch (err) {
        console.error("Error fetching instruments:", err);
        throw new Error("Failed to fetch instruments");
    }
}

