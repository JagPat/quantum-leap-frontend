import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';

export const RockSolidVersionPanel = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [versionInfo, setVersionInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Load version info from build
    const loadVersionInfo = () => {
      const buildInfo = {
        service: 'quantum-leap-frontend',
        commit: import.meta.env.VITE_COMMIT_SHA || 'unknown',
        buildTime: import.meta.env.VITE_BUILD_TIME || 'unknown',
        imageDigest: import.meta.env.VITE_IMAGE_DIGEST || 'unknown',
        depsLockHash: import.meta.env.VITE_PACKAGE_LOCK_HASH || 'unknown',
        nodeVersion: import.meta.env.VITE_NODE_VERSION || 'unknown',
        environment: import.meta.env.MODE || 'production',
        timestamp: new Date().toISOString()
      };
      setVersionInfo(buildInfo);
    };

    loadVersionInfo();
  }, []);

  const copyToClipboard = async () => {
    if (versionInfo) {
      await navigator.clipboard.writeText(JSON.stringify(versionInfo, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="bg-black/80 text-white hover:bg-black/90"
        >
          <Eye className="w-4 h-4 mr-2" />
          Rock Solid Info
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="bg-black/90 text-white border-gray-700">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono">Rock Solid Audit</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="text-white hover:bg-gray-700"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="text-white hover:bg-gray-700"
              >
                <EyeOff className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-xs font-mono">
          {versionInfo && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-400">Service:</span>
                <Badge variant="outline" className="text-green-400 border-green-400">
                  {versionInfo.service}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Commit:</span>
                <span className="text-blue-400">{versionInfo.commit?.substring(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Build:</span>
                <span className="text-yellow-400">{versionInfo.buildTime?.substring(0, 10)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Digest:</span>
                <span className="text-purple-400">{versionInfo.imageDigest?.substring(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Deps:</span>
                <span className="text-orange-400">{versionInfo.depsLockHash?.substring(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <Badge variant="outline" className="text-green-400 border-green-400">
                  ✅ ROCK SOLID
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RockSolidVersionPanel;
