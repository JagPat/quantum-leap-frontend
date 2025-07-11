// Mock entities to replace Base44 entities
// These are data structure definitions for the application

export const Trade = {
  create: (data) => {
    const trade = { id: Date.now(), ...data, type: 'trade' };
    const existing = JSON.parse(localStorage.getItem('trades') || '[]');
    existing.push(trade);
    localStorage.setItem('trades', JSON.stringify(existing));
    return Promise.resolve(trade);
  },
  
  list: () => {
    const trades = JSON.parse(localStorage.getItem('trades') || '[]');
    // If no trades exist, return some mock data
    if (trades.length === 0) {
      const mockTrades = [
        { id: 1, symbol: 'AAPL', quantity: 100, price: 150.25, side: 'buy', timestamp: new Date().toISOString() },
        { id: 2, symbol: 'GOOGL', quantity: 50, price: 2500.75, side: 'buy', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, symbol: 'MSFT', quantity: 75, price: 300.50, side: 'sell', timestamp: new Date(Date.now() - 7200000).toISOString() }
      ];
      localStorage.setItem('trades', JSON.stringify(mockTrades));
      return Promise.resolve(mockTrades);
    }
    return Promise.resolve(trades);
  },
  
  fields: ['symbol', 'quantity', 'price', 'side', 'timestamp']
};

export const Position = {
  create: (data) => {
    const position = { id: Date.now(), ...data, type: 'position' };
    const existing = JSON.parse(localStorage.getItem('positions') || '[]');
    existing.push(position);
    localStorage.setItem('positions', JSON.stringify(existing));
    return Promise.resolve(position);
  },
  
  list: () => {
    const positions = JSON.parse(localStorage.getItem('positions') || '[]');
    // If no positions exist, return some mock data
    if (positions.length === 0) {
      const mockPositions = [
        { id: 1, symbol: 'AAPL', quantity: 100, average_price: 145.50, current_price: 150.25, pnl: 475.00 },
        { id: 2, symbol: 'GOOGL', quantity: 50, average_price: 2450.00, current_price: 2500.75, pnl: 2537.50 },
        { id: 3, symbol: 'MSFT', quantity: -25, average_price: 305.00, current_price: 300.50, pnl: 112.50 }
      ];
      localStorage.setItem('positions', JSON.stringify(mockPositions));
      return Promise.resolve(mockPositions);
    }
    return Promise.resolve(positions);
  },
  
  fields: ['symbol', 'quantity', 'average_price', 'current_price', 'pnl']
};

export const Strategy = {
  create: (data) => {
    const strategy = { id: Date.now(), ...data, type: 'strategy' };
    const existing = JSON.parse(localStorage.getItem('strategies') || '[]');
    existing.push(strategy);
    localStorage.setItem('strategies', JSON.stringify(existing));
    return Promise.resolve(strategy);
  },
  
  list: () => {
    const strategies = JSON.parse(localStorage.getItem('strategies') || '[]');
    // If no strategies exist, return some mock data
    if (strategies.length === 0) {
      const mockStrategies = [
        { id: 1, name: 'Momentum Strategy', description: 'Buy high momentum stocks', rules: [], active: true },
        { id: 2, name: 'Mean Reversion', description: 'Buy oversold stocks', rules: [], active: false },
        { id: 3, name: 'Breakout Strategy', description: 'Buy stocks breaking resistance', rules: [], active: true }
      ];
      localStorage.setItem('strategies', JSON.stringify(mockStrategies));
      return Promise.resolve(mockStrategies);
    }
    return Promise.resolve(strategies);
  },
  
  update: (id, data) => {
    const strategies = JSON.parse(localStorage.getItem('strategies') || '[]');
    const index = strategies.findIndex(s => s.id === id);
    if (index !== -1) {
      strategies[index] = { ...strategies[index], ...data };
      localStorage.setItem('strategies', JSON.stringify(strategies));
      return Promise.resolve(strategies[index]);
    }
    throw new Error('Strategy not found');
  },
  
  fields: ['name', 'description', 'rules', 'active']
};

export const BrokerConfig = {
  create: (data) => {
    const config = { id: Date.now(), ...data, type: 'broker_config' };
    // Store in localStorage for persistence
    const existing = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
    existing.push(config);
    localStorage.setItem('brokerConfigs', JSON.stringify(existing));
    return Promise.resolve(config);
  },
  
  list: () => {
    const configs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
    return Promise.resolve(configs);
  },
  
  filter: (criteria) => {
    const configs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
    const filtered = configs.filter(config => {
      return Object.keys(criteria).every(key => config[key] === criteria[key]);
    });
    return Promise.resolve(filtered);
  },
  
  update: (id, data) => {
    const configs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
    const index = configs.findIndex(c => c.id === id);
    if (index !== -1) {
      configs[index] = { ...configs[index], ...data };
      localStorage.setItem('brokerConfigs', JSON.stringify(configs));
      return Promise.resolve(configs[index]);
    }
    throw new Error('Config not found');
  },
  
  delete: (id) => {
    const configs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
    const filtered = configs.filter(c => c.id !== id);
    localStorage.setItem('brokerConfigs', JSON.stringify(filtered));
    return Promise.resolve({ success: true });
  },
  
  fields: ['broker_name', 'api_key', 'api_secret', 'access_token', 'user_id']
};

