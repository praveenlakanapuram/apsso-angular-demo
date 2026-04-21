export const environment = {
  production: true,
  sso: {
    domain: '206.189.130.216',
    // authServiceUrl: 'https://206.189.130.216',
    authServiceUrl: 'http://localhost:3007',
    // clientId: 'sso_b9654fee6c60f1c035545832e5e7d10a',
    clientId: 'sso_28644cc46827981073e9db0d69a56049',
    // redirectUri: 'https://apsso-angular-demo-cnwf.vercel.app/auth/callback',
    redirectUri: 'http://localhost:4200/auth/callback',
    scopes: 'openid profile email roles department',
  },
};
