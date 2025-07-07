
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  LayoutDashboard,
  CandlestickChart,
  Wallet,
  History,
  Settings,
  Bot,
  FileCode,
  Power
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: 'MyDashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: 'Portfolio', icon: Wallet, label: 'Portfolio' },
  { href: 'Trading', icon: CandlestickChart, label: 'Trading Engine' },
  { href: 'TradeHistory', icon: History, label: 'Trade History' },
  { href: 'ApiSpec', icon: FileCode, label: 'API Spec' },
];

const bottomNavItems = [
  { href: 'Settings', icon: Settings, label: 'Settings' },
];

const NavItem = ({ href, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname.split('?')[0] === createPageUrl(href);
  
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={createPageUrl(href)}
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
  return (
    <aside className="w-20 lg:w-64 bg-slate-900/80 backdrop-blur-lg border-r border-white/10 flex flex-col p-4 transition-all duration-300">
      <div className="flex items-center gap-2 mb-10 p-2">
        <Bot className="w-8 h-8 text-amber-400" />
        <h1 className="hidden lg:block text-xl font-bold text-white">QuantumLeap</h1>
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
