import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Bot, User, CornerDownLeft, Circle, Zap, RefreshCw } from 'lucide-react';
import integrations, { InvokeLLM as NamedInvokeLLM } from '@/api/integrations';
const InvokeLLM = NamedInvokeLLM || (integrations && integrations.InvokeLLM);
console.log('INTEGRATIONS EXPORT:', integrations);
import StrategyPreview from './StrategyPreview';

const strategySchema = {
  type: "object",
  properties: {
    name: { type: "string", description: "A concise, descriptive name for the strategy, e.g., 'RSI Low-Buy High-Sell'" },
    description: { type: "string", description: "A brief, one-sentence explanation of what the strategy does." },
    type: { type: "string", enum: ["RSI", "MACD", "EMA", "Price_Action", "News_Sentiment", "Multi_Condition"], description: "The primary type of the strategy." },
    parameters: {
      type: "object",
      properties: {
        rsi_period: { type: "number", description: "The period for RSI calculation, e.g., 14." },
        rsi_oversold: { type: "number", description: "The RSI level considered oversold (for buying)." },
        rsi_overbought: { type: "number", description: "The RSI level considered overbought (for selling)." },
        ema_short_period: { type: "number" },
        ema_long_period: { type: "number" },
        price_change_percent_up: { type: "number", description: "Percentage increase from entry to trigger a sell." },
        price_change_percent_down: { type: "number", description: "Percentage decrease from entry to trigger a sell (stop-loss)." },
        news_sentiment_threshold: { type: "number", description: "A score from -1 (very negative) to 1 (very positive). Buy on scores above this threshold." }
      },
      description: "Specific parameters for the indicators used in the strategy."
    },
    conditions: {
        type: "object",
        properties: {
            buy: { type: "array", items: { type: "string" }, description: "List of conditions that must ALL be true to trigger a BUY signal. E.g., ['RSI < 30', 'News_Sentiment > 0.5']" },
            sell: { type: "array", items: { type: "string" }, description: "List of conditions that must ALL be true to trigger a SELL signal. E.g., ['RSI > 70', 'Price_Increase_Percent > 5']" }
        },
        description: "The logical conditions for buy and sell signals."
    }
  },
  required: ["name", "description", "type", "parameters", "conditions"]
};

export default function StrategyBuilder({ isOpen, onOpenChange, onSaveStrategy }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedStrategy, setGeneratedStrategy] = useState(null);
  const scrollAreaRef = useRef(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setGeneratedStrategy(null);

    try {
      const systemPrompt = `You are an expert trading strategy assistant. Your task is to convert the user's natural language description into a structured JSON object that conforms to the provided schema. The strategy must be executable. For example, if the user says 'buy when RSI is below 30', you should define the RSI parameters and the buy condition. Always include a descriptive name and description. User's request: "${input}"`;
      
      const response = await InvokeLLM({
        prompt: systemPrompt,
        response_json_schema: strategySchema
      });

      const aiMessage = { role: 'assistant', content: 'I have generated a strategy based on your request. Please review it below.' };
      setMessages(prev => [...prev, aiMessage]);
      setGeneratedStrategy(response);
    } catch (error) {
      console.error("Error invoking LLM:", error);
      const errorMessage = { role: 'assistant', content: 'Sorry, I encountered an error trying to generate the strategy. Please try rephrasing your request.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
    setGeneratedStrategy(null);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-amber-500"/>
            Conversational Strategy Builder
          </SheetTitle>
          <SheetDescription>
            Describe your trading strategy in plain English. The AI will convert it into an executable format.
          </SheetDescription>
        </SheetHeader>
        
        <div ref={scrollAreaRef} className="flex-1 overflow-y-auto space-y-6 p-4 my-4 bg-slate-800/50 rounded-lg">
          {messages.length === 0 && (
            <div className="text-center text-slate-400">
              <p>Try an example like:</p>
              <p className="font-mono text-sm mt-2 p-2 bg-slate-700 rounded">"Buy when RSI is below 30 and sell when it's above 70"</p>
            </div>
          )}
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && <Bot className="w-6 h-6 text-amber-400 flex-shrink-0" />}
              <div className={`rounded-lg p-3 max-w-md ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                {msg.content}
              </div>
              {msg.role === 'user' && <User className="w-6 h-6 text-blue-400 flex-shrink-0" />}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3">
              <Bot className="w-6 h-6 text-amber-400 flex-shrink-0" />
              <div className="rounded-lg p-3 bg-slate-700 text-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse delay-150"></div>
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse delay-300"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {generatedStrategy && (
          <StrategyPreview strategy={generatedStrategy} onSave={() => onSaveStrategy(generatedStrategy)} />
        )}

        <SheetFooter className="mt-auto pt-4 border-t border-slate-700">
          <form onSubmit={handleSendMessage} className="w-full flex items-center gap-3">
            <Button type="button" variant="ghost" size="icon" onClick={handleReset} title="Reset Chat">
              <RefreshCw className="w-4 h-4"/>
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., Buy when RSI is oversold..."
              className="flex-1 bg-slate-700 border-slate-600 text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  handleSendMessage(e);
                }
              }}
            />
            <Button type="submit" disabled={isLoading}>
              <CornerDownLeft className="w-4 h-4 mr-2" />
              Send
            </Button>
          </form>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}