import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Link as LinkIcon,
  Download,
  ArrowRight
} from 'lucide-react';
import BrokerSetup from '@/components/broker/BrokerSetup';
import PortfolioImport from '@/components/broker/PortfolioImport';
import { useToast } from '@/components/ui/use-toast';
import useBrokerSession from '@/hooks/useBrokerSession.js';
import brokerAPI from '@/services/brokerAPI.js';
import { railwayAPI } from '@/api/railwayAPI.js';

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'medium'
    }).format(new Date(timestamp));
  } catch (error) {
    return timestamp;
  }
};

const deriveExistingConfig = (session) => {
  if (!session) return null;
  return {
    id: session.configId,
    broker_name: session.brokerName || 'zerodha',
    is_connected: !session.needsReauth,
    connection_status: session.connectionStatus?.state || session.sessionStatus,
    user_data: {
      user_id: session.userId
    }
  };
};

const BrokerIntegration = () => {
  const {
    session,
    loading: sessionLoading,
    refresh: refreshSession,
    needsReauth,
    markNeedsReauth,
    setBrokerSession
  } = useBrokerSession();
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [portfolioSnapshot, setPortfolioSnapshot] = useState(null);
  const [activeTab, setActiveTab] = useState('setup');
  const { toast } = useToast();

  const existingConfig = useMemo(() => deriveExistingConfig(session), [session]);

  const fetchStatus = useCallback(async () => {
    if (!session) {
      setStatus(null);
      return;
    }

    setStatusLoading(true);
    try {
      const result = await brokerAPI.checkConnectionStatus(session.configId, session.userId);
      setStatus(result);
    } catch (error) {
      console.error('❌ [BrokerIntegration] Failed to fetch broker status', error);
      toast({
        title: 'Status check failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setStatusLoading(false);
    }
  }, [session, toast]);

  useEffect(() => {
    if (!sessionLoading && session && !needsReauth) {
      fetchStatus();
      setActiveTab('import');
    } else if (!sessionLoading && (!session || needsReauth)) {
      setActiveTab('setup');
    }
  }, [sessionLoading, session, needsReauth, fetchStatus]);

  const handleManualRefresh = async () => {
    if (!session) {
      markNeedsReauth();
      return;
    }

    try {
      await refreshSession({ configId: session.configId, userId: session.userId });
      await fetchStatus();
      toast({
        title: 'Status refreshed',
        description: 'Latest broker status retrieved.'
      });
    } catch (error) {
      console.error('❌ [BrokerIntegration] Manual refresh failed', error);
      toast({
        title: 'Refresh failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleFetchPortfolio = async () => {
    if (!session || needsReauth) {
      toast({
        title: 'Broker reconnection required',
        description: 'Please reconnect your broker before fetching live data.',
        variant: 'destructive'
      });
      markNeedsReauth();
      return null;
    }

    try {
      const response = await railwayAPI.fetchLivePortfolio(session.userId, {
        configId: session.configId
      });
      if (response?.status === 'success' && response.snapshot) {
        setPortfolioSnapshot(response.snapshot);
        toast({
          title: 'Live portfolio loaded',
          description: 'Latest holdings retrieved successfully.'
        });
        return response.snapshot;
      }
      throw new Error(response?.message || 'Failed to fetch live portfolio');
    } catch (error) {
      console.error('❌ [BrokerIntegration] Failed to fetch portfolio', error);
      toast({
        title: 'Portfolio fetch failed',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const persistIdentifiers = useCallback((payload = {}) => {
    const resolvedConfigId =
      payload.config_id ||
      payload.configId ||
      payload.id ||
      payload?.connectionStatus?.configId ||
      payload?.connection_status?.config_id ||
      payload?.backend_connection?.connectionStatus?.configId ||
      payload?.backend_connection?.connectionStatus?.config_id ||
      null;

    const resolvedUserId =
      payload.user_id ||
      payload.userId ||
      payload?.user_data?.user_id ||
      payload?.user_data?.userId ||
      payload?.resolvedUserId ||
      payload?.backend_connection?.connectionStatus?.userId ||
      null;

    if (resolvedConfigId && resolvedUserId) {
      setBrokerSession({
        configId: resolvedConfigId,
        userId: resolvedUserId,
        brokerName: payload.broker_name || payload.brokerName || 'zerodha',
        sessionStatus: payload.connection_status || payload.connectionStatus?.state || 'pending'
      });
      return { configId: resolvedConfigId, userId: resolvedUserId };
    }

    console.warn('[BrokerIntegration] Missing broker identifiers after auth flow', {
      payload,
      inferredConfigId: resolvedConfigId,
      inferredUserId: resolvedUserId
    });
    return { configId: null, userId: null };
  }, [setBrokerSession]);

  const handleConfigSaved = useCallback(async (configPayload = {}) => {
    const { configId, userId } = persistIdentifiers(configPayload);

    try {
      await refreshSession({
        configId: configId || undefined,
        userId: userId || undefined,
        silent: true
      });
    } catch (error) {
      console.warn('[BrokerIntegration] Session refresh failed during config save', error);
    }

    await fetchStatus();
  }, [persistIdentifiers, refreshSession, fetchStatus]);

  const handleConnectionComplete = async (configPayload = {}) => {
    const { configId, userId } = persistIdentifiers(configPayload);
    try {
      await refreshSession({
        configId: configId || undefined,
        userId: userId || undefined,
        silent: true
      });
      await fetchStatus();
      setActiveTab('import');
    } catch (error) {
      console.error('❌ [BrokerIntegration] Connection completion sync failed', error);
    }
  };

  const connectionState = useMemo(() => {
    if (needsReauth) {
      return {
        icon: <WifiOff className="w-4 h-4 text-amber-400" />,
        label: 'Needs Reconnect',
        variant: 'destructive'
      };
    }

    if (status?.isConnected) {
      return {
        icon: <Wifi className="w-4 h-4 text-emerald-400" />,
        label: 'Connected',
        variant: 'default'
      };
    }

    if (session) {
      return {
        icon: <WifiOff className="w-4 h-4 text-slate-400" />,
        label: 'Connected Locally',
        variant: 'secondary'
      };
    }

    return {
      icon: <WifiOff className="w-4 h-4 text-slate-400" />,
      label: 'Not Connected',
      variant: 'secondary'
    };
  }, [needsReauth, session, status]);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card className="border border-slate-700/50 bg-slate-900/50">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl text-white flex items-center gap-2">
              {connectionState.icon}
              Zerodha Broker Integration
            </CardTitle>
            <p className="text-sm text-slate-400">
              Manage your Zerodha session and ensure live trading data stays connected.
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <Badge variant={connectionState.variant} className="px-3 py-1">
              {connectionState.label}
            </Badge>
            {status?.tokenStatus?.expiresAt && (
              <span className="text-xs text-slate-400">
                Token expires at {formatTimestamp(status.tokenStatus.expiresAt)}
              </span>
            )}
            {status?.lastStatusCheck && (
              <span className="text-xs text-slate-500">
                Last checked {formatTimestamp(status.lastStatusCheck)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {needsReauth && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Your Zerodha session requires reauthentication. Please reconnect to restore live data.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleManualRefresh} disabled={sessionLoading || statusLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${statusLoading ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
            <Button onClick={handleFetchPortfolio} disabled={!session || needsReauth}>
              <Download className="w-4 h-4 mr-2" />
              Fetch Live Portfolio Snapshot
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/portfolio">
                View Portfolio <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>

          {status && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-300">
              <div>
                <p className="text-xs uppercase text-slate-500">Session Status</p>
                <p className="font-medium">{status.connectionStatus?.state || status.sessionStatus || 'unknown'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Token Status</p>
                <p className="font-medium">{status.tokenStatus?.status || 'unknown'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Last Sync</p>
                <p className="font-medium">{formatTimestamp(status.lastSync)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-900/60">
          <TabsTrigger value="setup">Broker Setup</TabsTrigger>
          <TabsTrigger value="import" disabled={!session || needsReauth}>Portfolio Import</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4">
          <BrokerSetup
            existingConfig={existingConfig}
            onConfigSaved={handleConfigSaved}
            onConnectionComplete={handleConnectionComplete}
            isLoading={sessionLoading}
            liveStatus={status}
          />
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          {!session || needsReauth ? (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Connect your broker to import your live Zerodha portfolio.
              </AlertDescription>
            </Alert>
          ) : (
            <PortfolioImport
              portfolio={portfolioSnapshot}
              fetchLivePortfolio={handleFetchPortfolio}
              onImportComplete={() => fetchStatus()}
            />
          )}
        </TabsContent>
      </Tabs>

      <Card className="border border-slate-700/40 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <LinkIcon className="w-4 h-4" /> Helpful Links
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          <Button variant="outline" asChild>
            <a href="https://kite.trade/docs/connect/v3/" target="_blank" rel="noopener noreferrer">
              Zerodha API Documentation
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://kite.zerodha.com/apps" target="_blank" rel="noopener noreferrer">
              Manage API App <ArrowRight className="w-4 h-4 ml-1" />
            </a>
          </Button>
          <Button variant="outline" onClick={handleManualRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" /> Recheck Status
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BrokerIntegration;
