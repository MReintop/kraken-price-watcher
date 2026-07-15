import { Profiler } from 'react';
import { render, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import coinsReducer, { tickersApplied } from '../../store/coinsSlice';
import { FetchStatus } from '../../types';
import { makeCoin } from '../../test/upstreams';
import CoinCard from './CoinCard';

// Performance asserted as a count, not a clock: a wall-time threshold on a
// component this small measures the machine, not the code.

const BTC = makeCoin({ id: 'bitcoin', symbol: 'btc', current_price: 62888 });
const ETH = makeCoin({ id: 'ethereum', symbol: 'eth', current_price: 1883 });

// Arrange helper: two rows over one store, each counting its own renders.
const renderTwoCards = () => {
  const renders = { bitcoin: 0, ethereum: 0 };
  const store = configureStore({
    reducer: { coins: coinsReducer },
    preloadedState: {
      coins: { items: [BTC, ETH], status: FetchStatus.Succeeded, live: true },
    },
  });

  render(
    <Provider store={store}>
      <Profiler id="bitcoin" onRender={() => (renders.bitcoin += 1)}>
        <CoinCard coinId="bitcoin" onSelect={jest.fn()} />
      </Profiler>
      <Profiler id="ethereum" onRender={() => (renders.ethereum += 1)}>
        <CoinCard coinId="ethereum" onSelect={jest.fn()} />
      </Profiler>
    </Provider>,
  );

  return { store, renders };
};

describe('CoinCard re-render isolation', () => {
  it('re-renders only the row whose coin ticked', () => {
    // Arrange
    const { store, renders } = renderTwoCards();
    const before = { ...renders };

    // Act
    act(() => {
      store.dispatch(
        tickersApplied([{ symbol: 'BTC', last: 63000, changePct: 2 }]),
      );
    });

    // Assert — the untouched row must not pay for its neighbour's tick
    expect(renders.bitcoin).toBeGreaterThan(before.bitcoin);
    expect(renders.ethereum).toBe(before.ethereum);
  });

  it('re-renders both rows only when both ticked', () => {
    // Arrange
    const { store, renders } = renderTwoCards();
    const before = { ...renders };

    // Act
    act(() => {
      store.dispatch(
        tickersApplied([
          { symbol: 'BTC', last: 63000, changePct: 2 },
          { symbol: 'ETH', last: 1900, changePct: 3 },
        ]),
      );
    });

    // Assert
    expect(renders.bitcoin).toBeGreaterThan(before.bitcoin);
    expect(renders.ethereum).toBeGreaterThan(before.ethereum);
  });

  it('re-renders nothing when a tick repeats the current price', () => {
    // Arrange — the socket forwards every trade, and repeat trades at one price
    // level are constant in a real market
    const { store, renders } = renderTwoCards();
    const before = { ...renders };

    // Act
    act(() => {
      store.dispatch(
        tickersApplied([
          {
            symbol: 'BTC',
            last: BTC.current_price,
            changePct: BTC.price_change_percentage_24h,
          },
        ]),
      );
    });

    // Assert
    expect(renders.bitcoin).toBe(before.bitcoin);
    expect(renders.ethereum).toBe(before.ethereum);
  });

  it('re-renders nothing when a tick names a coin that is not listed', () => {
    // Arrange
    const { store, renders } = renderTwoCards();
    const before = { ...renders };

    // Act
    act(() => {
      store.dispatch(
        tickersApplied([{ symbol: 'DOGE', last: 0.5, changePct: 9 }]),
      );
    });

    // Assert
    expect(renders.bitcoin).toBe(before.bitcoin);
    expect(renders.ethereum).toBe(before.ethereum);
  });

  it('re-renders nothing when only the socket status changes', () => {
    // Arrange — `live` is not a price; rows must not care
    const { store, renders } = renderTwoCards();
    const before = { ...renders };

    // Act
    act(() => {
      store.dispatch({ type: 'coins/socketStatusChanged', payload: false });
    });

    // Assert
    expect(renders.bitcoin).toBe(before.bitcoin);
    expect(renders.ethereum).toBe(before.ethereum);
  });
});
