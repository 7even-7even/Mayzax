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

  const googleServicesIosPath = path.resolve(__dirname, './GoogleService-Info.plist');
  if (fs.existsSync(googleServicesIosPath)) {
    if (!config.ios) {
      config.ios = {};
    }
    config.ios.googleServicesFile = './GoogleService-Info.plist';
    console.log('Successfully configured ios.googleServicesFile using local GoogleService-Info.plist');
  } else {
    console.log('GoogleService-Info.plist not found in mobile/ root, skipping ios.googleServicesFile configuration.');
  }

  if (!config.extra) {
    config.extra = {};
  }
  if (!config.extra.eas) {
    config.extra.eas = {};
  }
  config.extra.eas.projectId = 'd731acec-24fb-4cd7-baa3-185e60299a30';

  return {
    ...config,
  };
};
