import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";

export default function StockManager({ stocks, onStocksChange }) {
  const [newStock, setNewStock] = useState('');

  const handleAddStock = () => {
    if (newStock && !stocks.includes(newStock.toUpperCase())) {
      onStocksChange([...stocks, newStock.toUpperCase()]);
      setNewStock('');
    }
  };

  const handleRemoveStock = (stockToRemove) => {
    onStocksChange(stocks.filter(stock => stock !== stockToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddStock();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="e.g. INFY"
          value={newStock}
          onChange={(e) => setNewStock(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-slate-900/50 border-slate-600 text-white"
        />
        <Button 
          type="button" 
          onClick={handleAddStock}
          className="bg-amber-500 hover:bg-amber-600 text-slate-900"
        >
          <Plus className="w-4 h-4 mr-2" /> Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {stocks?.map((stock) => (
          <Badge key={stock} variant="outline" className="bg-slate-700 text-slate-300 border-slate-600 py-1 pl-3 pr-1 text-sm">
            {stock}
            <button 
              onClick={() => handleRemoveStock(stock)} 
              className="ml-2 rounded-full hover:bg-slate-500/50 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}