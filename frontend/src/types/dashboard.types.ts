export interface User {
  user: string;
  principalType?: string;
  role: string;
  subscription: string;
  mfa: string;
  lastLogin: string;
  status: string;
  risk: "High" | "Medium" | "Low";
}

export interface AzureApplication {
  id: string;
  appId: string;
  displayName: string;
  createdDateTime: string;
  signInAudience: string;
}

export interface LicenseUsageData {
  license: string;
  purchased: number;
  assigned: number;
  unused: number;
  inactive: number | string;
  potentialSavings: string;
}

export interface SummaryItem {
  area: string;
  status: string;
  color: string;
  note: string;
  number: string; // Add this line - it must be a string to handle ratios like "6/7"
}

export interface LicenseUsageAPIResponse {
  overallScore: number;
  summaryItems: SummaryItem[];
  tableData: LicenseUsageData[];
}

export interface GovernanceItem {
  category: string;
  count: number | string;
}

export interface SubscriptionMetadata {
  state: string;
  authorizationSource: string;
  subscriptionId: string;
  subscriptionPolicies: { spendingLimit: string };
}

export interface SubscriptionOption {
  value: string;
  label: string;
}

export interface AdminRoleData {
  role: string;
  assignedUsers: string;
  mfaEnabled: string;
}

export interface ModalData {
  title: string;
  columns: Array<{ key: string; label: string; width?: string; render?: (value: any, record?: any) => React.ReactNode }>;
  data: any[];
}

export interface DashboardState {
  users: User[];
  loading: boolean;
  foreignGroupsCount: number | null;
  servicePrincipalsCount: number | null;
  selectedTenant: string;
  selectedSubscription: string;
  azureSubscriptions: SubscriptionOption[];
  adminRolesData: AdminRoleData[];
  mgtToken: string;
  subMetadata: SubscriptionMetadata | null;
  selectedTile: string;
  sslCertificates: any[];
  isLoading: boolean;
  error: string | null;
  detailModalVisible: boolean;
  selectedCardData: ModalData | null;
  sslError: string | null;
  licenseUsageData: any[];
  overallScore: number;
  summaryItems: SummaryItem[];
  identityGovernanceData: GovernanceItem[];
}
export interface VerifiedDomain {
  name: string;
  isDefault: boolean;
  isInitial: boolean;
  capabilities: string;
  type: string;
}

export interface OrganizationData {
  tenantId: string;
  tenantName: string;
  domain: string;
  isSynced: boolean | null;
  lastSync?: string | null; // Handled as optional for build stability
  city: string;
  state: string;
  country: string;
  street: string;
  zipCode: string;
  quota: {
    used: number;
    total: number;
    percent: number;
  };
  supportEmail: string;
  tenantType: string;
  createdOn: string;
}