import { getBuildInfo } from '../utils/version';

export const versionHandler = (req, res) => {
  try {
    const versionInfo = {
      success: true,
      data: getBuildInfo(),
      timestamp: new Date().toISOString(),
      endpoint: '/api/version'
    };
    
    res.json(versionInfo);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get version info',
      message: error.message
    });
  }
};
