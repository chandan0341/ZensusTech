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

  // Helper to get tokens from localStorage
  const getAuthHeaders = () => {
    const mgmtToken = localStorage.getItem("mgmt_token");
    const graphToken = localStorage.getItem("graph_token");
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
        // Appending tenant_id as a query param since backend expects it
        const response = await fetch(`${ENDPOINTS.AZURE.TANENT_USERS}?tenant_id=${selectedTenant}`, {
          method: "GET",
          headers: getAuthHeaders(),
        });
        
        if (response.status === 401 || response.status === 403) {
          console.error("Auth Error: Check X-Graph-Token and Mgmt Token in LocalStorage");
        }

        const data = await response.json();
        const tenantUserList = data.users || [];
        
        setAllTenantUsers(tenantUserList);
        setUsers(tenantUserList);
        setAdminRolesData(processAdminRoles(tenantUserList));
      } catch (err) {
        console.error("Tenant Fetch Error:", err);
      } finally {
        // If no subscription is selected, we stop loading here
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
        const response = await fetch(
          `${ENDPOINTS.AZURE.USERS}?subscription_id=${selectedSubscription}&tenant_id=${selectedTenant}`, 
          {
            method: "GET",
            headers: getAuthHeaders(),
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
    console.log("useEffect Triggered! Tenant:", selectedTenant);
    const fetchM365Data = async () => {
      if (!selectedTenant) return;
      try {
        const headers = getAuthHeaders();
        const tenantQuery = `?tenant_id=${selectedTenant}`;

        // Fetch License and Secure Score in parallel
        const [licRes, ssRes] = await Promise.all([
          fetch(`${ENDPOINTS.MICROSOFT.LICENSE_AND_USAGE_DETAILS}${tenantQuery}`, { headers }),
          fetch(`${ENDPOINTS.MICROSOFT.SECURE_SCORE_DETAILS}${tenantQuery}`, { headers })
        ]);

        const licData = await licRes.json();
        const ssData = await ssRes.json();
        console.log("Full License API Response:", licData);
        console.log("Full License API  tableData Response:", licData.tableData);

        setLicenseUsageData(licData.tableData || []);
        setOverallScore(licData.overallScore || 0);

        // Identity Logic
        const total = allTenantUsers.length;
        const mfaEnabled = allTenantUsers.filter(u => u.mfa === "Enabled").length;
        const identity: SummaryItem = {
          area: "Identity Security",
          status: total > 0 && mfaEnabled === total ? "Secure" : "Attention Required",
          color: total > 0 && mfaEnabled === total ? "green" : "orange",
          number: `${mfaEnabled}/${total}`,
          note: `MFA status for ${total} users`
        };

        const unified = [identity, ...(ssData.cards || []), ...(licData.summaryItems || [])];
        setSummaryItems(unified);
      } catch (e) { 
        console.error("M365 Aggregation Error:", e); 
      } finally {
        // Ensure loading is false if M365 was the last thing we were waiting for
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
        const res = await fetch(`${ENDPOINTS.MICROSOFT.IDENTITY_GOVERNANCE}?tenant_id=${selectedTenant}`, { 
          method: "GET",
          headers: getAuthHeaders() 
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