export const ImportedPosition = {
  create: (data) => {
    const position = { id: Date.now(), ...data, type: 'imported_position' };
    // Store in localStorage for persistence
    const existing = JSON.parse(localStorage.getItem('importedPositions') || '[]');
    existing.push(position);
    localStorage.setItem('importedPositions', JSON.stringify(existing));
    return Promise.resolve(position);
  },
  
  list: () => {
    const positions = JSON.parse(localStorage.getItem('importedPositions') || '[]');
    return Promise.resolve(positions);
  },
  
  fields: ['symbol', 'quantity', 'price', 'source']
};

export const Watchlist = {
  create: (data) => ({ id: Date.now(), ...data, type: 'watchlist' }),
  fields: ['name', 'symbols', 'user_id']
};

export const DashboardWidget = {
  create: (data) => {
    const widget = { id: Date.now(), ...data, type: 'widget' };
    const existing = JSON.parse(localStorage.getItem('dashboardWidgets') || '[]');
    existing.push(widget);
    localStorage.setItem('dashboardWidgets', JSON.stringify(existing));
    return Promise.resolve(widget);
  },
  
  list: () => {
    const widgets = JSON.parse(localStorage.getItem('dashboardWidgets') || '[]');
    // If no widgets exist, return some mock data
    if (widgets.length === 0) {
      const mockWidgets = [
        { id: 1, name: 'Portfolio Summary', type: 'portfolio', config: {}, position: { x: 0, y: 0 } },
        { id: 2, name: 'Recent Trades', type: 'trades', config: {}, position: { x: 1, y: 0 } },
        { id: 3, name: 'Market Status', type: 'market', config: {}, position: { x: 0, y: 1 } },
        { id: 4, name: 'P&L Chart', type: 'chart', config: {}, position: { x: 1, y: 1 } }
      ];
      localStorage.setItem('dashboardWidgets', JSON.stringify(mockWidgets));
      return Promise.resolve(mockWidgets);
    }
    return Promise.resolve(widgets);
  },
  
  filter: (criteria) => {
    const widgets = JSON.parse(localStorage.getItem('dashboardWidgets') || '[]');
    const filtered = widgets.filter(widget => {
      return Object.keys(criteria).every(key => widget[key] === criteria[key]);
    });
    return Promise.resolve(filtered);
  },
  
  update: (id, data) => {
    const widgets = JSON.parse(localStorage.getItem('dashboardWidgets') || '[]');
    const index = widgets.findIndex(w => w.id === id);
    if (index !== -1) {
      widgets[index] = { ...widgets[index], ...data };
      localStorage.setItem('dashboardWidgets', JSON.stringify(widgets));
      return Promise.resolve(widgets[index]);
    }
    throw new Error('Widget not found');
  },
  
  delete: (id) => {
    const widgets = JSON.parse(localStorage.getItem('dashboardWidgets') || '[]');
    const filtered = widgets.filter(w => w.id !== id);
    localStorage.setItem('dashboardWidgets', JSON.stringify(filtered));
    return Promise.resolve({ success: true });
  },
  
  fields: ['name', 'type', 'config', 'position']
};

// Mock user/auth object
export const User = {
  getCurrentUser: () => ({
    id: 'local_user',
    email: 'local@development.com',
    name: 'Development User',
    full_name: 'Development User',
    authenticated: false,
    broker_connected: false,
    broker_type: null,
    token: null
  }),
  
  me: () => Promise.resolve({
    id: 'local_user',
    email: 'local@development.com',
    name: 'Development User',
    full_name: 'Development User',
    authenticated: false,
    broker_connected: false,
    broker_type: null,
    token: null
  }),
  
  updateMyUserData: (data) => {
    // Store user data updates in localStorage
    const currentData = JSON.parse(localStorage.getItem('userData') || '{}');
    const updatedData = { ...currentData, ...data };
    localStorage.setItem('userData', JSON.stringify(updatedData));
    return Promise.resolve(updatedData);
  },
  
  isAuthenticated: () => false,
  login: () => Promise.resolve({ success: false, message: 'Use broker authentication instead' }),
  logout: () => Promise.resolve({ success: true })
};
