import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { jest } from '@jest/globals';

import BrokerSetup from '../../components/broker/BrokerSetup';
import brokerSlice from '../../store/broker/brokerSlice';

// Mock the broker API service
jest.mock('../../services/brokerAPI', () => ({
  setupOAuth: jest.fn(),
  getConnectionStatus: jest.fn(),
  disconnect: jest.fn()
}));

const mockStore = configureStore({
  reducer: {
    broker: brokerSlice
  }
});

describe('BrokerSetup Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <Provider store={mockStore}>
        {component}
      </Provider>
    );
  };

  it('should render credential input form', () => {
    renderWithProvider(<BrokerSetup />);
    
    expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/api secret/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    renderWithProvider(<BrokerSetup />);
    
    const connectButton = screen.getByRole('button', { name: /connect/i });
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(screen.getByText(/api key is required/i)).toBeInTheDocument();
      expect(screen.getByText(/api secret is required/i)).toBeInTheDocument();
    });
  });

  it('should validate API key format', async () => {
    renderWithProvider(<BrokerSetup />);
    
    const apiKeyInput = screen.getByLabelText(/api key/i);
    fireEvent.change(apiKeyInput, { target: { value: 'short' } });
    fireEvent.blur(apiKeyInput);

    await waitFor(() => {
      expect(screen.getByText(/api key must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('should validate API secret format', async () => {
    renderWithProvider(<BrokerSetup />);
    
    const apiSecretInput = screen.getByLabelText(/api secret/i);
    fireEvent.change(apiSecretInput, { target: { value: 'short' } });
    fireEvent.blur(apiSecretInput);

    await waitFor(() => {
      expect(screen.getByText(/api secret must be at least 16 characters/i)).toBeInTheDocument();
    });
  });

  it('should initiate OAuth flow with valid credentials', async () => {
    const mockSetupOAuth = require('../../services/brokerAPI').setupOAuth;
    mockSetupOAuth.mockResolvedValue({
      success: true,
      data: { oauthUrl: 'https://kite.zerodha.com/connect/login?api_key=test' }
    });

    // Mock window.open
    const mockWindowOpen = jest.fn();
    Object.defineProperty(window, 'open', { value: mockWindowOpen });

    renderWithProvider(<BrokerSetup />);
    
    const apiKeyInput = screen.getByLabelText(/api key/i);
    const apiSecretInput = screen.getByLabelText(/api secret/i);
    const connectButton = screen.getByRole('button', { name: /connect/i });

    fireEvent.change(apiKeyInput, { target: { value: 'valid_api_key_123' } });
    fireEvent.change(apiSecretInput, { target: { value: 'valid_api_secret_123456789' } });
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(mockSetupOAuth).toHaveBeenCalledWith({
        apiKey: 'valid_api_key_123',
        apiSecret: 'valid_api_secret_123456789'
      });
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://kite.zerodha.com/connect/login?api_key=test',
        'oauth_popup',
        expect.stringContaining('width=600,height=700')
      );
    });
  });

  it('should display error message on OAuth setup failure', async () => {
    const mockSetupOAuth = require('../../services/brokerAPI').setupOAuth;
    mockSetupOAuth.mockRejectedValue(new Error('Invalid API credentials'));

    renderWithProvider(<BrokerSetup />);
    
    const apiKeyInput = screen.getByLabelText(/api key/i);
    const apiSecretInput = screen.getByLabelText(/api secret/i);
    const connectButton = screen.getByRole('button', { name: /connect/i });

    fireEvent.change(apiKeyInput, { target: { value: 'invalid_key' } });
    fireEvent.change(apiSecretInput, { target: { value: 'invalid_secret_123' } });
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid api credentials/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during OAuth setup', async () => {
    const mockSetupOAuth = require('../../services/brokerAPI').setupOAuth;
    mockSetupOAuth.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    renderWithProvider(<BrokerSetup />);
    
    const apiKeyInput = screen.getByLabelText(/api key/i);
    const apiSecretInput = screen.getByLabelText(/api secret/i);
    const connectButton = screen.getByRole('button', { name: /connect/i });

    fireEvent.change(apiKeyInput, { target: { value: 'valid_key_123' } });
    fireEvent.change(apiSecretInput, { target: { value: 'valid_secret_123456' } });
    fireEvent.click(connectButton);

    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    expect(connectButton).toBeDisabled();
  });

  it('should handle successful OAuth callback', async () => {
    renderWithProvider(<BrokerSetup />);
    
    // Simulate OAuth callback message
    const callbackEvent = new MessageEvent('message', {
      data: {
        type: 'OAUTH_SUCCESS',
        connectionStatus: 'connected'
      },
      origin: window.location.origin
    });

    fireEvent(window, callbackEvent);

    await waitFor(() => {
      expect(screen.getByText(/successfully connected/i)).toBeInTheDocument();
    });
  });

  it('should handle OAuth callback errors', async () => {
    renderWithProvider(<BrokerSetup />);
    
    // Simulate OAuth error callback
    const errorEvent = new MessageEvent('message', {
      data: {
        type: 'OAUTH_ERROR',
        error: 'Authorization denied by user'
      },
      origin: window.location.origin
    });

    fireEvent(window, errorEvent);

    await waitFor(() => {
      expect(screen.getByText(/authorization denied/i)).toBeInTheDocument();
    });
  });
});