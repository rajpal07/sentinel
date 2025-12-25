const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

export interface FinnhubSymbol {
    displaySymbol: string;
    symbol: string;
    description: string;
    type: string;
}

export interface FinnhubQuote {
    c: number; // Current price
    h: number; // High price of the day
    l: number; // Low price of the day
    o: number; // Open price of the day
    pc: number; // Previous close price
    t: number; // Timestamp
}

export async function searchSymbols(query: string): Promise<FinnhubSymbol[]> {
    if (!query || query.length < 2) return [];

    try {
        const response = await fetch(
            `${BASE_URL}/search?q=${query}&token=${FINNHUB_API_KEY}`
        );
        const data = await response.json();
        return data.result || [];
    } catch (error) {
        console.error('Error searching symbols:', error);
        return [];
    }
}

export async function getQuote(symbol: string): Promise<FinnhubQuote | null> {
    if (!symbol) return null;

    try {
        const response = await fetch(
            `${BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
        );
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching quote:', error);
        return null;
    }
}
