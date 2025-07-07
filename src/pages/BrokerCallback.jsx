
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
        const requestToken = urlParams.get('request_token');

        // Dynamically determine the parent's origin from the referrer
        const parentOrigin = document.referrer ? new URL(document.referrer).origin : null;
        
        if (window.opener && parentOrigin) {
            if (requestToken) {
                // ✅ Success: Send token back to parent using its dynamically detected origin
                window.opener.postMessage({
                    type: 'BROKER_AUTH_SUCCESS',
                    requestToken: requestToken
                }, parentOrigin);

                setStatus('success');
                setMessage('Authentication successful! You can now close this window.');
            } else {
                // ❌ Failure: Notify parent using its dynamically detected origin
                window.opener.postMessage({
                    type: 'BROKER_AUTH_ERROR',
                    error: 'Authentication failed or was cancelled.'
                }, parentOrigin);

                setStatus('error');
                setMessage('Authentication failed. Please try again.');
            }

            // Auto-close the popup after a short delay
            setTimeout(() => {
                window.close();
            }, 3000);

        } else {
            // This was opened directly, not as a popup, or referrer was not available
            setStatus('error');
            setMessage('This page should be opened from the Broker Setup page. Please restart the connection process.');
            if (!parentOrigin) {
                console.error("Could not determine parent origin from document.referrer.");
            }
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
