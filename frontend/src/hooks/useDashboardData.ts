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
  selectedSubscription: string|null;
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
          subscription_id: selectedSubscription || "",
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
    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            
            // 1. Fetch License Data
            const response = await fetch(`${ENDPOINTS.MICROSOFT.LICENSE_AND_USAGE_DETAILS}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tenant_id: selectedTenant,
                    client_id: clientId,
                    client_secret: clientSecret
                })
            });

            if (!response.ok) throw new Error('License API failed');
            const data = await response.json();

            // Store License summary items temporarily
            const licenseSummary = data.summaryItems || [];
            
            setOverallScore(data.overallScore);

            // Safety check for table mapping
            if (data.tableData) {
                const formattedData = data.tableData.map((item: any, index: number) => ({
                    key: index,
                    licenseType: item.license,
                    purchased: item.purchased,
                    assigned: item.assigned,
                    unused: item.unused
                }));
                setLicenseUsageData(formattedData);
            }

            // 2. Fetch Secure Score Data
            const response_ss = await fetch(`${ENDPOINTS.MICROSOFT.SECURE_SCORE_DETAILS}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tenant_id: selectedTenant,
                    client_id: clientId,
                    client_secret: clientSecret
                })
            });

            if (!response_ss.ok) throw new Error('Secure Score API failed');
            const data_ss = await response_ss.json();

            // --- THE MERGE LOGIC ---
            // Take the cards from Secure Score and add them to the summary list
            const secureCards = data_ss.cards || [];
            const response_users = await fetch(`${ENDPOINTS.AZURE.TANENT_USERS}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tenant_id: selectedTenant,
                client_id: clientId,
                client_secret: clientSecret,
              })
            });

            const userDataResponse = await response_users.json();

            // FIX: Extract the actual array from the response object
            const actualUsers = userDataResponse.users || []; 

            const total = actualUsers.length;
            const mfaEnabled = actualUsers.filter((u: User) => u.mfa === "Enabled").length;
            const missingMfa = actualUsers.filter((u: User) => u.mfa === "Disabled").map((u: User) => u.user);

            const identity = {
                area: "Identity Security",
                status: total > 0 && mfaEnabled === total ? "Secure" : "Attention Required",
                color: total > 0 && mfaEnabled === total ? "green" : "orange",
                number: `${mfaEnabled}/${total}`,
                note: total === 0 ? "No users detected." : 
                      mfaEnabled === total ? "All users verified with MFA." : 
                      `MFA disabled for: ${missingMfa.join(", ")}`
            };
            // --- ADD THESE LOGS HERE ---
            console.log("1. Total Users Found:", total);
            console.log("2. Identity Object Created:", identity);
            console.log("3. Final Array being sent to State:", [identity, ...secureCards, ...licenseSummary]);

            // Combine both: Secure Score cards come first, then License cards
            // --- THE MERGE LOGIC ---

            // 1. Combine all sources into one array
            const allItems = [identity, ...secureCards, ...licenseSummary];

            // 2. Use a Map to ensure uniqueness by 'area' and cast to SummaryItem[]
            const unifiedItems: SummaryItem[] = Array.from(
                allItems.reduce((map, item) => {
                    if (item && item.area) {
                        // This ensures we keep the most complete version of an item
                        map.set(item.area, item as SummaryItem);
                    }
                    return map;
                }, new Map<string, SummaryItem>()).values()
            );

            // 3. Debug logs to verify the 'number' field is present
            console.log("Unified Items being set to State:", unifiedItems);

            // 4. Set state with the correctly typed array
            setSummaryItems(unifiedItems);
            
        } catch (error) {
            console.error("Aggregation Error:", error);
            message.error("Could not load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    if (selectedTenant) {
        fetchDashboardData();
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
