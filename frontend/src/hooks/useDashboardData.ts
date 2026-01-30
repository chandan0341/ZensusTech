import { useState, useEffect } from "react";
import { User, AdminRoleData, GovernanceItem, SummaryItem } from "@/types/dashboard.types";
import { fetchSSLCertificates } from "@/services/dashboardApi";
import { ENDPOINTS } from "@/constants/api";
import { processAdminRoles } from "@/utils/dashboardUtils";

interface UseDashboardDataProps {
  selectedTenant: string;
  selectedSubscription: string | null;
}

export const useDashboardData = ({
  selectedTenant,
  selectedSubscription,
}: UseDashboardDataProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [allTenantUsers, setAllTenantUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [foreignGroupsCount, setForeignGroupsCount] = useState<number | null>(null);
  const [servicePrincipalsCount, setServicePrincipalsCount] = useState<number | null>(null);
  const [adminRolesData, setAdminRolesData] = useState<AdminRoleData[]>([]);
  const [sslCertificates, setSslCertificates] = useState<any[]>([]);
  const [sslError, setSslError] = useState<string | null>(null);
  const [licenseUsageData, setLicenseUsageData] = useState<any[]>([]);
  const [overallScore, setOverallScore] = useState<number>(0);
  const [summaryItems, setSummaryItems] = useState<SummaryItem[]>([]);
  const [identityGovernanceData, setIdentityGovernanceData] = useState<GovernanceItem[]>([]);

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

  // 1. TENANT-LEVEL USERS & ADMIN ROLES
  useEffect(() => {
    if (!selectedTenant) return;
    const fetchTenantData = async () => {
      setLoading(true);
      try {
        const authHeaders = await getAuthHeaders(); // Corrected async call
        const response = await fetch(`${ENDPOINTS.AZURE.TANENT_USERS}?tenant_id=${selectedTenant}`, {
          method: "GET",
          headers: authHeaders as HeadersInit,
        });

        const data = await response.json();
        const tenantUserList = data.users || [];
        setAllTenantUsers(tenantUserList);
        setUsers(tenantUserList);
        setAdminRolesData(processAdminRoles(tenantUserList));
      } catch (err) {
        console.error("Tenant Fetch Error:", err);
      } finally {
        if (!selectedSubscription) setLoading(false);
      }
    };
    fetchTenantData();
  }, [selectedTenant, selectedSubscription]);

  // 2. SUBSCRIPTION-LEVEL DATA
  useEffect(() => {
    if (!selectedTenant || !selectedSubscription) return;
    const fetchSubscriptionData = async () => {
      setLoading(true);
      try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(
          `${ENDPOINTS.AZURE.USERS}?subscription_id=${selectedSubscription}&tenant_id=${selectedTenant}`, 
          {
            method: "GET",
            headers: authHeaders as HeadersInit,
          }
        );
        const data = await response.json();
        setUsers(data.users || []);
        setForeignGroupsCount(data.foreignGroupsCount ?? null);
        setServicePrincipalsCount(data.servicePrincipalsCount ?? null);
      } catch (err) {
        console.error("Sub Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubscriptionData();
  }, [selectedSubscription, selectedTenant]);

  // 3. SSL CERTIFICATES
  useEffect(() => {
    const fetchSSL = async () => {
      if (!selectedTenant || !selectedSubscription) return;
      try {
        const data = await fetchSSLCertificates(selectedTenant, selectedSubscription);
        setSslCertificates(data);
      } catch (err) {
        setSslError("SSL Error");
      }
    };
    fetchSSL();
  }, [selectedTenant, selectedSubscription]);

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
        
        const identity: SummaryItem = {
          area: "Identity Security",
          status: total > 0 && mfaEnabled === total ? "Secure" : "Attention Required",
          color: total > 0 && mfaEnabled === total ? "green" : "orange",
          number: `${mfaEnabled}/${total}`,
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

  return {
    users,
    allTenantUsers,
    loading,
    foreignGroupsCount,
    servicePrincipalsCount,
    adminRolesData,
    sslCertificates,
    sslError,
    licenseUsageData,
    overallScore,
    summaryItems,
    identityGovernanceData,
  };
};