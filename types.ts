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
