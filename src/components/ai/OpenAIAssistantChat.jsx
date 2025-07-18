import React, { useState, useEffect, useRef } from 'react';
import { useOpenAIAssistant } from '@/hooks/useAI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Bot, User, Trash2, RefreshCw } from 'lucide-react';

const OpenAIAssistantChat = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [context, setContext] = useState('');
  const scrollAreaRef = useRef(null);
  
  const {
    messages,
    assistantStatus,
    threadId,
    loading,
    error,
    sendMessage,
    loadThreadMessages,
    loadAssistantStatus,
    clearConversation,
    initializeThread
  } = useOpenAIAssistant();

  // Initialize on mount
  useEffect(() => {
    initializeThread();
    loadAssistantStatus();
  }, [initializeThread, loadAssistantStatus]);

  // Load messages when thread ID changes
  useEffect(() => {
    if (threadId) {
      loadThreadMessages();
    }
  }, [threadId, loadThreadMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const messageToSend = inputMessage;
    setInputMessage('');

    try {
      const contextData = context.trim() ? { additional_context: context } : null;
      await sendMessage(messageToSend, contextData);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleClearConversation = async () => {
    if (confirm('Are you sure you want to clear the conversation? This will start a new thread.')) {
      await clearConversation();
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-blue-600" />
              <CardTitle>OpenAI Assistant Chat</CardTitle>
              {assistantStatus && (
                <Badge variant={assistantStatus.is_available ? "default" : "destructive"}>
                  {assistantStatus.is_available ? "Online" : "Offline"}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {threadId && (
                <Badge variant="outline" className="text-xs">
                  Thread: {threadId.slice(-8)}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearConversation}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Assistant Status */}
      {assistantStatus && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Assistant:</span> {assistantStatus.assistant_name}
              </div>
              <div>
                <span className="font-medium">Model:</span> {assistantStatus.model || 'Unknown'}
              </div>
              <div>
                <span className="font-medium">Tools:</span> {assistantStatus.tools_count || 0}
              </div>
              <div>
                <span className="font-medium">Status:</span> 
                <Badge variant={assistantStatus.is_available ? "default" : "destructive"} className="ml-1">
                  {assistantStatus.is_available ? "Available" : "Unavailable"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Context Input */}
      <Card>
        <CardContent className="pt-4">
          <label className="text-sm font-medium mb-2 block">Additional Context (Optional)</label>
          <Input
            placeholder="Add any context or portfolio data for the assistant..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="mb-2"
          />
          <p className="text-xs text-muted-foreground">
            This context will be included with your message to help the assistant provide better responses.
          </p>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Conversation</CardTitle>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {messages.length} messages
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea ref={scrollAreaRef} className="h-96">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Start a conversation with your AI assistant</p>
                  <p className="text-sm">Ask about trading strategies, portfolio analysis, or market insights</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.role === 'assistant' && (
                          <Bot className="h-4 w-4 mt-1 flex-shrink-0" />
                        )}
                        {message.role === 'user' && (
                          <User className="h-4 w-4 mt-1 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {formatTimestamp(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Assistant is thinking...</span>
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
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Message Input */}
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <Input
              placeholder="Type your message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !inputMessage.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage("Analyze my current portfolio and suggest improvements")}
              disabled={loading}
            >
              Portfolio Analysis
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage("What are the current market trends and opportunities?")}
              disabled={loading}
            >
              Market Trends
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage("Generate a trading strategy for the current market conditions")}
              disabled={loading}
            >
              Trading Strategy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage("What are the key risk factors I should consider?")}
              disabled={loading}
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