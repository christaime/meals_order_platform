import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    /**
     * Base URL for the app under test.
     *
     * Override with CYPRESS_BASE_URL for local development:
     *   CYPRESS_BASE_URL=http://localhost:4200 npx cypress run
     */
    baseUrl: process.env['CYPRESS_BASE_URL'] ?? 'https://localhost:4300',

    viewportWidth: 1280,
    viewportHeight: 800,

    video: false,
    screenshotOnRunFailure: true,

    defaultCommandTimeout: 10_000,
    requestTimeout: 15_000,
    responseTimeout: 15_000,

    retries: {
      runMode: 1,       // retry once on failure in CI
      openMode: 0,      // no retry in interactive mode
    },

    setupNodeEvents(_on, config) {
      return config;
    },
  },
});
