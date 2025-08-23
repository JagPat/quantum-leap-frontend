import React, { useState } from 'react';
import { usePortfolioData, usePortfolioAnalysis } from '../../hooks/usePortfolioData';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { DashboardSkeleton } from './PortfolioSkeleton';

const AIAnalysisPanel: React.FC = () => {
  const userId = 'current-user';
  const { data: portfolio } = usePortfolioData(userId);
  const { analyze, data: analysis, isLoading, error } = usePortfolioAnalysis(userId);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const handleAnalyze = () => {
    if (portfolio) {
      analyze(portfolio);
      setHasAnalyzed(true);
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Analysis Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Portfolio Analysis</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Get AI-powered insights about your portfolio health, risk, and recommendations
              </p>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={!portfolio || isLoading}
              loading={isLoading}
            >
              {hasAnalyzed ? 'Re-analyze Portfolio' : 'Analyze Portfolio'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="text-red-800">
              <strong>Analysis Failed:</strong> {error.message}
            </div>
          </CardContent>
        </Card>
      )}

      {analysis && (
        <>
          {/* Portfolio Health Score */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Health Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Overall Health</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {analysis.healthScore}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${
                        analysis.healthScore >= 80 ? 'bg-green-500' :
                        analysis.healthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${analysis.healthScore}%` }}
                    />
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  analysis.riskLevel === 'LOW' ? 'bg-green-100 text-green-800' :
                  analysis.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {analysis.riskLevel} RISK
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Concentration Risk</span>
                      <span className="text-sm font-medium">{analysis.riskAssessment.concentrationRisk}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${analysis.riskAssessment.concentrationRisk}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Volatility Risk</span>
                      <span className="text-sm font-medium">{analysis.riskAssessment.volatilityRisk}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${analysis.riskAssessment.volatilityRisk}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Risk Factors</h4>
                  <ul className="space-y-1">
                    {analysis.riskAssessment.riskFactors.map((factor, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>AI Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.recommendations.map((recommendation) => (
                  <div 
                    key={recommendation.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      recommendation.priority === 'HIGH' ? 'border-red-500 bg-red-50' :
                      recommendation.priority === 'MEDIUM' ? 'border-yellow-500 bg-yellow-50' :
                      'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900">{recommendation.title}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            recommendation.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                            recommendation.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {recommendation.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{recommendation.description}</p>
                        <p className="text-xs text-gray-500">{recommendation.reasoning}</p>
                      </div>
                      {recommendation.actionable && (
                        <Button size="sm" variant="secondary">
                          Take Action
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.insights.map((insight, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start">
                    <span className="text-blue-500 mr-2">💡</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {!analysis && !hasAnalyzed && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <p>Click "Analyze Portfolio" to get AI-powered insights about your portfolio</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIAnalysisPanel;