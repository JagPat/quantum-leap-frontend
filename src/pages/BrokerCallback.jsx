import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, ArrowLeft, X } from "lucide-react";

export default function BrokerCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [requestToken, setRequestToken] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Parse the URL parameters
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('request_token');
    const errorParam = urlParams.get('error');
    const action = urlParams.get('action');

    console.log('Callback URL params:', { token, errorParam, action });

    if (errorParam) {
      handleAuthError(errorParam);
    } else if (token) {
      handleAuthSuccess(token);
    } else {
      // Check if we're on the Zerodha finish page with different parameters
      const sessId = urlParams.get('sess_id');
      const apiKey = urlParams.get('api_key');
      
      if (sessId && apiKey) {
        // This might be a Zerodha finish page, try to extract token from URL hash or body
        checkZerodhaFinishPage();
      } else {
        handleAuthError('No request token received from broker');
      }
    }
  }, [location]);

  const checkZerodhaFinishPage = async () => {
    try {
      // Try to detect if we're on Zerodha's finish page
      const currentUrl = window.location.href;
      console.log('Current URL:', currentUrl);
      
      // If we detect Zerodha's error response
      if (currentUrl.includes('connect/finish')) {
        // Try to read the page content to detect errors
        const pageText = document.body.innerText;
        
        if (pageText.includes('user is not enabled') || pageText.includes('InputException')) {
          handleAuthError('The user is not enabled for the app. Please add your Zerodha Client ID to your Kite Connect app settings.');
        } else if (pageText.includes('error')) {
          handleAuthError('Authentication failed. Please check your API credentials and try again.');
        } else {
          // Try to find request token in the page
          const tokenMatch = pageText.match(/request_token["\s]*[:=]["\s]*([a-zA-Z0-9]+)/);
          if (tokenMatch) {
            handleAuthSuccess(tokenMatch[1]);
          } else {
            handleAuthError('Unable to extract request token from response');
          }
        }
      } else {
        handleAuthError('Invalid callback URL format');
      }
    } catch (error) {
      console.error('Error checking Zerodha finish page:', error);
      handleAuthError('Error processing authentication response');
    }
  };

  const handleAuthSuccess = (token) => {
    console.log('Auth success with token:', token);
    setStatus('success');
    setRequestToken(token);
    
    // Send success to parent window
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({
        type: 'BROKER_AUTH_SUCCESS',
        requestToken: token
      }, window.location.origin);
    }

    // Start auto-close countdown
    startAutoClose();
  };

  const handleAuthError = (errorMessage) => {
    console.log('Auth error:', errorMessage);
    setStatus('error');
    setError(errorMessage);
    
    // Send error to parent window
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({
        type: 'BROKER_AUTH_ERROR',
        error: errorMessage
      }, window.location.origin);
    }
  };

  const startAutoClose = () => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleClose = () => {
    if (window.opener && !window.opener.closed) {
      window.close();
    } else {
      navigate(createPageUrl('Settings'));
    }
  };

  const handleRetry = () => {
    if (window.opener && !window.opener.closed) {
      window.close();
    } else {
      navigate(createPageUrl('Settings'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <Card className="trading-card">
          <CardHeader className="text-center">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1"></div>
              <CardTitle className="flex items-center justify-center gap-2 flex-1">
                {status === 'success' ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    Authentication Successful
                  </>
                ) : status === 'error' ? (
                  <>
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    Authentication Failed
                  </>
                ) : (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
                    Processing Authentication...
                  </>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {status === 'success' && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800">Connection Established</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Your Zerodha account has been successfully authenticated. 
                    You can now access your live portfolio data.
                  </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Request Token:</strong> {requestToken.substring(0, 8)}...{requestToken.substring(-4)}
                  </p>
                </div>

                <div className="text-sm text-slate-600">
                  This window will close automatically in {countdown} seconds
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    onClick={handleClose}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Close Window
                  </Button>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-800">Authentication Failed</span>
                  </div>
                  <p className="text-sm text-red-700 mb-3">
                    {error}
                  </p>
                  
                  {error.includes('user is not enabled') && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-3">
                      <p className="text-xs text-yellow-800">
                        <strong>How to fix:</strong> Log into your Kite Connect app at developers.kite.trade, 
                        go to your app settings, and add your Zerodha Client ID to the "Enabled users" list.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    onClick={handleRetry}
                    variant="outline"
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Settings
                  </Button>
                  <Button 
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Close Window
                  </Button>
                </div>
              </>
            )}

            {status === 'processing' && (
              <div className="space-y-4">
                <p className="text-slate-600">
                  Verifying your authentication with Zerodha...
                </p>
                <div className="text-xs text-slate-500">
                  Please wait while we process your login
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}