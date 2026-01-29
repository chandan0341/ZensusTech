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
  number?: string; // Add this line (the '?' makes it optional)
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
