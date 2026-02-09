import { useState, useEffect } from "react";
import { User, AdminRoleData, GovernanceItem, SummaryItem, AzureApplication, OrganizationData } from "@/types/dashboard.types";
import { ENDPOINTS } from "@/constants/api";
import { processAdminRoles } from "@/utils/dashboardUtils";
import type { Dayjs } from "dayjs";

interface UseDashboardDataProps {
  selectedTenant: string;
  selectedSubscription: string | null;
  activeFilter: string;
  dateRange: [Dayjs, Dayjs];
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
  const [subSecurity, setSubSecurity] = useState<any>(null);
  const [isSubSecurityLoading, setIsSubSecurityLoading] = useState(false);
  const [secureScoreRaw, setSecureScoreRaw] = useState(null);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    let mgmtToken = localStorage.getItem("mgmt_token");
    let graphToken = localStorage.getItem("graph_token");
    const expiry = localStorage.getItem("token_expiry");

    const isExpired = expiry && Date.now() > (Number(expiry) - 300000);

    if (isExpired || !mgmtToken) {
      try {
        const response = await fetch("/api/auth/refresh", { method: "POST" });
        const newData = await response.json();
        localStorage.setItem("mgmt_token", newData.mgmtToken);
        localStorage.setItem("graph_token", newData.graphToken);
        localStorage.setItem("token_expiry", (Date.now() + 50 * 60 * 1000).toString());
        mgmtToken = newData.mgmtToken;
        graphToken = newData.graphToken;
      } catch (error) {
        window.location.href = "/login";
        return { "Authorization": "", "X-Graph-Token": "", "Content-Type": "application/json" };
      }
    }

