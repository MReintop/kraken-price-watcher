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

export type RootStackParamList = {
  Prices: undefined; // no params
  CoinDetail: { coin: Coin };
};

// Async request lifecycle for the coins slice (string values so Redux
// DevTools / serialized state stay readable).
export enum FetchStatus {
  Idle = 'idle',
  Loading = 'loading',
  Succeeded = 'succeeded',
  Failed = 'failed',
}
