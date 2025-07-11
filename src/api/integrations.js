// Mock integrations to replace Base44 integrations
// These are integration configurations for various services

export const integrations = {
  zerodha: {
    name: 'Zerodha Kite',
    type: 'broker',
    config: {
      api_url: 'https://api.kite.trade',
      auth_url: 'https://kite.zerodha.com/connect/login',
      redirect_params: 'api_key'
    }
  },
  
  upstox: {
    name: 'Upstox',
    type: 'broker',
    config: {
      api_url: 'https://api.upstox.com',
      auth_url: 'https://api.upstox.com/v2/login/authorization/dialog',
      redirect_params: 'client_id'
    }
  }
};

export const getIntegration = (name) => integrations[name];
export const getAllIntegrations = () => Object.values(integrations);
export const getBrokerIntegrations = () => 
  Object.values(integrations).filter(i => i.type === 'broker');

export const Core = {
  InvokeLLM: async (prompt) => {
    console.log('Mock LLM invocation:', prompt);
    return { response: 'This is a mock LLM response. Integrate with actual LLM service.' };
  },
  SendEmail: async (config) => {
    console.log('Mock email send:', config);
    return { success: true, message: 'Email mock sent successfully' };
  },
  UploadFile: async (file) => {
    console.log('Mock file upload:', file);
    return { success: true, url: 'mock://uploaded-file-url' };
  },
  GenerateImage: async (prompt) => {
    console.log('Mock image generation:', prompt);
    return { success: true, url: 'mock://generated-image-url' };
  },
  ExtractDataFromUploadedFile: async (fileUrl) => {
    console.log('Mock data extraction:', fileUrl);
    return { success: true, data: { extracted: 'mock data' } };
  }
};

// Export individual functions for backward compatibility
export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const UploadFile = Core.UploadFile;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;

// Add a default export for compatibility
export default {
  InvokeLLM,
  SendEmail,
  UploadFile,
  GenerateImage,
  ExtractDataFromUploadedFile,
  Core
};
