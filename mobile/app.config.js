const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const googleServicesPath = path.resolve(__dirname, './google-services.json');
  
  if (fs.existsSync(googleServicesPath)) {
    if (!config.android) {
      config.android = {};
    }
    config.android.googleServicesFile = './google-services.json';
    console.log('Successfully configured android.googleServicesFile using local google-services.json');
  } else {
    console.log('google-services.json not found in mobile/ root, skipping android.googleServicesFile configuration.');
  }

  return {
    ...config,
  };
};
