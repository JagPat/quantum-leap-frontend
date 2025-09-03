import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { handleOAuthCallback } from '../../store/broker/brokerSlice';
import { AppDispatch } from '../../store/store';

/**
 * OAuth Callback Component
 * Handles the OAuth callback from Zerodha and processes the authorization code
 */
const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing OAuth callback...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Extract parameters from URL
        const requestToken = searchParams.get('request_token');
        const state = searchParams.get('state');
        const action = searchParams.get('action');
        const status = searchParams.get('status');

        // Check for error parameters
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorParam) {
          throw new Error(errorDescription || errorParam || 'OAuth authorization failed');
        }

        if (status === 'error') {
          throw new Error('OAuth authorization was denied or failed');
        }

        // Validate required parameters
        if (!requestToken || !state) {
          throw new Error('Missing required OAuth parameters');
        }

        // Get config ID from localStorage (set during OAuth initiation)
        const configId = localStorage.getItem('oauth_config_id');
        const storedState = localStorage.getItem('oauth_state');

        if (!configId) {
          throw new Error('OAuth configuration not found');
        }

        // Validate state parameter (CSRF protection)
        if (state !== storedState) {
          throw new Error('Invalid OAuth state parameter');
        }

        setMessage('Exchanging authorization code for access token...');

        // Dispatch callback handling
        const result = await dispatch(handleOAuthCallback({
          requestToken,
          state,
          configId
        })).unwrap();

        // Clear OAuth data from localStorage
        localStorage.removeItem('oauth_config_id');
        localStorage.removeItem('oauth_state');

        setStatus('success');
        setMessage('OAuth authentication completed successfully!');

        // Communicate success to parent window if in popup
        if (window.opener) {
          window.opener.postMessage({
            type: 'OAUTH_SUCCESS',
            data: result
          }, window.location.origin);
          
          // Close popup after short delay
          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          // Redirect to settings page after delay
          setTimeout(() => {
            navigate('/settings?tab=broker&status=connected');
          }, 2000);
        }

      } catch (error: any) {
        console.error('OAuth callback error:', error);
        
        setStatus('error');
        setError(error.message);
        setMessage('OAuth authentication failed');

        // Clear OAuth data from localStorage
        localStorage.removeItem('oauth_config_id');
        localStorage.removeItem('oauth_state');

        // Communicate error to parent window if in popup
        if (window.opener) {
          window.opener.postMessage({
            type: 'OAUTH_ERROR',
            error: error.message
          }, window.location.origin);
          
          // Close popup after delay
          setTimeout(() => {
            window.close();
          }, 3000);
        } else {
          // Redirect to settings page with error after delay
          setTimeout(() => {
            navigate('/settings?tab=broker&status=error&error=' + encodeURIComponent(error.message));
          }, 3000);
        }
      }
    };

    processCallback();
  }, [searchParams, dispatch, navigate]);

  // Handle manual close for popup
  const handleClose = () => {
    if (window.opener) {
      window.opener.postMessage({
        type: 'OAUTH_CANCELLED'
      }, window.location.origin);
      window.close();
    } else {
      navigate('/settings?tab=broker');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          {/* Status Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4">
            {status === 'processing' && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            )}
            {status === 'success' && (
              <div className="bg-green-100 rounded-full h-12 w-12 flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            )}
            {status === 'error' && (
              <div className="bg-red-100 rounded-full h-12 w-12 flex items-center justify-center">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {status === 'processing' && 'Processing OAuth'}
            {status === 'success' && 'Authentication Successful'}
            {status === 'error' && 'Authentication Failed'}
          </h3>

          {/* Message */}
          <p className="text-sm text-gray-500 mb-4">
            {message}
          </p>

          {/* Error Details */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Progress Indicator */}
          {status === 'processing' && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center space-x-3">
            {status === 'error' && (
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Close
              </button>
            )}
            
            {status === 'success' && !window.opener && (
              <button
                onClick={() => navigate('/settings?tab=broker')}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Settings
              </button>
            )}
          </div>

          {/* Auto-redirect Notice */}
          {(status === 'success' || status === 'error') && (
            <p className="text-xs text-gray-400 mt-4">
              {window.opener ? 'This window will close automatically...' : 'Redirecting automatically...'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;