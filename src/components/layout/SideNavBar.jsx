import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Bot, LayoutDashboard, GanttChartSquare, PieChart, History, Settings, FileJson, Circle, View, Package } from 'lucide-react';
import { createPageUrl } from '@/utils';

const navItems = [
  { href: createPageUrl('MyDashboard'), label: 'My Dashboard', icon: View },
  { href: createPageUrl('Trading'), label: 'Trading Engine', icon: GanttChartSquare },
  { href: createPageUrl('Portfolio'), label: 'Portfolio', icon: PieChart },
  { href: createPageUrl('TradeHistory'), label: 'Trade History', icon: History },
  { href: createPageUrl('Widgets'), label: 'Widgets', icon: Package },
  { href: createPageUrl('Settings'), label: 'Settings', icon: Settings },
  { href: createPageUrl('ApiSpec'), label: 'API Spec', icon: FileJson },
];

export default function SideNavBar() {
  const activeLinkClass = "bg-slate-700 text-white";
  const inactiveLinkClass = "text-slate-400 hover:bg-slate-700/50 hover:text-white";

  return (
    <aside className="w-60 flex-shrink-0 bg-slate-800 p-4 flex flex-col">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white">QuantumLeap</h1>
      </div>
      <nav className="flex-1 space-y-2">
        {navItems.map(({ href, label, icon: Icon }) => (
          <NavLink
            key={label}
            to={href}
            end={href === createPageUrl('MyDashboard')}
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive ? activeLinkClass : inactiveLinkClass}`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto">
        <div className="flex items-center gap-3 p-3 rounded-md bg-slate-700/50">
          <div className="relative flex items-center justify-center">
            <Circle className="w-4 h-4 text-green-400/50" />
            <Circle className="w-2 h-2 text-green-400 fill-current absolute" />
          </div>
          <span className="text-sm font-medium text-white">AI Active</span>
        </div>
      </div>
    </aside>
  );
}