import { configureStore } from '@reduxjs/toolkit';
import coinsReducer from './coinsSlice';
import { listenerMiddleware } from './listenerMiddleware';

export const store = configureStore({
  reducer: {
    coins: coinsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware),
});

// Inferred types — keep these in sync automatically as the store grows.
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
