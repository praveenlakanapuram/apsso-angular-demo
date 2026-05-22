export const environment = {
  production: true,
  sso: {
    // domain: 'apsso.online',
    // authServiceUrl: 'https://apsso.online',
    // clientId: 'sso_b9654fee6c60f1c035545832e5e7d10a',
    // redirectUri: 'https://apsso-angular-demo-cnwf.vercel.app/auth/callback',
    domain: 'localhost:3007',
    authServiceUrl: 'http://localhost:3007',
    clientId: 'sso_28644cc46827981073e9db0d69a56049',
    redirectUri: 'http://localhost:4200/auth/callback',
    scopes: 'openid profile email roles department',
  },
};
