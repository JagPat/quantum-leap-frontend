import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BrokerCallback() {
    const [status, setStatus] = useState('processing');
    const [message, setMessage] = useState('Finalizing connection with Zerodha...');
    const location = useLocation();

    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const requestTokenParam = urlParams.get('request_token');

        // Explicitly set the parent window's origin as requested
        const targetOrigin = 'https://app.base44.com';
        
        if (window.opener) {
            if (requestTokenParam) {
                // 🔥 CRITICAL FIX: Extract clean request token
                let cleanRequestToken = requestTokenParam.trim();
                
                // Handle case where request_token might be a URL (shouldn't happen here but let's be safe)
                if (cleanRequestToken.startsWith('http') || cleanRequestToken.includes('://')) {
                    console.log('Request token appears to be a URL, extracting clean token...');
                    try {
                        const url = new URL(cleanRequestToken);
                        const params = new URLSearchParams(url.search);
                        
                        // Check for request_token parameter first
                        if (params.has('request_token')) {
                            cleanRequestToken = params.get('request_token');
                        }
                        // Check for sess_id parameter (Zerodha's format)
                        else if (params.has('sess_id')) {
                            cleanRequestToken = params.get('sess_id');
                        }
                        else {
                            throw new Error('No valid token found in URL parameters');
                        }
                    } catch (urlError) {
                        console.error('Error parsing request token URL:', urlError);
                        cleanRequestToken = requestTokenParam; // Fallback to original
                    }
                }
                
                // Validate the cleaned token
                if (!cleanRequestToken || cleanRequestToken.length < 10) {
                    console.error('Invalid request token received:', cleanRequestToken);
                    
                    // ❌ Failure: Send error to parent
                    window.opener.postMessage({
                        type: 'BROKER_AUTH_ERROR',
                        error: 'Invalid request token received from Zerodha'
                    }, targetOrigin);

                    setStatus('error');
                    setMessage('Invalid authentication token received. Please try again.');
                } else {
                    console.log('✅ Clean request token extracted:', cleanRequestToken);
                    
                    // ✅ Success: Send CLEAN token back to parent
                    window.opener.postMessage({
                        type: 'BROKER_AUTH_SUCCESS',
                        requestToken: cleanRequestToken  // Send the clean token
                    }, targetOrigin);

                    setStatus('success');
                    setMessage('Authentication successful! You can now close this window.');
                }
            } else {
                // ❌ Failure: No token parameter found
                window.opener.postMessage({
                    type: 'BROKER_AUTH_ERROR',
                    error: 'Authentication failed or was cancelled - no request token received.'
                }, targetOrigin);

                setStatus('error');
                setMessage('Authentication failed. Please try again.');
            }

            // Auto-close the popup after a short delay
            setTimeout(() => {
                window.close();
            }, 3000);

        } else {
            // This was opened directly, not as a popup
            setStatus('error');
            setMessage('This page should be opened from the Broker Setup page. Please restart the connection process.');
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
                            {status !== 'processing' && "This window will close automatically."}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}