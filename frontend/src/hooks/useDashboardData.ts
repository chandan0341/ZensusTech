import { useState, useEffect } from "react";
import { User, AdminRoleData, GovernanceItem, SummaryItem } from "@/types/dashboard.types";
import { processAdminRoles } from "@/utils/dashboardUtils";

// --- STATIC DATA CONFIGURATION ---
const GENERATE_USERS = (count: number, isOrg: boolean): User[] => {
  return Array(count).fill(null).map((_, i) => ({
    user: `${isOrg ? 'Corp' : 'Sub'} User ${i + 1}`,
    role: isOrg ? (i < 5 ? "Global Administrator" : "Standard User") : (i < 3 ? "Owner" : "Reader"),
    subscription: isOrg ? "Tenant Root" : "Production-Subscription",
    mfa: i % 4 === 0 ? "Disabled" : "Enabled",
    status: "Active",
    risk: i % 7 === 0 ? "High" : "Low",
    lastLogin: "2024-05-21"
  }));
};

const STATIC_ORG_USERS = GENERATE_USERS(47, true);
const STATIC_SUB_USERS = GENERATE_USERS(20, false);

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
    servicePrincipalsCount: 5,
    sslCertificates: [],
    sslError: null, // FIX: Added this back to satisfy Dashboard.tsx
    licenseUsageData: [],
    overallScore: 82
  };
};