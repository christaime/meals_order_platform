import type { MockUser } from '@mock/services/keycloak-mock.service';

export const MOCK_USERS = {
  anonymous: null,

  admin: {
    sub: 'admin-1',
    email: 'admin@mealmarket.com',
    name: 'Admin User',
    idp: 'local',
    roles: ['ADMIN'],
  } as MockUser,

  vendor: {
    sub: 'vendor-1',
    email: 'vendor@mealmarket.com',
    name: 'Vendor User',
    idp: 'local',
    roles: ['VENDOR'],
  } as MockUser,

  customer: {
    sub: 'customer-1',
    email: 'customer@mealmarket.com',
    name: 'Customer User',
    idp: 'local',
    roles: ['CUSTOMER'],
  } as MockUser,

  multiRole: {
    sub: 'multi-1',
    email: 'multi@mealmarket.com',
    name: 'Multi Role User',
    idp: 'google',
    roles: ['VENDOR', 'CUSTOMER'],
  } as MockUser,
};
