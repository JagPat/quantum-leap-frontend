import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit } from 'lucide-react';

export default function AISummaryPanel({ title, children }) {
  return (
    <Card className="bg-slate-900/50 border-amber-500/30 mt-6 animate-in fade-in-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-400 text-base font-bold">
          <BrainCircuit className="w-5 h-5" />
          {title || "AI-Powered Interpretation"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-slate-300 text-sm space-y-2">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}