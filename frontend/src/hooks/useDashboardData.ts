import { useState, useEffect } from "react";
import { User, AdminRoleData, GovernanceItem, SummaryItem } from "@/types/dashboard.types";
import { fetchSSLCertificates } from "@/services/dashboardApi";
import { ENDPOINTS } from "@/constants/api";
import { processAdminRoles } from "@/utils/dashboardUtils";
import { message } from "antd";

interface UseDashboardDataProps {
  clientId: string;
  clientSecret: string;
  selectedTenant: string;
  selectedSubscription: string;
  mgtToken: string;
}

export const useDashboardData = ({
  clientId,
  clientSecret,
  selectedTenant,
  selectedSubscription,
  mgtToken,
}: UseDashboardDataProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [allTenantUsers, setAllTenantUsers] = useState<User[]>([]); // ADD THIS: Permanent store
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

  // 1. EFFECT FOR TENANT-LEVEL DATA (M365, Governance, Global Admin Roles)
// This only re-runs if the Tenant ID changes.
useEffect(() => {
  if (!selectedTenant || !mgtToken) return;

  const fetchTenantData = async () => {
    try {
      const response = await fetch(`${ENDPOINTS.AZURE.TANENT_USERS}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: selectedTenant,
          client_id: clientId,
          client_secret: clientSecret,
        })
      });

      const data = await response.json();
      const tenantUserList = data.users || [];
      setAllTenantUsers(tenantUserList); // Save here permanently
      setUsers(tenantUserList); // Also set to users for initial display

      // Update M365 specific states
      const adminRoles = processAdminRoles(tenantUserList); 
      setAdminRolesData(adminRoles);
      
    } catch (err) {
      console.error("Tenant Fetch Error:", err);
    }
  };

  fetchTenantData();
}, [selectedTenant, mgtToken, clientId, clientSecret]); // Removed selectedSubscription here


// 2. EFFECT FOR SUBSCRIPTION-LEVEL DATA (Azure Users, Resource Counts)
// This re-runs every time a new subscription is picked.
useEffect(() => {
  if (!selectedTenant || !selectedSubscription) return;

  const fetchSubscriptionData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${ENDPOINTS.AZURE.USERS}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription_id: selectedSubscription,
          tenant_id: selectedTenant,
          client_id: clientId,
          client_secret: clientSecret,
        })
      });

      const data = await response.json();
      setUsers(data.users || []); // Update the user list for the Azure Identity tile
      setForeignGroupsCount(data.foreignGroupsCount ?? null);
      setServicePrincipalsCount(data.servicePrincipalsCount ?? null);
    } catch (err) {
      console.error("Subscription Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchSubscriptionData();
}, [selectedSubscription, selectedTenant]); // Only runs on Sub change
  // Fetch SSL certificates
  useEffect(() => {
    const fetchSSL = async () => {
      if (!clientId || !clientSecret || !selectedTenant || !selectedSubscription) return;
      setSslError(null);
      try {
        const data = await fetchSSLCertificates(clientId, clientSecret, selectedTenant, selectedSubscription);
        setSslCertificates(data);
      } catch (err) {
        setSslError("Failed to fetch SSL Certificate Expiry data");
        setSslCertificates([]);
      }
    };
    fetchSSL();
  }, [clientId, clientSecret, selectedTenant, selectedSubscription]);

  // Fetch license usage data
  useEffect(() => {
    const fetchLicenseData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${ENDPOINTS.MICROSOFT.LICENSE_AND_USAGE_DETAILS}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_id: selectedTenant,
            client_id: clientId,
            client_secret: clientSecret
          })
        });

        if (!response.ok) throw new Error('Failed to fetch data');
        
        const data = await response.json();
        setOverallScore(data.overallScore);
        setSummaryItems(data.summaryItems);
        
        const formattedData = data.tableData.map((item: any, index: number) => ({
          key: index,
          licenseType: item.license,
          purchased: item.purchased,
          assigned: item.assigned,
          unused: item.unused,
          inactive: item.inactive,
          potentialSavings: item.potentialSavings
        }));

        setLicenseUsageData(formattedData);
      } catch (error) {
        console.error("Error fetching optimization data:", error);
        message.error("Could not load license optimization data");
      } finally {
        setLoading(false);
      }
    };

    if (selectedTenant) {
      fetchLicenseData();
    }
  }, [selectedTenant, clientId, clientSecret]);

  // Fetch governance report
  useEffect(() => {
    const fetchGovernanceReport = async () => {
      if (!selectedTenant) return;

      try {
        setLoading(true);
        
        const response = await fetch(`${ENDPOINTS.MICROSOFT.IDENTITY_GOVERNANCE}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_id: selectedTenant,
            client_id: clientId,
            client_secret: clientSecret
          })
        });

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        const data: GovernanceItem[] = await response.json();
        setIdentityGovernanceData(data);
      } catch (error) {
        console.error("Error fetching governance data:", error);
        message.error("Failed to load Identity Governance report");
      } finally {
        setLoading(false);
      }
    };

    fetchGovernanceReport();
  }, [selectedTenant, clientId, clientSecret]);

  return {
    users,
    allTenantUsers, // RETURN THIS TOO
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
