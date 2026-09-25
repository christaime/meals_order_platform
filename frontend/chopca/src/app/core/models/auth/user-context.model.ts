
export type ContextStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'BANNED'
  | 'INACTIVE';

export interface UserContext {
  keycloakId: string;
  vendor: VendorContext | null;
  customer: CustomerContext | null;
  admin: AdminContext | null;
}

export interface VendorContext {
  id: string;
  businessName: string;
  status: ContextStatus;
  profileImageUrl: string | null;
  profileImageStorageRef: string | null;
}

export interface CustomerContext {
  id: string;
  displayName: string;
  status: ContextStatus;
}

export interface AdminContext {
  id: string;
  displayName: string;
  status: ContextStatus;
}
