import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Strategy } from '@/api/entities';
import { Settings, Save, AlertTriangle } from 'lucide-react';

export default function StrategySettings({ strategy, onUpdate }) {
  const [settings, setSettings] = useState({
    name: strategy.name || '',
    description: strategy.description || '',
    execution_mode: strategy.execution_mode || 'paper',
    initial_capital: strategy.capital?.initial_capital || 100000,
    parameters: strategy.parameters || {},
    is_active: strategy.is_active || false
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedStrategy = await Strategy.update(strategy.id, {
        name: settings.name,
        description: settings.description,
        execution_mode: settings.execution_mode,
        capital: {
          ...strategy.capital,
          initial_capital: settings.initial_capital
        },
        parameters: settings.parameters,
        is_active: settings.is_active
      });
      onUpdate(updatedStrategy);
    } catch (error) {
      console.error('Error updating strategy:', error);
    }
    setIsSaving(false);
  };

  const handleParameterChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [key]: parseFloat(value) || value
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Basic Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">Strategy Name</Label>
              <Input
                id="name"
                value={settings.name}
                onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="execution_mode" className="text-slate-300">Execution Mode</Label>
              <Select 
                value={settings.execution_mode} 
                onValueChange={(value) => setSettings(prev => ({ ...prev, execution_mode: value }))}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paper">Paper Trading</SelectItem>
                  <SelectItem value="live">Live Trading</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-300">Description</Label>
            <Textarea
              id="description"
              value={settings.description}
              onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="initial_capital" className="text-slate-300">Initial Capital (₹)</Label>
            <Input
              id="initial_capital"
              type="number"
              value={settings.initial_capital}
              onChange={(e) => setSettings(prev => ({ ...prev, initial_capital: parseFloat(e.target.value) || 0 }))}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-slate-300">Strategy Active</Label>
              <p className="text-sm text-slate-400">Enable or disable strategy execution</p>
            </div>
            <Switch
              checked={settings.is_active}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, is_active: checked }))}
              className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Strategy Parameters */}
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Strategy Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(settings.parameters).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <Label className="text-slate-300 capitalize">
                  {key.replace(/_/g, ' ')}
                </Label>
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => handleParameterChange(key, e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live Trading Warning */}
      {settings.execution_mode === 'live' && (
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div>
                <h4 className="font-semibold text-red-300">Live Trading Warning</h4>
                <p className="text-sm text-red-400">
                  This strategy will execute real trades with real money. Ensure you understand the risks.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}