
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // New import
import { Brain } from 'lucide-react'; // Only Brain is needed now

export default function SmartComparisonBuilder({ onApply }) {
  const [selectedAssets, setSelectedAssets] = useState(['NIFTY50']);
  const [aiPrompt, setAiPrompt] = useState(''); // New state for AI prompt
  const [isGenerating, setIsGenerating] = useState(false); // New state for AI generation loading
  const [suggestedAssets, setSuggestedAssets] = useState([]); // New state for AI suggested assets

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    setSuggestedAssets([]); // Clear previous suggestions

    // Simulate API call to an AI service
    // In a real application, you would send 'aiPrompt' to your backend AI endpoint
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay

    // Mock data for demonstration purposes based on prompt content
    let mockSuggestions = [];
    const lowerCasePrompt = aiPrompt.toLowerCase();

    if (lowerCasePrompt.includes('nifty')) {
      mockSuggestions = ['NIFTY50', 'NIFTY IT', 'NIFTY BANK', 'NIFTY NEXT 50'];
    } else if (lowerCasePrompt.includes('banking')) {
      mockSuggestions = ['HDFCBANK', 'ICICIBANK', 'AXISBANK', 'KOTAKBANK'];
    } else if (lowerCasePrompt.includes('it stocks') || lowerCasePrompt.includes('tech')) {
      mockSuggestions = ['TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM'];
    } else if (lowerCasePrompt.includes('energy')) {
      mockSuggestions = ['RELIANCE', 'ONGC', 'NTPC', 'POWERGRID'];
    } else if (lowerCasePrompt.includes('pharma')) {
      mockSuggestions = ['SUNPHARMA', 'DRREDDY', 'CIPLA'];
    } else if (lowerCasePrompt.includes('auto')) {
      mockSuggestions = ['TATAMOTORS', 'MARUTI', 'M&M', 'BAJAJ-AUTO'];
    } else {
      // Default suggestions if prompt is not specific
      mockSuggestions = ['RELIANCE', 'TCS', 'HDFCBANK', 'NIFTY50', 'SENSEX', 'INFY', 'ICICIBANK', 'WIPRO', 'TATAMOTORS'];
    }
    
    // Filter out duplicates and ensure assets are unique, if combining with existing selectedAssets
    // For this implementation, suggestedAssets are initially added to selectedAssets only when checked.
    setSuggestedAssets(mockSuggestions);
    setIsGenerating(false);
  };

  return (
    <div className="p-4 bg-slate-800 rounded-lg text-white space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          Build Smart Comparison with AI
        </h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="ai-prompt" className="text-slate-300">
            Tell AI what you want to compare your portfolio against:
          </Label>
          <Textarea
            id="ai-prompt"
            placeholder="e.g., Compare against NIFTY 50, top IT stocks, and banking sector ETFs"
            rows={3}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="mt-2 bg-slate-700 border-slate-600 text-white resize-none"
          />
        </div>

        <div className="flex justify-between items-center">
          <Button
            onClick={handleAIGenerate}
            disabled={isGenerating || !aiPrompt.trim()}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Generate with AI
              </>
            )}
          </Button>
        </div>
      </div>

      {suggestedAssets.length > 0 && (
        <div className="space-y-4">
          <div className="border-t border-slate-700 pt-4">
            <h4 className="text-md font-medium text-white mb-3">AI Suggested Assets:</h4>
            <div className="grid grid-cols-2 gap-2">
              {suggestedAssets.map((asset) => (
                <div
                  key={asset}
                  className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-slate-600"
                >
                  <span className="text-slate-300">{asset}</span>
                  <Checkbox
                    checked={selectedAssets.includes(asset)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedAssets([...selectedAssets, asset]);
                      } else {
                        setSelectedAssets(selectedAssets.filter(a => a !== asset));
                      }
                    }}
                    className="border-slate-500 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSuggestedAssets([]);
                setSelectedAssets([]);
                setAiPrompt('');
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Clear
            </Button>
            <Button
              onClick={() => onApply(selectedAssets)}
              disabled={selectedAssets.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Apply Comparison ({selectedAssets.length} assets)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
