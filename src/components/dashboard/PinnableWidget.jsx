import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Pin, Check, Loader2 } from 'lucide-react';
import { DashboardWidget } from '@/api/entities';
import { toast } from 'sonner';

export default function PinnableWidget({ 
  children, 
  widgetType, 
  defaultProps = {}, 
  defaultLayout = { x: 0, y: 0, w: 6, h: 4 },
  showTitle = true,
  title = ""
}) {
  const [isPinned, setIsPinned] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [widgetId, setWidgetId] = useState(null);

  useEffect(() => {
    checkIfPinned();
  }, [widgetType]);

  const checkIfPinned = async () => {
    setIsLoading(true);
    try {
      const existing = await DashboardWidget.filter({ widget_type: widgetType });
      if (existing.length > 0) {
        setIsPinned(true);
        setWidgetId(existing[0].id);
      } else {
        setIsPinned(false);
        setWidgetId(null);
      }
    } catch (error) {
      console.error('Error checking widget pin status:', error);
    }
    setIsLoading(false);
  };

  const handlePin = async () => {
    try {
      const newWidget = await DashboardWidget.create({
        widget_type: widgetType,
        props_config: defaultProps,
        layout_config: defaultLayout
      });
      setIsPinned(true);
      setWidgetId(newWidget.id);
      toast.success(`${title || widgetType.replace(/([A-Z])/g, ' $1').trim()} pinned to dashboard!`);
    } catch (error) {
      console.error('Error pinning widget:', error);
      toast.error('Failed to pin widget to dashboard.');
    }
  };
  
  const handleUnpin = async () => {
    if (!widgetId) return;
    try {
      await DashboardWidget.delete(widgetId);
      setIsPinned(false);
      setWidgetId(null);
      toast.info("Widget removed from dashboard.");
    } catch (error) {
      console.error('Error unpinning widget:', error);
      toast.error("Failed to remove widget from dashboard.");
    }
  };

  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-lg h-full flex flex-col">
      {/* Widget Header with Pin Button */}
      {showTitle && (
        <div className="flex items-center justify-between p-4 pb-2 border-b border-slate-700/50">
          <h3 className="text-lg font-semibold text-white">
            {title || widgetType.replace(/([A-Z])/g, ' $1').trim()}
          </h3>
          <Button
            variant={isPinned ? "default" : "outline"}
            size="sm"
            className={
              isPinned 
                ? "bg-green-600 hover:bg-green-700 text-white border-green-600" 
                : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white"
            }
            onClick={isPinned ? handleUnpin : handlePin}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : isPinned ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Pinned
              </>
            ) : (
              <>
                <Pin className="w-4 h-4 mr-2" />
                Pin to Dashboard
              </>
            )}
          </Button>
        </div>
      )}
      
      {/* Widget Content */}
      <div className="flex-1 p-4 overflow-hidden">
        {children}
      </div>
    </div>
  );
}