export const environment = {
  production: false,
  useMockServices: true,
  apiUrl: 'http://localhost:8081/api/v1',
  turnstileSiteKey: 'test',
  googleMapsApiKey: 'test',
  keycloak: {
    url: 'http://localhost:8080',
    realm: 'mealmarket',
    clientId: 'meal-marketplace-frontend',
  },
};
