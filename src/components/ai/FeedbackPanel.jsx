import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Clock,
  MessageSquare,
  Lightbulb,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAI } from '@/hooks/useAI';

const OUTCOME_TYPES = [
  { value: 'win', label: 'Win', icon: CheckCircle, color: 'text-green-600' },
  { value: 'loss', label: 'Loss', icon: XCircle, color: 'text-red-600' },
  { value: 'partial_win', label: 'Partial Win', icon: TrendingUp, color: 'text-blue-600' },
  { value: 'partial_loss', label: 'Partial Loss', icon: TrendingDown, color: 'text-orange-600' },
  { value: 'neutral', label: 'Break Even', icon: Target, color: 'text-gray-600' }
];

const EXIT_REASONS = [
  { value: 'target_reached', label: 'Target Reached' },
  { value: 'stop_loss_hit', label: 'Stop Loss Hit' },
  { value: 'time_exit', label: 'Time-based Exit' },
  { value: 'manual_exit', label: 'Manual Exit' },
  { value: 'market_conditions', label: 'Market Conditions Changed' },
  { value: 'strategy_signal', label: 'Strategy Signal' }
];

export default function FeedbackPanel() {
  const { toast } = useToast();
  const { recordTradeOutcome, getLearningInsights, loading, error } = useAI();
  
  const [feedbackForm, setFeedbackForm] = useState({
    strategy_id: '',
    outcome: '',
    actual_return: '',
    duration_hours: '',
    max_profit: '',
    max_loss: '',
    exit_reason: '',
    notes: ''
  });
  
  const [learningInsights, setLearningInsights] = useState([]);
  const [submittedFeedback, setSubmittedFeedback] = useState(null);

  const handleInputChange = (field, value) => {
    setFeedbackForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitFeedback = async () => {
    try {
      if (!feedbackForm.strategy_id || !feedbackForm.outcome) {
        toast({
          title: "Missing Information",
          description: "Please provide strategy ID and outcome",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        strategy_id: feedbackForm.strategy_id,
        outcome: feedbackForm.outcome,
        actual_return: parseFloat(feedbackForm.actual_return) || 0,
        duration_hours: parseInt(feedbackForm.duration_hours) || 0,
        max_profit: parseFloat(feedbackForm.max_profit) || 0,
        max_loss: parseFloat(feedbackForm.max_loss) || 0,
        exit_reason: feedbackForm.exit_reason,
        notes: feedbackForm.notes
      };

      const result = await recordTradeOutcome(payload);
      setSubmittedFeedback(result);
      
      // Fetch learning insights for this strategy
      await fetchLearningInsights(feedbackForm.strategy_id);
      
      // Reset form
      setFeedbackForm({
        strategy_id: '',
        outcome: '',
        actual_return: '',
        duration_hours: '',
        max_profit: '',
        max_loss: '',
        exit_reason: '',
        notes: ''
      });
      
      toast({
        title: "Feedback Submitted",
        description: "Trade outcome recorded and AI learning insights generated",
      });

    } catch (err) {
      toast({
        title: "Submission Failed",
        description: err.message || "Failed to submit feedback",
        variant: "destructive",
      });
    }
  };

  const fetchLearningInsights = async (strategyId) => {
    try {
      const insights = await getLearningInsights(strategyId);
      setLearningInsights(prev => [insights, ...prev.filter(i => i.strategy_id !== strategyId)]);
    } catch (err) {
      console.error('Failed to fetch learning insights:', err);
    }
  };

  const getOutcomeColor = (outcome) => {
    const outcomeType = OUTCOME_TYPES.find(t => t.value === outcome);
    return outcomeType?.color || 'text-gray-600';
  };

  const getOutcomeIcon = (outcome) => {
    const outcomeType = OUTCOME_TYPES.find(t => t.value === outcome);
    return outcomeType?.icon || Target;
  };

  const formatReturn = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0%';
    return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const formatDuration = (hours) => {
    const h = parseInt(hours);
    if (isNaN(h) || h < 1) return 'Unknown';
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    const remainingHours = h % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  return (
    <div className="space-y-6">
      {/* Feedback Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Trade Outcome Feedback
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="strategy_id">Strategy ID</Label>
              <Input
                id="strategy_id"
                placeholder="Enter strategy ID"
                value={feedbackForm.strategy_id}
                onChange={(e) => handleInputChange('strategy_id', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="outcome">Trade Outcome</Label>
              <Select 
                value={feedbackForm.outcome} 
                onValueChange={(value) => handleInputChange('outcome', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOME_TYPES.map(outcome => {
                    const IconComponent = outcome.icon;
                    return (
                      <SelectItem key={outcome.value} value={outcome.value}>
                        <div className="flex items-center gap-2">
                          <IconComponent className={`h-4 w-4 ${outcome.color}`} />
                          {outcome.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="actual_return">Actual Return (%)</Label>
              <Input
                id="actual_return"
                type="number"
                step="0.01"
                placeholder="e.g., 5.25 or -2.50"
                value={feedbackForm.actual_return}
                onChange={(e) => handleInputChange('actual_return', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="duration_hours">Duration (hours)</Label>
              <Input
                id="duration_hours"
                type="number"
                placeholder="e.g., 24 for 1 day"
                value={feedbackForm.duration_hours}
                onChange={(e) => handleInputChange('duration_hours', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="max_profit">Max Profit (%)</Label>
              <Input
                id="max_profit"
                type="number"
                step="0.01"
                placeholder="Highest profit during trade"
                value={feedbackForm.max_profit}
                onChange={(e) => handleInputChange('max_profit', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="max_loss">Max Loss (%)</Label>
              <Input
                id="max_loss"
                type="number"
                step="0.01"
                placeholder="Highest loss during trade"
                value={feedbackForm.max_loss}
                onChange={(e) => handleInputChange('max_loss', e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="exit_reason">Exit Reason</Label>
            <Select 
              value={feedbackForm.exit_reason} 
              onValueChange={(value) => handleInputChange('exit_reason', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Why did you exit?" />
              </SelectTrigger>
              <SelectContent>
                {EXIT_REASONS.map(reason => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional context about the trade..."
              value={feedbackForm.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
            />
          </div>
          
          <Button 
            onClick={handleSubmitFeedback} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Processing Feedback...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Trade Feedback
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Submitted Feedback Confirmation */}
      {submittedFeedback && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Feedback Submitted Successfully
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>Strategy ID: <span className="font-medium">{submittedFeedback.strategy_id}</span></p>
              <p>Outcome: <span className={`font-medium ${getOutcomeColor(submittedFeedback.outcome)}`}>
                {OUTCOME_TYPES.find(t => t.value === submittedFeedback.outcome)?.label}
              </span></p>
              {submittedFeedback.ai_reflection_generated && (
                <p className="text-green-700">✓ AI reflection and learning insights generated</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Insights */}
      {learningInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              AI Learning Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {learningInsights.map((insight, index) => (
                <div key={insight.strategy_id || index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">Strategy: {insight.strategy_id}</h4>
                      {insight.confidence_score && (
                        <Badge variant="outline">
                          Confidence: {Math.round(insight.confidence_score * 100)}%
                        </Badge>
                      )}
                    </div>
                    {insight.generated_at && (
                      <span className="text-sm text-gray-500">
                        {new Date(insight.generated_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  
                  {insight.ai_reflection && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium mb-2">AI Reflection:</h5>
                      <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded">
                        {insight.ai_reflection}
                      </p>
                    </div>
                  )}
                  
                  {insight.learning_insights && insight.learning_insights.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium mb-2">Key Learnings:</h5>
                      <ul className="space-y-1">
                        {insight.learning_insights.map((learning, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Brain className="h-3 w-3 text-blue-600 mt-1 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{learning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {insight.improvement_suggestions && insight.improvement_suggestions.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-sm font-medium mb-2">Improvement Suggestions:</h5>
                      <ul className="space-y-1">
                        {insight.improvement_suggestions.map((suggestion, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Target className="h-3 w-3 text-green-600 mt-1 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Insights State */}
      {learningInsights.length === 0 && !submittedFeedback && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                No Learning Insights Yet
              </h3>
              <p className="text-gray-500 mb-4">
                Submit trade feedback to generate AI learning insights and improve future strategies
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 