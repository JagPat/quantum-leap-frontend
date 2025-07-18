
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  LayoutDashboard,
  CandlestickChart,
  Wallet,
  History,
  Settings,
  Bot,
  Brain,
  Power,
  Blocks,
  Link as LinkIcon,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/portfolio', icon: Wallet, label: 'Portfolio' },
  { href: '/ai', icon: Brain, label: 'AI Engine' },
  { href: '/trading', icon: CandlestickChart, label: 'Trading Engine' },
  { href: '/trade-history', icon: History, label: 'Trade History' },
  { href: '/widgets', icon: Blocks, label: 'Widgets' },
];

const bottomNavItems = [
  { href: '/settings', icon: Settings, label: 'Settings' },
];

const NavItem = ({ href, icon: Icon, label }) => {
  const location = useLocation();
  // Handle both direct routes (starting with /) and page names
  const targetUrl = href.startsWith('/') ? href : createPageUrl(href);
  const isActive = location.pathname.split('?')[0] === targetUrl;
  
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={targetUrl}
            className={`flex items-center justify-center lg:justify-start gap-4 p-3 rounded-lg transition-colors duration-200 ${
              isActive
                ? 'bg-amber-500 text-slate-900 shadow-md'
                : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
            }`}
          >
            <Icon className="w-6 h-6 flex-shrink-0" />
            <span className="hidden lg:inline font-semibold">{label}</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="lg:hidden bg-slate-800 text-white border-slate-700">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default function SideNavBar() {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [brokerName, setBrokerName] = useState('');

  useEffect(() => {
    const checkConnectionStatus = () => {
      try {
        const brokerConfigs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
        const activeBrokerConfig = brokerConfigs.find(config => config.is_connected && config.access_token);
        
        if (activeBrokerConfig) {
          setConnectionStatus('connected');
          setBrokerName(activeBrokerConfig.broker_name || 'Zerodha');
        } else {
          setConnectionStatus('disconnected');
          setBrokerName('');
        }
      } catch (error) {
        console.error('Error checking connection status:', error);
        setConnectionStatus('error');
        setBrokerName('');
      }
    };

    checkConnectionStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkConnectionStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-400" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4 text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Error';
    }
  };

  return (
    <aside className="w-20 lg:w-64 bg-slate-900/80 backdrop-blur-lg border-r border-white/10 flex flex-col p-4 transition-all duration-300">
      <div className="flex items-center gap-2 mb-6 p-2">
        <Bot className="w-8 h-8 text-amber-400" />
        <h1 className="hidden lg:block text-xl font-bold text-white">QuantumLeap</h1>
      </div>
      
      {/* Connection Status */}
      <div className="mb-6 px-2">
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/settings"
                className="flex items-center justify-center lg:justify-start gap-3 p-3 rounded-lg transition-colors duration-200 text-slate-400 hover:bg-slate-700/50 hover:text-white"
              >
                {getConnectionIcon()}
                <div className="hidden lg:block flex-1">
                  <div className="text-sm font-medium">{getConnectionText()}</div>
                  {brokerName && (
                    <div className="text-xs text-slate-500">{brokerName}</div>
                  )}
                </div>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="lg:hidden bg-slate-800 text-white border-slate-700">
              <p>{getConnectionText()}</p>
              {brokerName && <p className="text-xs">{brokerName}</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <nav className="flex-1 flex flex-col gap-3">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>
      <div className="flex flex-col gap-3">
        {bottomNavItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
        {/* Logout Button */}
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex items-center justify-center lg:justify-start gap-4 p-3 rounded-lg transition-colors duration-200 text-slate-400 hover:bg-red-500/20 hover:text-red-300"
                onClick={() => console.log('Logout clicked')}
              >
                <Power className="w-6 h-6 flex-shrink-0" />
                <span className="hidden lg:inline font-semibold">Logout</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="lg:hidden bg-slate-800 text-white border-slate-700">
              <p>Logout</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </aside>
  );
}
