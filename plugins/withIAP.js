const { withEntitlementsPlist } = require('@expo/config-plugins');

const withIAP = (config) => {
  return withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.InAppPurchase'] = true;
    return config;
  });
};

module.exports = withIAP;
