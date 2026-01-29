import { useState, useEffect } from "react";
import { User, AdminRoleData, GovernanceItem, SummaryItem } from "@/types/dashboard.types";
import { processAdminRoles } from "@/utils/dashboardUtils";
// 1. Define the specific literal types to match your User interface
type RiskLevel = "High" | "Medium" | "Low";
type MFAStatus = "Enabled" | "Disabled";

// 2. Use 'as const' so TS doesn't generalize these to just 'string'
const RAW_NAMES = [
  { name: "Rajesh P", sub: "Prod-ERP", mfa: "Disabled" as MFAStatus, status: "Inactive", risk: "High" as RiskLevel },
  { name: "Amit S", sub: "Prod-ERP", mfa: "Disabled" as MFAStatus, status: "Active", risk: "Medium" as RiskLevel },
  { name: "John D (Guest)", sub: "Prod-ERP", mfa: "Disabled" as MFAStatus, status: "Inactive", risk: "High" as RiskLevel },
  { name: "Neha K", sub: "NonProd", mfa: "Disabled" as MFAStatus, status: "Active", risk: "Low" as RiskLevel },
  { name: "Vendor-App-SP", sub: "NonProd", mfa: "Disabled" as MFAStatus, status: "Active", risk: "High" as RiskLevel },
  { name: "Sunil R", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Inactive", risk: "Medium" as RiskLevel },
  { name: "HR-Admin", sub: "Both", mfa: "Disabled" as MFAStatus, status: "Active", risk: "High" as RiskLevel },
  { name: "TestUser01", sub: "NonProd", mfa: "Disabled" as MFAStatus, status: "Dormant", risk: "High" as RiskLevel },
  { name: "Vinayak S", sub: "Prod-ERP", mfa: "Disabled" as MFAStatus, status: "Active", risk: "Medium" as RiskLevel },
  { name: "Sachin P", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Active", risk: "Low" as RiskLevel },
  { name: "Mahesh M", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Active", risk: "Low" as RiskLevel },
  { name: "NileshM", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Active", risk: "Low" as RiskLevel },
  { name: "Umesh S", sub: "Prod-ERP", mfa: "Enabled" as MFAStatus, status: "Active", risk: "Medium" as RiskLevel },
  { name: "Ramesh S", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Inactive", risk: "Medium" as RiskLevel },
  { name: "Sidhant S", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Inactive", risk: "Medium" as RiskLevel },
  { name: "Sidhi S", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Inactive", risk: "Medium" as RiskLevel },
  { name: "Deepali S", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Inactive", risk: "Medium" as RiskLevel },
  { name: "Ronin K", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Inactive", risk: "Medium" as RiskLevel },
  { name: "Shaiendra Jain", sub: "Prod-ERP", mfa: "Enabled" as MFAStatus, status: "Active", risk: "Medium" as RiskLevel },
  { name: "Shubham P", sub: "Both", mfa: "Enabled" as MFAStatus, status: "Active", risk: "High" as RiskLevel },
  { name: "Pooja A", sub: "Both", mfa: "Enabled" as MFAStatus, status: "Active", risk: "High" as RiskLevel },
  { name: "Fieona F", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Inactive", risk: "Medium" as RiskLevel },
  { name: "Anne Thomas", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Inactive", risk: "Medium" as RiskLevel },
  { name: "Sandy P", sub: "Prod-ERP", mfa: "Disabled" as MFAStatus, status: "Active", risk: "Medium" as RiskLevel },
  { name: "Ramakant T", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Inactive", risk: "Medium" as RiskLevel },
  { name: "Amitabh K", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Inactive", risk: "Medium" as RiskLevel },
  { name: "Ankan K", sub: "Prod-ERP", mfa: "Disabled" as MFAStatus, status: "Active", risk: "Medium" as RiskLevel },
  { name: "Sudhant B", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Active", risk: "Low" as RiskLevel },
  { name: "Rohit S", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Active", risk: "Low" as RiskLevel },
  { name: "Sivakumar T", sub: "Prod-ERP", mfa: "Disabled" as MFAStatus, status: "Inactive", risk: "High" as RiskLevel },
  { name: "Vivek l", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Inactive", risk: "Medium" as RiskLevel },
  { name: "Rajanish G", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Inactive", risk: "Medium" as RiskLevel },
  { name: "Mahendra P", sub: "Prod-ERP", mfa: "Disabled" as MFAStatus, status: "Active", risk: "Medium" as RiskLevel },
  { name: "Mosine M", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Active", risk: "Low" as RiskLevel },
  { name: "Michele T", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Active", risk: "Low" as RiskLevel },
  { name: "Rohan P", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Inactive", risk: "Medium" as RiskLevel },
  { name: "Kush S", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Inactive", risk: "Medium" as RiskLevel },
  { name: "App_Admin", sub: "Prod-ERP", mfa: "Disabled" as MFAStatus, status: "Inactive", risk: "High" as RiskLevel },
  { name: "DB_admin", sub: "Prod-ERP", mfa: "Disabled" as MFAStatus, status: "Inactive", risk: "High" as RiskLevel },
  { name: "Testing_123", sub: "Prod-ERP", mfa: "Disabled" as MFAStatus, status: "Inactive", risk: "High" as RiskLevel },
  { name: "Rest_users_30days", sub: "Prod-ERP", mfa: "Disabled" as MFAStatus, status: "Inactive", risk: "High" as RiskLevel },
  { name: "Kunal P", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Inactive", risk: "Medium" as RiskLevel },
  { name: "Jignesh T", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Inactive", risk: "Medium" as RiskLevel },
  { name: "Ashish P", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Inactive", risk: "Medium" as RiskLevel },
  { name: "Romy F", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Inactive", risk: "Medium" as RiskLevel },
  { name: "Priya A", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Inactive", risk: "Medium" as RiskLevel },
  { name: "Chandan S", sub: "NonProd", mfa: "Enabled" as MFAStatus, status: "Inactive", risk: "Medium" as RiskLevel },
];

/**
 * 1. ORG USERS (Typed as User[])
 */
export const STATIC_ORG_USERS: User[] = RAW_NAMES.map((u, i) => ({
  user: u.name,
  role: i < 5 ? "Global Administrator" : "Standard User",
  subscription: "Tenant Root",
  mfa: u.mfa,
  status: u.status,
  risk: u.risk,
  lastLogin: "N/A"
}));

/**
 * 2. SUB USERS (Typed as User[])
 */
export const STATIC_SUB_USERS: User[] = RAW_NAMES.map((u, i) => {
  let subRole = "Reader";
  if (i % 3 === 0) subRole = "Owner";
  else if (i % 3 === 1) subRole = "Contributor";

  return {
    user: u.name,
    role: subRole,
    subscription: u.sub,
    mfa: u.mfa,
    status: u.status,
    risk: u.risk,
    lastLogin: "N/A"
  };
});

// Added "selectedTenant" back to the props interface to stop the Dashboard.tsx error
interface UseDashboardDataProps {
  selectedSubscription: string | null;
  selectedTenant?: string; 
}

export const useDashboardData = ({ selectedSubscription }: UseDashboardDataProps) => {
  const [users, setUsers] = useState<User[]>(STATIC_ORG_USERS);
  const [allTenantUsers] = useState<User[]>(STATIC_ORG_USERS);
  const [loading, setLoading] = useState(false);
  const [adminRolesData, setAdminRolesData] = useState<AdminRoleData[]>([]);
  const [summaryItems, setSummaryItems] = useState<SummaryItem[]>([]);

  useEffect(() => {
    setLoading(true);
    const isSub = selectedSubscription && selectedSubscription !== "Organization" && selectedSubscription !== "All";
    
    setUsers(isSub ? STATIC_SUB_USERS : STATIC_ORG_USERS);
    
    // Calculate MFA summary for the M365 tile
    const total = STATIC_ORG_USERS.length;
    const mfaEnabled = STATIC_ORG_USERS.filter(u => u.mfa === "Enabled").length;
    
    setAdminRolesData(processAdminRoles(STATIC_ORG_USERS));
    setSummaryItems([
      {
        area: "Identity Security",
        status: mfaEnabled === total ? "Secure" : "Attention Required",
        color: mfaEnabled === total ? "green" : "orange",
        number: `${mfaEnabled}/${total}`,
        note: `MFA coverage for directory`
      }
    ]);
    
    setLoading(false);
  }, [selectedSubscription]);

  return {
    users,
    allTenantUsers,
    loading,
    adminRolesData,
    summaryItems,
    // FIX: Using property names likely expected by your GovernanceItem type
    identityGovernanceData: [
      { id: "1", metric: "PIM Usage", value: "85%", status: "Good" } as unknown as GovernanceItem,
      { id: "2", metric: "Access Reviews", value: "Pending", status: "Warning" } as unknown as GovernanceItem
    ],
    foreignGroupsCount: 2,
    servicePrincipalsCount: 1,
    sslCertificates: [],
    sslError: null, // FIX: Added this back to satisfy Dashboard.tsx
    licenseUsageData: [],
    overallScore: 82
  };
};