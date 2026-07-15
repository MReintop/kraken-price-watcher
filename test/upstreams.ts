import { Coin, Timeframe } from '../types';

// Stubs both upstreams at the fetch boundary, so tests exercise the real merge:
// CoinGecko answers "what is this coin", Kraken answers "what is it worth".
// Mocking the modules instead would skip the code that joins them.

export const makeCoin = (overrides: Partial<Coin> = {}): Coin => ({
  id: 'bitcoin',
  name: 'Bitcoin',
  symbol: 'btc',
  image: 'x',
  current_price: 62888,
  price_change_percentage_24h: -1.45,
  market_cap: 0,
  total_volume: 0,
  ...overrides,
});

type Metadata = Pick<
  Coin,
  'id' | 'name' | 'symbol' | 'image' | 'market_cap' | 'total_volume'
>;

const metadataFor = (coins: Coin[]): Metadata[] =>
  coins.map(({ id, name, symbol, image, market_cap, total_volume }) => ({
    id,
    name,
    symbol,
    image,
    market_cap,
    total_volume,
  }));

const PAIRS: Record<string, string> = {
  bitcoin: 'XXBTZUSD',
  ethereum: 'XETHZUSD',
  solana: 'SOLUSD',
  cardano: 'ADAUSD',
  ripple: 'XXRPZUSD',
  dogecoin: 'XDGUSD',
  polkadot: 'DOTUSD',
  chainlink: 'LINKUSD',
};

// Kraken sends prices as strings and reports failure as HTTP 200 + error[].
const tickerFor = (coins: Coin[]) => ({
  error: [],
  result: Object.fromEntries(
    coins.map((coin) => {
      const open =
        coin.current_price / (1 + coin.price_change_percentage_24h / 100);
      return [
        PAIRS[coin.id],
        { c: [String(coin.current_price), '1.0'], o: String(open) },
      ];
    }),
  ),
});

const ohlcRow = (t: number, close: number) => [
  t,
  '100.0',
  '110.0',
  '90.0',
  String(close),
  '100.0',
  '1.0',
  10,
];

const ohlcFor = (pair: string) => ({
  error: [],
  result: { [pair]: [ohlcRow(1_700_000_000, 105)], last: 1_700_000_000 },
});

const noHeaders = { get: (): string | null => null };

const json = (body: unknown) => ({
  ok: true,
  status: 200,
  headers: noHeaders,
  json: async () => body,
});

export interface StubOptions {
  coins?: Coin[];
  /** Fail the CoinGecko identity call with this status. */
  metadataStatus?: number;
}

// Installs a fetch that answers by URL, since the app now calls two upstreams.
export const stubUpstreams = ({
  coins = [makeCoin()],
  metadataStatus,
}: StubOptions = {}) => {
  const fetchMock = jest.fn(async (url: string) => {
    if (url.includes('/coins/markets')) {
      if (metadataStatus) {
        return { ok: false, status: metadataStatus, headers: noHeaders };
      }
      return json(metadataFor(coins));
    }
    if (url.includes('/Ticker')) return json(tickerFor(coins));
    if (url.includes('/OHLC')) {
      const pair = new URL(url, 'http://x').searchParams.get('pair')!;
      return json(ohlcFor(pair));
    }
    throw new Error(`unexpected request: ${url}`);
  });

  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
};

export const ALL_TIMEFRAMES = Object.values(Timeframe);
