import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BrokerCallback() {
    const [status, setStatus] = useState('processing');
    const [message, setMessage] = useState('Processing authentication...');

    useEffect(() => {
        console.log('🔄 BrokerCallback: Starting callback processing...');
        console.log('🔍 BrokerCallback: Window opener available:', !!window.opener);
        console.log('🔍 BrokerCallback: Window opener closed:', window.opener?.closed);
        console.log('🔍 BrokerCallback: Current origin:', window.location.origin);
        
        const urlParams = new URLSearchParams(window.location.search);
        const requestTokenParam = urlParams.get('request_token');
        const statusParam = urlParams.get('status');
        const userIdParam = urlParams.get('user_id');
        const errorParam = urlParams.get('error');
        const stateParam = urlParams.get('state');
        
        console.log('🔍 BrokerCallback: URL params:', {
            status: statusParam,
            request_token: requestTokenParam,
            user_id: userIdParam,
            error: errorParam,
            state: stateParam
        });

        // Enhanced parent window detection and communication
        const sendToParent = (messageData) => {
            console.log('🔍 BrokerCallback: Checking parent window availability...');
            
            // Check if window.opener exists and is not closed
            if (!window.opener) {
                console.error('❌ BrokerCallback: window.opener is null');
                setStatus('error');
                setMessage('Authentication successful but failed to communicate with parent window.\nPlease close this window and try again from the main application.');
                return false;
            }
            
            if (window.opener.closed) {
                console.error('❌ BrokerCallback: Parent window is closed');
                setStatus('error');
                setMessage('Parent window was closed. Please try again from the main application.');
                return false;
            }
            
            // Get the correct target origin
            const targetOrigin = getTargetOrigin();
            console.log('🎯 BrokerCallback: Using target origin:', targetOrigin);
            
            try {
                console.log(`📤 BrokerCallback: Sending message to parent:`, messageData);
                window.opener.postMessage(messageData, targetOrigin);
                console.log('✅ BrokerCallback: Message sent successfully');
                return true;
            } catch (error) {
                console.error('❌ BrokerCallback: Failed to send message to parent:', error);
                setStatus('error');
                setMessage('Authentication successful but failed to communicate with parent window.\nError: ' + error.message);
                return false;
            }
        };
        
        // Process callback based on status
        if (statusParam === 'success' && requestTokenParam) {
            // OAuth completed successfully with request token
            handleSuccessWithTokenCallback(requestTokenParam, sendToParent);
        } else if (statusParam === 'success') {
            handleSuccessCallback(userIdParam, sendToParent);
        } else if (statusParam === 'error') {
            handleErrorCallback(errorParam, sendToParent);
        } else if (requestTokenParam) {
            handleTokenCallback(requestTokenParam, sendToParent);
        } else {
            handleNoParamsCallback(sendToParent);
        }
        
        function handleSuccessWithTokenCallback(requestToken, sendToParent) {
            console.log('✅ BrokerCallback: OAuth completed successfully with request token:', requestToken);
            
            // Store the successful authentication
            localStorage.setItem('broker_status', 'Connected');
            localStorage.setItem('broker_request_token', requestToken);
            
            // Prepare comprehensive message data
            const messageData = {
                type: 'BROKER_AUTH_SUCCESS',
                status: 'success',
                requestToken: requestToken,
                state: stateParam,
                backend_exchange: true,
                timestamp: new Date().toISOString(),
                source: 'broker-callback'
            };
            
            console.log('📤 BrokerCallback: Preparing to send success message:', messageData);
            
            // Add a small delay to ensure parent window is ready
            setTimeout(() => {
                const success = sendToParent(messageData);
                
                if (success) {
                    setStatus('success');
                    setMessage('Authentication successful! Connection established.\nThis window will close automatically.');
                    
                    // Close window after a short delay
                    setTimeout(() => {
                        console.log('🔄 BrokerCallback: Closing popup window');
                        window.close();
                    }, 3000);
                } else {
                    setStatus('error');
                    setMessage('Authentication successful but failed to communicate with parent window.\nPlease close this window and try again from the main application.');
                }
            }, 500); // 500ms delay to ensure parent is ready
        }

        function handleSuccessCallback(userId, sendToParent) {
            console.log('✅ BrokerCallback: Backend completed token exchange successfully');
            
            if (userId) {
                localStorage.setItem('broker_status', 'Connected');
                localStorage.setItem('broker_user_id', userId);
                localStorage.setItem('broker_access_token', 'authenticated');
            }
            
            const success = sendToParent({
                type: 'BROKER_AUTH_SUCCESS',
                status: 'success',
                user_id: userId,
                backend_exchange: true
            });
            
            if (success) {
                setStatus('success');
                setMessage('Authentication successful! Connection established.');
                setTimeout(() => {
                    if (window.opener && !window.opener.closed) {
                        window.opener.location.reload();
                    }
                }, 1500);
            } else {
                setStatus('error');
                setMessage('Authentication successful but failed to communicate with parent window.');
            }
        }
        
        function handleErrorCallback(error, sendToParent) {
            console.error('❌ BrokerCallback: Backend reported error:', error);
            
            sendToParent({
                type: 'BROKER_AUTH_ERROR',
                error: error || 'Backend authentication failed'
            });
            
            setStatus('error');
            setMessage(`Authentication failed: ${error || 'Unknown error'}`);
        }
        
        function handleTokenCallback(requestToken, sendToParent) {
            let cleanToken = requestToken.trim();
            
            // Handle URL-encoded tokens
            if (cleanToken.startsWith('http') || cleanToken.includes('://')) {
                try {
                    const url = new URL(cleanToken);
                    const params = new URLSearchParams(url.search);
                    cleanToken = params.get('request_token') || params.get('sess_id') || '';
                } catch (e) {
                    console.error('🔍 BrokerCallback: Error parsing token URL:', e);
                    cleanToken = '';
                }
            }
            
            if (cleanToken && cleanToken.length > 5) {
                console.log('✅ BrokerCallback: Sending request_token to parent');
                
                const success = sendToParent({
                    type: 'BROKER_AUTH_SUCCESS',
                    requestToken: cleanToken,
                    backend_exchange: false
                });
                
                if (success) {
                    setStatus('success');
                    setMessage('Authentication successful! Completing setup...');
                } else {
                    setStatus('error');
                    setMessage('Authentication successful but failed to communicate with parent window.');
                }
            } else {
                console.error('❌ BrokerCallback: Invalid token received');
                sendToParent({
                    type: 'BROKER_AUTH_ERROR',
                    error: 'Invalid or empty request token received from Zerodha.'
                });
                setStatus('error');
                setMessage('Invalid token received. Please try again.');
            }
        }
        
        function handleNoParamsCallback(sendToParent) {
            const sessId = urlParams.get('sess_id');
            if (sessId) {
                console.log('🔍 BrokerCallback: Found sess_id:', sessId);
                sendToParent({
                    type: 'BROKER_AUTH_SUCCESS',
                    requestToken: sessId,
                    backend_exchange: false
                });
                setStatus('success');
                setMessage('Authentication successful! Completing setup...');
            } else {
                sendToParent({
                    type: 'BROKER_AUTH_ERROR',
                    error: 'Authentication failed. No valid parameters returned from Zerodha.'
                });
                setStatus('error');
                setMessage('Authentication failed. Please try again.');
            }
        }
        
    }, []);

    // Enhanced parent origin detection
    function getTargetOrigin() {
        // Always use the production frontend origin for consistency
        const productionOrigin = 'https://quantum-leap-frontend-production.up.railway.app';
        
        // Check if we're on the same origin as production
        if (window.location.origin === productionOrigin) {
            console.log('🎯 BrokerCallback: Using same origin for postMessage');
            return productionOrigin;
        }
        
        // For development, try to detect parent origin safely
        try {
            if (window.opener && !window.opener.closed) {
                // Try to access parent origin (will fail if cross-origin)
                const parentOrigin = window.opener.location.origin;
                console.log('🎯 BrokerCallback: Detected parent origin:', parentOrigin);
                return parentOrigin;
            }
        } catch (securityError) {
            console.warn('⚠️ BrokerCallback: Cross-origin restriction, using fallback');
        }
        
        // Fallback to referrer
        if (document.referrer) {
            try {
                const referrerOrigin = new URL(document.referrer).origin;
                console.log('🎯 BrokerCallback: Using referrer origin:', referrerOrigin);
                return referrerOrigin;
            } catch (e) {
                console.warn('⚠️ BrokerCallback: Invalid referrer URL');
            }
        }
        
        // Final fallback - use wildcard for development
        console.log('🎯 BrokerCallback: Using wildcard origin for development');
        return '*';
    }

    const getStatusIcon = () => {
        switch (status) {
            case 'success':
                return <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />;
            case 'error':
                return <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />;
            default:
                return <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />;
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'success':
                return 'text-green-600';
            case 'error':
                return 'text-red-600';
            default:
                return 'text-blue-600';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-slate-800">
                        Broker Authentication
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    {getStatusIcon()}
                    <h2 className={`text-xl font-semibold mb-2 ${getStatusColor()}`}>
                        {status === 'processing' && 'Processing...'}
                        {status === 'success' && 'Success!'}
                        {status === 'error' && 'Error'}
                    </h2>
                    <p className="text-slate-600 mb-6">{message}</p>
                    
                    {status === 'success' && (
                        <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                            You can close this window. The main application will update automatically.
                        </div>
                    )}
                    
                    {status === 'error' && (
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                            Please close this window and try again from the main application.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}