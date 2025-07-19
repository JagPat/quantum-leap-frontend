import React, { useState, useEffect, useRef } from 'react';
import { useAI } from '@/hooks/useAI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Bot, User, Trash2, RefreshCw } from 'lucide-react';

const OpenAIAssistantChat = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [context, setContext] = useState('');
  const [messages, setMessages] = useState([]);
  const scrollAreaRef = useRef(null);
  
  const {
    aiStatus,
    threadId,
    isLoading,
    error,
    sendAssistantMessage,
    getAssistantStatus,
    getThreadMessages,
    clearUserThread,
    initializeThread
  } = useAI();

  // Initialize on mount
  useEffect(() => {
    initializeThread();
  }, [initializeThread]);

  // Load messages when thread ID changes
  useEffect(() => {
    if (threadId) {
      loadMessages();
    }
  }, [threadId]);

  const loadMessages = async () => {
    try {
      const response = await getThreadMessages(threadId);
      if (response.messages) {
        setMessages(response.messages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const messageToSend = inputMessage;
    setInputMessage('');

    // Add user message to UI immediately
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const contextData = context.trim() ? { additional_context: context } : null;
      const response = await sendAssistantMessage(messageToSend, contextData);
      
      // Add assistant response to UI
      if (response.reply) {
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: response.reply,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleClearConversation = async () => {
    if (confirm('Are you sure you want to clear the conversation? This will start a new thread.')) {
      await clearUserThread();
      setMessages([]);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Determine assistant status from aiStatus
  const assistantStatus = aiStatus ? {
    is_available: aiStatus.overall_status === 'online',
    assistant_name: 'Quantum Trading AI',
    model: 'GPT-4',
    tools_count: 5
  } : null;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                <Bot className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white">AI Trading Assistant</CardTitle>
                <p className="text-sm text-slate-400">Powered by OpenAI - Your intelligent trading companion</p>
              </div>
              {assistantStatus && (
                <Badge 
                  variant={assistantStatus.is_available ? "default" : "destructive"}
                  className={assistantStatus.is_available ? "bg-green-500/20 text-green-300 border-green-400/30" : "bg-red-500/20 text-red-300 border-red-400/30"}
                >
                  {assistantStatus.is_available ? "Online" : "Offline"}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {threadId && (
                <Badge variant="outline" className="text-xs border-slate-600/50 text-slate-300">
                  Thread: {threadId.slice(-8)}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearConversation}
                disabled={isLoading}
                className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Assistant Status */}
      {assistantStatus && (
        <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-300">Assistant:</span> 
                <span className="text-slate-200">{assistantStatus.assistant_name || 'Quantum Trading AI'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-300">Model:</span> 
                <span className="text-slate-200">{assistantStatus.model || 'GPT-4'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-300">Tools:</span> 
                <span className="text-slate-200">{assistantStatus.tools_count || 5}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-300">Status:</span> 
                <Badge 
                  variant={assistantStatus.is_available ? "default" : "destructive"} 
                  className={assistantStatus.is_available ? "bg-green-500/20 text-green-300 border-green-400/30" : "bg-red-500/20 text-red-300 border-red-400/30"}
                >
                  {assistantStatus.is_available ? "Available" : "Unavailable"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Context Input */}
      <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
        <CardContent className="pt-4">
          <label className="text-sm font-medium mb-2 block text-slate-300">Additional Context (Optional)</label>
          <Input
            placeholder="Add any context or portfolio data for the assistant..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="mb-2 bg-slate-700/50 border-slate-600/50 text-slate-200 placeholder:text-slate-400 focus:border-blue-400/50"
          />
          <p className="text-xs text-slate-400">
            This context will be included with your message to help the assistant provide better responses.
          </p>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card className="flex-1 border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Conversation</CardTitle>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-400">
                {messages.length} messages
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea ref={scrollAreaRef} className="h-96">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-slate-400 py-12">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 inline-block mb-6">
                    <Bot className="h-12 w-12 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Start a conversation with your AI assistant</h3>
                  <p className="text-sm text-slate-400 mb-6">Ask about trading strategies, portfolio analysis, or market insights</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInputMessage("Analyze my current portfolio and suggest improvements")}
                      className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
                    >
                      Portfolio Analysis
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInputMessage("What are the current market trends and opportunities?")}
                      className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
                    >
                      Market Trends
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInputMessage("Generate a trading strategy for the current market conditions")}
                      className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
                    >
                      Trading Strategy
                    </Button>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/30 text-white border border-blue-400/30'
                          : 'bg-slate-700/50 text-slate-200 border border-slate-600/50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {message.role === 'assistant' && (
                          <div className="p-1 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30">
                            <Bot className="h-4 w-4 text-blue-400 flex-shrink-0" />
                          </div>
                        )}
                        {message.role === 'user' && (
                          <div className="p-1 rounded-full bg-gradient-to-br from-slate-500/20 to-slate-600/20 border border-slate-400/30">
                            <User className="h-4 w-4 text-slate-300 flex-shrink-0" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          <p className={`text-xs mt-2 ${
                            message.role === 'user' ? 'text-blue-200' : 'text-slate-400'
                          }`}>
                            {formatTimestamp(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                    <div className="flex items-center space-x-3">
                      <div className="p-1 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30">
                        <Bot className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                        <span className="text-sm text-slate-300">Assistant is thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-500/20 bg-red-500/10 backdrop-blur-sm">
          <CardContent className="pt-4">
            <p className="text-red-300 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Message Input */}
      <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
        <CardContent className="pt-4">
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <Input
              placeholder="Type your message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-slate-700/50 border-slate-600/50 text-slate-200 placeholder:text-slate-400 focus:border-blue-400/50"
            />
            <Button 
              type="submit" 
              disabled={isLoading || !inputMessage.trim()}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage("Analyze my current portfolio and suggest improvements")}
              disabled={isLoading}
              className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
            >
              Portfolio Analysis
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage("What are the current market trends and opportunities?")}
              disabled={isLoading}
              className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
            >
              Market Trends
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage("Generate a trading strategy for the current market conditions")}
              disabled={isLoading}
              className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
            >
              Trading Strategy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage("What are the key risk factors I should consider?")}
              disabled={isLoading}
              className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
            >
              Risk Assessment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OpenAIAssistantChat; 