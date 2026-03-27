export const environment = {
  production: true,
  sso: {
    domain: '206.189.130.216',
    authServiceUrl: 'http://localhost:4200',
    clientId: 'sso_a44190793be441bacd39310cfdf1f322',
    redirectUri: 'http://localhost:4200/auth/callback',
    scopes: 'openid profile email roles department',
  },
};
