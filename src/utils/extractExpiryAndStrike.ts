export const extractExpiryAndStrike = (
    input: string
  ): { expiryDate: string; strikePrice: number } => {
    const regex = /(\d{4}-\d{2}-\d{2})\s*:\s*([\d.]+)/;
    const match = input.match(regex);
  
    if (match) {
      const expiryDate = match[1];
      const strikePrice = parseFloat(match[2]);
      return { expiryDate, strikePrice };
    } else {
      throw new Error("Invalid input format");
    }
  };