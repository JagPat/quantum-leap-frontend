import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

export default function MetricsCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend, 
  isLoading = false,
  className = ""
}) {
  const isPositive = change >= 0;
  
  return (
    <Card className={`bg-slate-800/50 border-white/10 hover:bg-slate-800 transition-all duration-300 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
        <Icon className="h-5 w-5 text-slate-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl lg:text-3xl font-bold text-white mb-1">
          {isLoading ? (
            <div className="h-8 bg-slate-700 rounded animate-pulse" />
          ) : (
            value
          )}
        </div>
        {trend && (
          <p className={`text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}