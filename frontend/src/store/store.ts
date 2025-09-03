import { configureStore } from '@reduxjs/toolkit'
import { portfolioSlice } from './portfolio/portfolioSlice'
import { brokerSlice } from './broker/brokerSlice'

export const store = configureStore({
  reducer: {
    portfolio: portfolioSlice.reducer,
    broker: brokerSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch