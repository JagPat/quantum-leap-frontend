import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BrokerCallback() {
    const [status, setStatus] = useState('processing');
    const [message, setMessage] = useState('Finalizing connection with Zerodha...');
    const location = useLocation();

    useEffect(() => {
        if (window.opener) {
            // 🔥 CRITICAL FIX: Use wildcard origin to ensure cross-origin communication works
            const targetOrigin = '*';
            
            console.log('🔍 BrokerCallback: Processing URL:', window.location.href);
            
            const urlParams = new URLSearchParams(location.search);
            const requestTokenParam = urlParams.get('request_token');

            console.log('🔍 BrokerCallback: Raw request_token from URL:', requestTokenParam);

            if (requestTokenParam) {
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
                    console.log('✅ BrokerCallback: Sending success message to parent');
                    
                    // Send clean token back to parent window
                    window.opener.postMessage({
                        type: 'BROKER_AUTH_SUCCESS',
                        requestToken: cleanRequestToken
                    }, targetOrigin);
                    
                    setStatus('success');
                    setMessage('Authentication successful! Closing window...');
                } else {
                    console.error('❌ BrokerCallback: Invalid token - too short or empty');
                    
                    window.opener.postMessage({
                        type: 'BROKER_AUTH_ERROR',
                        error: 'Invalid or empty request token received from Zerodha.'
                    }, targetOrigin);
                    
                    setStatus('error');
                    setMessage('Invalid token received. Please try again.');
                }
            } else {
                console.error('❌ BrokerCallback: No request_token parameter found in URL');
                
                // Check if we have sess_id directly in URL params
                const sessId = urlParams.get('sess_id');
                if (sessId) {
                    console.log('🔍 BrokerCallback: Found sess_id directly:', sessId);
                    
                    window.opener.postMessage({
                        type: 'BROKER_AUTH_SUCCESS',
                        requestToken: sessId
                    }, targetOrigin);
                    
                    setStatus('success');
                    setMessage('Authentication successful! Closing window...');
                } else {
                    window.opener.postMessage({
                        type: 'BROKER_AUTH_ERROR',
                        error: 'Authentication failed. No request token was returned from Zerodha.'
                    }, targetOrigin);
                    
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

        } else {
            console.error('❌ BrokerCallback: No window.opener found');
            setStatus('error');
            setMessage('This page should be opened in a popup window. Please close this tab and try again.');
        }

    }, [location]);

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