    return {
      "Authorization": `Bearer ${mgmtToken}`,
      "X-Graph-Token": graphToken || "",
      "Content-Type": "application/json",
    };
  };

  // --- EFFECT 1: SUB-SECURITY FETCH (Triggered by Subscription Change) ---
  useEffect(() => {
    // If no sub, reset the security state and exit
    if (!selectedSubscription) {
      setSubSecurity(null);
      return;
    }

    const fetchSubData = async () => {
      setIsSubSecurityLoading(true);
      try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(
          `${ENDPOINTS.AZURE.SUB_POSTURE_DETAILS}?subscription_id=${selectedSubscription}`,
          { headers: authHeaders as any }
        );
        const result = await response.json();

        setSubSecurity({
          network: result.network || [],
          data: result.data || [],
          hygiene: result.hygiene || [],
          totalUnhealthy: result.totalUnhealthy || 0,
          // IMPORTANT: Added these so your SecurityTile can read them!
          highCount: result.highCount || 0,
          mediumCount: result.mediumCount || 0,
          lowCount: result.lowCount || 0
        });
      } catch (error) {
        console.error("Sub-posture fetch error:", error);
      } finally {
        setIsSubSecurityLoading(false);
      }
    };

    fetchSubData();
  }, [selectedSubscription]); // Watch only the sub ID

  // --- EFFECT 2: IDENTITY & TENANT DATA ---
  useEffect(() => {
    if (!selectedTenant) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const authHeaders = await getAuthHeaders();

        // Always fetch global tenant info if we don't have it
        const [userRes, appRes, orgRes, secureScoreRes] = await Promise.all([
          fetch(`${ENDPOINTS.AZURE.TANENT_USERS}?tenant_id=${selectedTenant}`, { headers: authHeaders as any }),
          fetch(`${ENDPOINTS.AZURE.TENANT_APPLICATIONS}?tenant_id=${selectedTenant}`, { headers: authHeaders as any }),
          fetch(`${ENDPOINTS.AZURE.ORGANIZATION}?tenant_id=${selectedTenant}`, { headers: authHeaders as any }),
          fetch(`${ENDPOINTS.AZURE.SECURITY_TENANT_POSTURE_DETAILS}`, { headers: authHeaders as any })
        ]);

        const userResData = await userRes.json();
        const appResData = await appRes.json();
        const orgResData = await orgRes.json();
        const secureData = await secureScoreRes.json();

        if (secureData && !secureData.error) {
          setSecureScoreRaw(secureData);
          const current = secureData.currentScore ?? 0;
          const max = secureData.maxScore ?? 0;
          setOverallScore(max > 0 ? Math.round((current / max) * 100) : 0);
        }

        const masterList = userResData.users || [];
        setAllTenantUsers(masterList);
        setApplications(appResData.applications || []);
        setOrganization(orgResData.organization);

        // --- SUBSCRIPTION SPECIFIC OVERRIDE ---
        if (selectedSubscription) {
          const subRes = await fetch(
            `${ENDPOINTS.AZURE.USERS}?subscription_id=${selectedSubscription}&tenant_id=${selectedTenant}`,
            { headers: authHeaders as any }
          );
          const subData = await subRes.json();
          setUsers(subData.users || []);
          setForeignGroupsCount(subData.foreignGroupsCount ?? null);
          setServicePrincipalsCount(subData.servicePrincipalsCount ?? null);
          setAdminRolesData(processAdminRoles(subData.users || []));
        } else {
          setUsers(masterList);
          setAdminRolesData(processAdminRoles(masterList));
        }
      } catch (err) {
        console.error("Data Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedTenant, selectedSubscription]);

  // --- EFFECT 3: M365 DATA ---
  useEffect(() => {
    if (!selectedTenant) return;
    const fetchM365Data = async () => {
      try {
        const authHeaders = await getAuthHeaders();
        const tenantQuery = `?tenant_id=${selectedTenant}`;
        const [licRes, ssRes] = await Promise.all([
          fetch(`${ENDPOINTS.MICROSOFT.LICENSE_AND_USAGE_DETAILS}${tenantQuery}`, { headers: authHeaders as any }),
          fetch(`${ENDPOINTS.MICROSOFT.SECURE_SCORE_DETAILS}${tenantQuery}`, { headers: authHeaders as any })
        ]);

        const licData = await licRes.json();
        const ssData = await ssRes.json();

        setLicenseUsageData(licData.tableData || []);
        
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

        setSummaryItems([identity, ...(ssData.cards || []), ...(licData.summaryItems || [])]);
      } catch (e) {
        console.error("M365 Error:", e);
      }
    };
    fetchM365Data();
  }, [selectedTenant, allTenantUsers.length]);

  // --- EFFECT 4: AUDIT LOGS ---
  useEffect(() => {
    if (!selectedTenant) return;
    const fetchAuditData = async () => {
      setIsAuditLoading(true);
      try {
        const authHeaders = await getAuthHeaders();
        const catMap: Record<string, string> = { 
          "Auth": "Authentication", "User": "UserManagement", 
          "Application": "ApplicationManagement", "Role": "RoleManagement" 
        };
        const apiCat = catMap[activeFilter] || "All";
        const res = await fetch(
          `${ENDPOINTS.AZURE.AUDIT_LOGS}?tenant_id=${selectedTenant}&category=${apiCat}&start_date=${dateRange[0].toISOString()}`,
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
  }, [selectedTenant, activeFilter, dateRange]);

  // --- EFFECT 5: GOVERNANCE ---
  useEffect(() => {
    if (!selectedTenant) return;
    const fetchGov = async () => {
      try {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${ENDPOINTS.MICROSOFT.IDENTITY_GOVERNANCE}?tenant_id=${selectedTenant}`, {
          headers: authHeaders as any
        });
        const data = await res.json();
        setIdentityGovernanceData(data);
      } catch (e) {
        console.error("Gov Error:", e);
      }
    };
    fetchGov();
  }, [selectedTenant]);

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
    subSecurity,
    isSubLoading: isSubSecurityLoading,
  };
};