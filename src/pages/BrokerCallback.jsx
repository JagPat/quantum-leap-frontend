import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BrokerCallback() {
    const [status, setStatus] = useState('processing');
    const [message, setMessage] = useState('Processing authentication...');

    useEffect(() => {
        console.log('🔄 BrokerCallback: Starting callback processing...');
        
        const urlParams = new URLSearchParams(window.location.search);
        const requestTokenParam = urlParams.get('request_token');
        const statusParam = urlParams.get('status');
        const userIdParam = urlParams.get('user_id');
        const errorParam = urlParams.get('error');
        const action = urlParams.get('action');
        
        console.log('🔍 BrokerCallback: URL search params:', window.location.search);
        console.log('🔍 BrokerCallback: status param:', statusParam);
        console.log('🔍 BrokerCallback: request_token param:', requestTokenParam);
        console.log('🔍 BrokerCallback: user_id param:', userIdParam);
        console.log('🔍 BrokerCallback: error param:', errorParam);
        
        // CRITICAL FIX: Support both localhost and production origins
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:3000',
            window.location.origin
        ];
        
        const targetOrigin = window.opener?.location?.origin || window.location.origin;
        console.log('🔍 BrokerCallback: Target origin for postMessage:', targetOrigin);
        
        try {
            // NEW: Handle status-based redirects from backend
            if (statusParam === 'success') {
                console.log('✅ BrokerCallback: Backend completed token exchange successfully');
                
                // CRITICAL FIX: Set localStorage for successful authentication
                if (userIdParam) {
                    localStorage.setItem('broker_status', 'Connected');
                    localStorage.setItem('broker_user_id', userIdParam);
                    localStorage.setItem('broker_access_token', 'authenticated'); // Placeholder since backend handled exchange
                    console.log('✅ BrokerCallback: Updated localStorage with broker status');
                }
                
                if (window.opener && !window.opener.closed) {
                    try {
                        // CRITICAL FIX: Use localhost origin for postMessage
                        const targetOrigin = 'http://localhost:5173';
                        
                        // Send success message with user data
                        window.opener.postMessage({
                            type: 'BROKER_AUTH_SUCCESS',
                            status: 'success',
                            user_id: userIdParam,
                            backend_exchange: true
                        }, targetOrigin);
                        
                        console.log('✅ BrokerCallback: Sent success message to parent window');
                        
                        setStatus('success');
                        setMessage('Authentication successful! Connection established.');
                        
                        // Trigger parent window reload to update status
                        setTimeout(() => {
                            if (window.opener && !window.opener.closed) {
                                window.opener.location.reload();
                            }
                        }, 1500);
                        
                    } catch (postMessageError) {
                        console.error('❌ BrokerCallback: Failed to send success message to parent:', postMessageError);
                        setStatus('error');
                        setMessage('Authentication successful but failed to communicate with parent window.');
                    }
                } else {
                    console.error('❌ BrokerCallback: No valid parent window found');
                    setStatus('error');
                    setMessage('Authentication successful but parent window is not available.');
                }
            } else if (statusParam === 'error') {
                console.error('❌ BrokerCallback: Backend reported error:', errorParam);
                
                if (window.opener && !window.opener.closed) {
                    window.opener.postMessage({
                        type: 'BROKER_AUTH_ERROR',
                        error: errorParam || 'Backend authentication failed'
                    }, targetOrigin);
                }
                
                setStatus('error');
                setMessage(`Authentication failed: ${errorParam || 'Unknown error'}`);
            } else if (requestTokenParam) {
                // FALLBACK: Handle request_token-based redirects (existing flow)
                let cleanRequestToken = requestTokenParam.trim();
                
                // Handle case where request_token might be a full URL
                if (cleanRequestToken.startsWith('http') || cleanRequestToken.includes('://')) {
                    try {
                        const url = new URL(cleanRequestToken);
                        const params = new URLSearchParams(url.search);
                        
                        if (params.has('request_token')) {
                            cleanRequestToken = params.get('request_token');
                        } else if (params.has('sess_id')) {
                            cleanRequestToken = params.get('sess_id');
                        } else {
                            console.error('🔍 BrokerCallback: No valid token parameter found in URL');
                            throw new Error('No valid token parameter found in URL');
                        }
                    } catch (urlError) {
                        console.error('🔍 BrokerCallback: Error parsing URL:', urlError);
                        cleanRequestToken = ''; // Invalidate on parsing error
                    }
                }
                
                console.log('🔍 BrokerCallback: Clean request_token:', cleanRequestToken);
                
                if (cleanRequestToken && cleanRequestToken.length > 5) {
                    console.log('✅ BrokerCallback: Sending request_token to parent for frontend exchange');
                    
                    if (window.opener && !window.opener.closed) {
                        try {
                            // Send clean token back to parent window for frontend exchange
                            window.opener.postMessage({
                                type: 'BROKER_AUTH_SUCCESS',
                                requestToken: cleanRequestToken,
                                backend_exchange: false
                            }, targetOrigin);
                            
                            setStatus('success');
                            setMessage('Authentication successful! Completing setup...');
                        } catch (postMessageError) {
                            console.error('❌ BrokerCallback: Failed to send message to parent:', postMessageError);
                            setStatus('error');
                            setMessage('Authentication successful but failed to communicate with parent window.');
                        }
                    } else {
                        console.error('❌ BrokerCallback: No valid parent window found');
                        setStatus('error');
                        setMessage('Authentication successful but parent window is not available.');
                    }
                } else {
                    console.error('❌ BrokerCallback: Invalid token - too short or empty');
                    
                    if (window.opener && !window.opener.closed) {
                        window.opener.postMessage({
                            type: 'BROKER_AUTH_ERROR',
                            error: 'Invalid or empty request token received from Zerodha.'
                        }, targetOrigin);
                    }
                    
                    setStatus('error');
                    setMessage('Invalid token received. Please try again.');
                }
            } else {
                console.error('❌ BrokerCallback: No valid parameters found in URL');
                
                // Check if we have sess_id directly in URL params
                const sessId = urlParams.get('sess_id');
                if (sessId) {
                    console.log('🔍 BrokerCallback: Found sess_id directly:', sessId);
                    
                    if (window.opener && !window.opener.closed) {
                        window.opener.postMessage({
                            type: 'BROKER_AUTH_SUCCESS',
                            requestToken: sessId,
                            backend_exchange: false
                        }, targetOrigin);
                    }
                    
                    setStatus('success');
                    setMessage('Authentication successful! Completing setup...');
                } else {
                    if (window.opener && !window.opener.closed) {
                        window.opener.postMessage({
                            type: 'BROKER_AUTH_ERROR',
                            error: 'Authentication failed. No valid parameters returned from Zerodha.'
                        }, targetOrigin);
                    }
                    
                    setStatus('error');
                    setMessage('Authentication failed. Please try again.');
                }
            }

            // Auto-close the popup after a delay
            setTimeout(() => {
                try {
                    window.close();
                } catch (e) {
                    console.log('Could not close window automatically');
                }
            }, 3000);

        } catch (error) {
            console.error('❌ BrokerCallback: Unexpected error:', error);
            setStatus('error');
            setMessage(`Error processing authentication: ${error.message}`);
            
            if (window.opener && !window.opener.closed) {
                window.opener.postMessage({
                    type: 'BROKER_AUTH_ERROR',
                    error: `Callback processing error: ${error.message}`
                }, targetOrigin);
            }
        }
    }, []);

    const StatusIcon = () => {
        switch (status) {
            case 'success':
                return <CheckCircle className="w-16 h-16 text-green-500" />;
            case 'error':
                return <XCircle className="w-16 h-16 text-red-500" />;
            default:
                return <Loader2 className="w-16 h-16 text-amber-500 animate-spin" />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-slate-800/50 border-white/10 text-white">
                <CardHeader>
                    <CardTitle className="text-center text-2xl">Zerodha Connection</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                    <div className="flex justify-center">
                        <StatusIcon />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xl font-semibold text-slate-200">{message}</p>
                        <p className="text-sm text-slate-400">
                            {status === 'processing' ? "Processing authentication..." : "This window will close automatically."}
                        </p>
                        {status === 'error' && (
                            <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded">
                                <p className="text-sm text-red-300">
                                    Debug info: {window.location.href}
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}