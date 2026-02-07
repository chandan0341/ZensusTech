import { useState, useEffect } from "react";
import { User, AdminRoleData, GovernanceItem, SummaryItem ,AzureApplication,OrganizationData} from "@/types/dashboard.types";
import { ENDPOINTS } from "@/constants/api";
import { processAdminRoles } from "@/utils/dashboardUtils";
import type { Dayjs } from "dayjs"; // Fixed dayjs namespace (TS2503 fix)

interface UseDashboardDataProps {
  selectedTenant: string;
  selectedSubscription: string | null;
  activeFilter: string;           // Add this
  dateRange: [Dayjs, Dayjs]; // Add this
  
}

export const useDashboardData = ({
  selectedTenant,
  selectedSubscription,
  activeFilter,
  dateRange,
}: UseDashboardDataProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [allTenantUsers, setAllTenantUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [foreignGroupsCount, setForeignGroupsCount] = useState<number | null>(null);
  const [servicePrincipalsCount, setServicePrincipalsCount] = useState<number | null>(null);
  const [adminRolesData, setAdminRolesData] = useState<AdminRoleData[]>([]);
  const [licenseUsageData, setLicenseUsageData] = useState<any[]>([]);
  const [overallScore, setOverallScore] = useState<number>(0);
  const [summaryItems, setSummaryItems] = useState<SummaryItem[]>([]);
  const [identityGovernanceData, setIdentityGovernanceData] = useState<GovernanceItem[]>([]);
  const [applications, setApplications] = useState<AzureApplication[]>([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  // Keep existing score for the main dashboard KPI cards
  
  // NEW: Create state for the full Azure response
  const [secureScoreRaw, setSecureScoreRaw] = useState(null); 

  
  // Helper to get tokens and manage expiry
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    let mgmtToken = localStorage.getItem("mgmt_token");
    let graphToken = localStorage.getItem("graph_token");
    const expiry = localStorage.getItem("token_expiry");

    // Check if token is expired or about to expire
    const isExpired = expiry && Date.now() > (Number(expiry) - 300000);

    if (isExpired || !mgmtToken) {
      try {
        const response = await fetch("/api/auth/refresh", { method: "POST" });
        const newData = await response.json();
        
        localStorage.setItem("mgmt_token", newData.mgmtToken);
        localStorage.setItem("graph_token", newData.graphToken);
        const FIFTY_MINUTES_IN_MS = 50 * 60 * 1000;
        localStorage.setItem("token_expiry", (Date.now() + FIFTY_MINUTES_IN_MS).toString());
        
        mgmtToken = newData.mgmtToken;
        graphToken = newData.graphToken;
      } catch (error) {
        console.error("Session expired.");
        window.location.href = "/login";
        // Return empty strings instead of empty object to satisfy TypeScript
        return { "Authorization": "", "X-Graph-Token": "", "Content-Type": "application/json" };
      }
    }

    return {
      "Authorization": `Bearer ${mgmtToken}`,
      "X-Graph-Token": graphToken || "",
      "Content-Type": "application/json",
    };
  };

  // CONSOLIDATED USER FETCH: One effect to rule them all
useEffect(() => {
  if (!selectedTenant) return;

  const fetchData = async () => {
    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      
      // 1. Fetch TENANT-WIDE data (including your new Batched Security API)
      if (selectedTenant && !selectedSubscription) {
        const [userRes, appRes, orgRes, secureScoreRes] = await Promise.all([
          fetch(`${ENDPOINTS.AZURE.TANENT_USERS}?tenant_id=${selectedTenant}`, { headers: authHeaders as any }),
          fetch(`${ENDPOINTS.AZURE.TENANT_APPLICATIONS}?tenant_id=${selectedTenant}`, { headers: authHeaders as any }),
          fetch(`${ENDPOINTS.AZURE.ORGANIZATION}?tenant_id=${selectedTenant}`, { headers: authHeaders as any }),
          // This endpoint now returns the BATCHED score + remediation
          fetch(`${ENDPOINTS.AZURE.SECURITY_TENANT_POSTURE_DETAILS}`, { headers: authHeaders as any })
        ]);

        const userResData = await userRes.json();
        const appResData = await appRes.json();
        const orgResData = await orgRes.json();
        const secureData = await secureScoreRes.json();

       // Inside useDashboardData.ts
        if (secureData && !secureData.error) {
          setSecureScoreRaw(secureData); 

          // Use the specific keys from your API response: currentScore and maxScore
          const current = secureData.currentScore ?? 0;
          const max = secureData.maxScore ?? 0;

          if (max > 0) {
            const calculatedPercentage = Math.round((current / max) * 100);
            setOverallScore(calculatedPercentage);
            console.log("Hook calculated score:", calculatedPercentage); // Should log 89
          } else {
            setOverallScore(0);
          }
      }

        const masterList = userResData.users || [];
        setAllTenantUsers(masterList);
        setApplications(appResData.applications || []);
        setOrganization(orgResData.organization);
        
        // Reset specific counts
        setForeignGroupsCount(null);
        setServicePrincipalsCount(null);
        setAdminRolesData(processAdminRoles(masterList));
      }

      // 2. Fetch SUBSCRIPTION-specific data
      if (selectedTenant && selectedSubscription) {
        const subRes = await fetch(
          `${ENDPOINTS.AZURE.USERS}?subscription_id=${selectedSubscription}&tenant_id=${selectedTenant}`, 
          { headers: authHeaders as any }
        );
        const subData = await subRes.json();
        
        setUsers(subData.users || []);
        setForeignGroupsCount(subData.foreignGroupsCount ?? null);
        setServicePrincipalsCount(subData.servicePrincipalsCount ?? null);
        
        // Update Admin chart based on the selected subscription's users
        setAdminRolesData(processAdminRoles(subData.users || []));
      } else {
        // Fallback to all tenant users if no subscription is selected
        setUsers(allTenantUsers); 
      }
    } catch (err) {
      console.error("Data Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [selectedTenant, selectedSubscription]); // Removed allTenantUsers.length to prevent unnecessary loops
  // 4. M365 DATA AGGREGATION
  useEffect(() => {
    const fetchM365Data = async () => {
      if (!selectedTenant) return;
      try {
        const authHeaders = await getAuthHeaders(); 
        const tenantQuery = `?tenant_id=${selectedTenant}`;

        const [licRes, ssRes] = await Promise.all([
          fetch(`${ENDPOINTS.MICROSOFT.LICENSE_AND_USAGE_DETAILS}${tenantQuery}`, { headers: authHeaders as HeadersInit }),
          fetch(`${ENDPOINTS.MICROSOFT.SECURE_SCORE_DETAILS}${tenantQuery}`, { headers: authHeaders as HeadersInit })
        ]);

        const licData = await licRes.json();
        const ssData = await ssRes.json();

        setLicenseUsageData(licData.tableData || []);
        setOverallScore(licData.overallScore || 0);

        // Identity Logic: Correctly reflects 6/7 MFA users
        const total = allTenantUsers.length;
        const mfaEnabled = allTenantUsers.filter(u => u.mfa === "Enabled").length;
        const mfaDisabled = total - mfaEnabled;
        
        const identity: SummaryItem = {
          area: "Identity Security",
          status: total > 0 && mfaEnabled === total ? "Secure" : "Attention Required",
          color: total > 0 && mfaEnabled === total ? "green" : "orange",
          number: `${mfaDisabled}/${total}`,
          note: `MFA status for ${total} users`
        };

        // License Logic: Ensures 4/4 display for Optimized status
        const updatedSummary = (licData.summaryItems || []).map((item: SummaryItem) => {
          if (item.area === "License Optimization" && item.status === "Optimized") {
            const totalPurchased = (licData.tableData || []).reduce((acc: number, curr: any) => acc + (curr.purchased || 0), 0);
            const totalAssigned = (licData.tableData || []).reduce((acc: number, curr: any) => acc + (curr.assigned || 0), 0);
            return { ...item, number: `${totalAssigned}/${totalPurchased}` };
          }
          return item;
        });

        setSummaryItems([identity, ...(ssData.cards || []), ...updatedSummary]);
      } catch (e) { 
        console.error("M365 Aggregation Error:", e); 
      } finally {
        setLoading(false);
      }
    };
    fetchM365Data();
  }, [selectedTenant, allTenantUsers]);

  // 5. GOVERNANCE
  useEffect(() => {
    const fetchGov = async () => {
      if (!selectedTenant) return;
      try {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${ENDPOINTS.MICROSOFT.IDENTITY_GOVERNANCE}?tenant_id=${selectedTenant}`, { 
          method: "GET",
          headers: authHeaders as HeadersInit 
        });
        const data = await res.json();
        setIdentityGovernanceData(data);
      } catch (e) { 
        console.error("Governance Error:", e); 
      }
    };
    fetchGov();
  }, [selectedTenant]);
  useEffect(() => {
    const fetchAuditData = async () => {
      if (!selectedTenant) return;

      setIsAuditLoading(true);
      try {
        const authHeaders = await getAuthHeaders();
        const catMap: Record<string, string> = { 
      "Auth": "Authentication", 
      "User": "UserManagement", 
      "Application": "ApplicationManagement", 
      "Role": "RoleManagement" 
    };
        
        const apiCat = catMap[activeFilter] || "All";
        const startDate = encodeURIComponent(dateRange[0].toISOString());

        const res = await fetch(
          `${ENDPOINTS.AZURE.AUDIT_LOGS}?tenant_id=${selectedTenant}&category=${apiCat}&start_date=${startDate}`,
          { headers: authHeaders as any }
        );

        const data = await res.json();
        setAuditLogs(data.logs || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsAuditLoading(false);
      }
    };

    fetchAuditData();
  }, [selectedTenant, activeFilter, dateRange]); // Errors gone! These are now tracked dependencies.
  return {
    users,
    applications,
    allTenantUsers,
    loading,
    foreignGroupsCount,
    servicePrincipalsCount,
    adminRolesData,
    licenseUsageData,
    overallScore,
    summaryItems,
    identityGovernanceData,
    auditLogs,
    isAuditLoading,
    organization,
    secureScoreRaw,
    };
};