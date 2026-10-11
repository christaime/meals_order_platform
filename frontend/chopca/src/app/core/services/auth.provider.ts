import { environment } from '@environments/environment';
import { provideKeycloak } from 'keycloak-angular';
import { EnvironmentProviders, Provider } from '@angular/core';

export const authProvider = (): Array<Provider | EnvironmentProviders> => {
  console.log(" Auth provider : useMockServices ? ", environment.useMockServices);

  if (environment.useMockServices) {
    return [];
  } else {
    return [
      provideKeycloak({
        config: {
          url: environment.keycloak.url,
          realm: environment.keycloak.realm,
          clientId: environment.keycloak.clientId,
        },
        initOptions: {
          onLoad: 'check-sso',
          silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
          checkLoginIframe: false,
          pkceMethod: 'S256',
        },
      })
    ];
  }
};
