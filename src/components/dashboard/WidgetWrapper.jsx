
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  GripVertical, 
  Settings, 
  Maximize2, 
  Minimize2, 
  RotateCcw 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PRESET_SIZES = [
  { name: 'Small', w: 4, h: 3 },
  { name: 'Medium', w: 6, h: 4 },
  { name: 'Large', w: 8, h: 5 },
  { name: 'Extra Large', w: 12, h: 6 },
  { name: 'Tall', w: 4, h: 6 },
  { name: 'Wide', w: 12, h: 3 }
];

export default function WidgetWrapper({ 
  title, 
  children, 
  onRemove, 
  isEditMode = false,
  onResize,
  currentSize,
  dragHandleProps, 
  isDragging = false,
  isFixed = false // New prop for fixed widgets
}) {
  const [showResizeMenu, setShowResizeMenu] = useState(false);

  const handleResize = (newSize) => {
    onResize && onResize(newSize);
    setShowResizeMenu(false);
  };

  return (
    <div
      className={`relative bg-slate-800/60 backdrop-blur-sm rounded-xl border transition-all duration-300 ${
        isDragging 
          ? 'border-amber-400/50 shadow-2xl shadow-amber-400/20' 
          : isEditMode && !isFixed
          ? 'border-amber-400/30 shadow-lg'
          : 'border-white/10 hover:border-white/20'
      } ${isFixed ? 'ring-2 ring-blue-400/20' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          {/* Drag Handle - only show for non-fixed widgets */}
          {isEditMode && !isFixed && dragHandleProps && (
            <div
              {...dragHandleProps}
              className="cursor-move p-1 hover:bg-slate-700/50 rounded transition-colors"
            >
              <GripVertical className="w-4 h-4 text-slate-400" />
            </div>
          )}
          <h3 className="text-white font-medium text-sm flex items-center gap-2">
            {title}
            {isFixed && (
              <Badge className="bg-blue-100 text-blue-800 text-xs">Fixed</Badge>
            )}
          </h3>
          {currentSize && !isFixed && ( // Display currentSize badge only for non-fixed widgets
            <Badge variant="outline" className="text-xs">
              {currentSize.w}×{currentSize.h}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Resize Controls - only for non-fixed widgets */}
          {isEditMode && !isFixed && onResize && (
            <DropdownMenu open={showResizeMenu} onOpenChange={setShowResizeMenu}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-7 h-7 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300"
                >
                  <Maximize2 className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                <div className="px-2 py-1 text-xs font-medium text-slate-400">
                  Resize Widget
                </div>
                <DropdownMenuSeparator className="bg-slate-700" />
                {PRESET_SIZES.map((size) => (
                  <DropdownMenuItem
                    key={size.name}
                    onClick={() => handleResize(size)}
                    className="text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{size.name}</span>
                      <Badge variant="outline" className="text-xs ml-2">
                        {size.w}×{size.h}
                      </Badge>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem
                  onClick={() => handleResize({ w: 6, h: 4 })}
                  className="text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 mr-2" />
                  Reset to Default
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Remove Button - only for non-fixed widgets */}
          {isEditMode && !isFixed && onRemove && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onRemove}
              className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3 pt-0 h-full">
        <div className="h-full overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
