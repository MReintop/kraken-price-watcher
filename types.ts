// Identity comes from the local registry and the price from Kraken, so both are
// always here. The rest is CoinGecko's market context: optional because it is a
// second upstream, and a coin with no context is still a coin with a price.
export type Coin = {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  image?: string;
  price_change_percentage_24h?: number;
  market_cap?: number;
  total_volume?: number;
};

// Navigation route names — one source of truth instead of magic strings.
export enum NavigateKey {
  Prices = 'Prices',
  CoinDetail = 'CoinDetail',
}

export type RootStackParamList = {
  [NavigateKey.Prices]: undefined;
  [NavigateKey.CoinDetail]: { coinId: string }; // pass the id; read live coin from the store
};

// Async request lifecycle for the coins slice (string values so Redux
// DevTools / serialized state stay readable).
export enum FetchStatus {
  Idle = 'idle',
  Loading = 'loading',
  Succeeded = 'succeeded',
  Failed = 'failed',
}

// One OHLC candle.
export interface Candle {
  t: number; // timestamp (ms)
  o: number;
  h: number;
  l: number;
  c: number;
}

// Chart timeframes. The value is also the button label shown in the UI.
export enum Timeframe {
  Day = '24H',
  Month = '1M',
  Year = '1Y',
}
