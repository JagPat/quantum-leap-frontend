
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Server, 
  AlertTriangle, 
  CheckCircle, 
  ExternalLink,
  Code,
  Database
} from "lucide-react";

export default function BackendConnectionHelper() {
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [backendUrl, setBackendUrl] = useState('/api/broker');

  const testBackendConnection = async () => {
    setConnectionStatus('checking');
    
    try {
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      setConnectionStatus('error');
      console.error('Backend connection test failed:', error);
    }
  };

  React.useEffect(() => {
    testBackendConnection();
  }, []);

  return (
    <Card className="trading-card border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Server className="w-5 h-5" />
          Backend Integration Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-800">Backend API Status</span>
          <Badge 
            variant={connectionStatus === 'connected' ? 'default' : 'destructive'}
            className={`${
              connectionStatus === 'connected' 
                ? 'bg-green-100 text-green-800 border-green-200' 
                : connectionStatus === 'checking'
                ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                : 'bg-red-100 text-red-800 border-red-200'
            }`}
          >
            {connectionStatus === 'connected' && <CheckCircle className="w-3 h-3 mr-1" />}
            {connectionStatus === 'error' && <AlertTriangle className="w-3 h-3 mr-1" />}
            {connectionStatus === 'checking' ? 'Checking...' : 
             connectionStatus === 'connected' ? 'Connected' : 'Not Available'}
          </Badge>
        </div>

        {connectionStatus === 'error' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Backend Required:</strong> To enable live broker integration, you need to implement 
              the backend API endpoints. The frontend is ready and will automatically connect once 
              the backend is deployed.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-800">Required Endpoints:</span>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs text-blue-700 bg-white/50 rounded p-3">
            <div>• POST /api/broker/generate-session</div>
            <div>• POST /api/broker/profile</div>
            <div>• POST /api/broker/holdings</div>
            <div>• POST /api/broker/positions</div>
            <div>• POST /api/broker/margins</div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={testBackendConnection}
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            Test Connection
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Open API specification in a new tab
              window.open('/api-docs', '_blank');
            }}
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            <Code className="w-4 h-4 mr-2" />
            View API Docs
          </Button>
        </div>

        <div className="mt-4 p-3 bg-white/50 rounded border border-blue-200">
          <p className="text-xs text-blue-700">
            <strong>Development Note:</strong> The frontend is fully functional and ready. 
            Once you implement the backend API using Python (kiteconnect library) or Node.js, 
            the live broker integration will work seamlessly.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
