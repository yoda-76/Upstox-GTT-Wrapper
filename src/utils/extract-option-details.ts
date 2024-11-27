export function extractOptionDetails(tradingSymbol) {
    // Regular expression to capture the base instrument, year, month/day, strike, and option type (CE/PE)
    const regex = /([A-Z]+)(\d{2})([A-Z]{1}\d{1,2}[A-Z]{0,2}|\w{3})(\d+)(CE|PE)/;

    const match = tradingSymbol.match(regex);
    
    if (!match) {
        throw new Error('Invalid trading symbol format');
    }

    const baseInstrument = match[1];
    const year = `20${match[2]}`;  // Extract last two digits of the year, assuming 20xx.
    const monthOrDay = match[3];    // Could be month (OCT) or day format (O01).
    const strike = match[4];
    const optionType = match[5];
    console.log(baseInstrument, year, monthOrDay, strike, optionType);
    
    let expiry; 
    const lastExpMonths = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    // Handling expiry for month names (e.g., OCT, NOV, DEC)
    if(lastExpMonths.includes(monthOrDay)){
      const monthMapping = {
          'JAN': '01',
          'FEB': '02',
          'MAR': '03',
          'APR': '04',
          'MAY': '05',
          'JUN': '06',
          'JUL': '07',
          'AUG': '08',
          'SEP': '09',
          'OCT': '10',
          'NOV': '11',
          'DEC': '12'
      };
      // const date = "30";  //how to get last expiry
      // expiry = `${year}-${monthMapping[monthOrDay]}-${date}` 
      expiry = null
    }else if(monthOrDay[0]==='O' || monthOrDay[0]==='N' || monthOrDay[0]==='D'){
      const monthMapping = {
        'O': '10',
        'N': '11',
        'D': '12'
    };
      expiry = `${year}-${monthMapping[monthOrDay[0]]}-${monthOrDay[1]}${monthOrDay[2]}`;
    }else{
      expiry = `${year}-0${monthOrDay[0]}-${monthOrDay[1]}${monthOrDay[2]}`
    }

    return {
        baseInstrument,
        expiry,
        strike,
        optionType
    };
}