export type Coin = {
  id: string;
  name: string;
  symbol: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
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

// One OHLC candle (from CoinGecko /coins/{id}/ohlc).
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
