import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Alert, AlertDescription } from './alert';
import { Button } from './button';
import { 
  Construction, 
  Clock, 
  Lightbulb, 
  ExternalLink,
  CheckCircle
} from 'lucide-react';

const FeatureNotImplemented = ({ 
  feature, 
  message, 
  plannedFeatures = [], 
  frontendExpectation,
  showPlannedFeatures = true 
}) => {
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <Construction className="w-5 h-5" />
          Feature Coming Soon
          <Badge variant="outline" className="border-amber-300 text-amber-700">
            Planned
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-amber-200 bg-amber-100/50">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {message || 'This feature is planned but not yet implemented.'}
          </AlertDescription>
        </Alert>

        {frontendExpectation && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">What to expect:</p>
                <p className="text-sm text-blue-700 mt-1">{frontendExpectation}</p>
              </div>
            </div>
          </div>
        )}

        {showPlannedFeatures && plannedFeatures.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Planned Features:</p>
            <div className="space-y-1">
              {plannedFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = '/settings'}
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Configure AI Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureNotImplemented; 