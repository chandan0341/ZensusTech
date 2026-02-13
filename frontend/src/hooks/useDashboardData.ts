import { useState, useEffect, useCallback,useMemo } from "react";
import { User, AdminRoleData, SummaryItem, AzureApplication, OrganizationData } from "@/types/dashboard.types";
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
  activeFilter, // Now used in Effect 4
  dateRange,    // Now used in Effect 4
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
  const [applications, setApplications] = useState<AzureApplication[]>([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  
  const [secureScoreRaw, setSecureScoreRaw] = useState<any>(null);
  const [securityAuditReport, setSecurityAuditReport] = useState<any>(null);
  const [isSecurityReportLoading, setIsSecurityReportLoading] = useState(false);
  // 1. For the Executive Summary (Score Card)
 const [m365Score, setM365Score] = useState<any | null>(null);         // The 'overall' object
  const [m365ActionPlan, setM365ActionPlan] = useState<any[]>([]);      // The 'action_plan' array
  const [m365Metadata, setM365Metadata] = useState<any | null>(null);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    let mgmtToken = localStorage.getItem("mgmt_token");
    let graphToken = localStorage.getItem("graph_token");
    const expiry = localStorage.getItem("token_expiry");
    if (expiry && Date.now() > (Number(expiry) - 300000) || !mgmtToken) {
        const response = await fetch("/api/auth/refresh", { method: "POST" });
        const newData = await response.json();
        localStorage.setItem("mgmt_token", newData.mgmtToken);
        localStorage.setItem("graph_token", newData.graphToken);
        localStorage.setItem("token_expiry", (Date.now() + 50 * 60 * 1000).toString());
        mgmtToken = newData.mgmtToken;
        graphToken = newData.graphToken;
    }
    return { "Authorization": `Bearer ${mgmtToken}`, "X-Graph-Token": graphToken || "", "Content-Type": "application/json" };
  }, []);

  useEffect(() => {
    if (!selectedSubscription) return;
    const fetchAuditReport = async () => {
        setIsSecurityReportLoading(true);
        try {
            const authHeaders = await getAuthHeaders();
            const response = await fetch(`${ENDPOINTS.AZURE.SECURITY_AUDIT_REPORT}?subscription_id=${selectedSubscription}`, { headers: authHeaders as any });
            const result = await response.json();
           

            // Mapping based on your specific JSON structure [cite: 57, 58]
            setSecurityAuditReport(result);            
            // Extracting the overall secure score percentage (0.1176 -> 12%) 
            const scoreObj = result.scoreData?.value?.[0]?.properties?.score;

            if (scoreObj) {
                setOverallScore(Math.round(scoreObj.percentage * 100));
                setSecureScoreRaw(scoreObj); // optional but recommended
            }

        } catch (error) { 
            console.error(error); 
        } finally { 
            setIsSecurityReportLoading(false); 
        }
    };
    fetchAuditReport();
}, [selectedSubscription, getAuthHeaders]);

  useEffect(() => {
    if (!selectedTenant) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const authHeaders = await getAuthHeaders();
        const [userRes, appRes, orgRes] = await Promise.all([
          fetch(`${ENDPOINTS.AZURE.TANENT_USERS}?tenant_id=${selectedTenant}`, { headers: authHeaders as any }),
          fetch(`${ENDPOINTS.AZURE.TENANT_APPLICATIONS}?tenant_id=${selectedTenant}`, { headers: authHeaders as any }),
          fetch(`${ENDPOINTS.AZURE.ORGANIZATION}?tenant_id=${selectedTenant}`, { headers: authHeaders as any }),
        ]);
        const userData = await userRes.json();
        setAllTenantUsers(userData.users || []);
        setApplications((await appRes.json()).applications || []);
        setOrganization((await orgRes.json()).organization);
        setAdminRolesData(processAdminRoles(userData.users || []));

        if (selectedSubscription) {
          const subRes = await fetch(`${ENDPOINTS.AZURE.USERS}?subscription_id=${selectedSubscription}&tenant_id=${selectedTenant}`, { headers: authHeaders as any });
          const subData = await subRes.json();
          setUsers(subData.users || []);
          setAdminRolesData(processAdminRoles(subData.users || []));
          setForeignGroupsCount(subData.foreignGroupsCount);
          setServicePrincipalsCount(subData.servicePrincipalsCount);
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchData();
  }, [selectedTenant, selectedSubscription, getAuthHeaders]);

  // Restored M365 and Audit usage to clear "unused variable" errors
  useEffect(() => {
  if (!selectedTenant) return;

  const fetchAllM365Data = async () => {
    const authHeaders = await getAuthHeaders();
    const query = `?tenant_id=${selectedTenant}`;

    // Fire both requests at the same time
    const [securityRes, licenseRes] = await Promise.all([
      fetch(`${ENDPOINTS.MICROSOFT.SECURE_SCORE_DETAILS}${query}`, { headers: authHeaders as any }),
      fetch(`${ENDPOINTS.MICROSOFT.LICENSE_AND_USAGE_DETAILS}${query}`, { headers: authHeaders as any })
    ]);

    const securityData = await securityRes.json();
    const licenseData = await licenseRes.json();

    // 1. Handle Security Data (API 1)
    if (securityData.success) {
      const { overall, action_plan, batch_metadata } = securityData.data;    
      setM365Score(overall);
      setM365ActionPlan(action_plan);
      setM365Metadata(batch_metadata);
    }

    // 2. Handle License Data (API 2)
    if (licenseData.success) {
      setLicenseUsageData(licenseData.tableData || []);
      setSummaryItems(licenseData.summaryItems || []);
    }
  };

  fetchAllM365Data();
}, [selectedTenant, getAuthHeaders]);

  useEffect(() => {
    if (!selectedTenant) return;
    const fetchAudit = async () => {
        setIsAuditLoading(true);
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`${ENDPOINTS.AZURE.AUDIT_LOGS}?tenant_id=${selectedTenant}&category=${activeFilter}&start_date=${dateRange[0].toISOString()}`, { headers: authHeaders as any });
        const data = await res.json();
        setAuditLogs(data.logs || []);
        setIsAuditLoading(false);
    };
    fetchAudit();
  }, [selectedTenant, activeFilter, dateRange, getAuthHeaders]);

 const report = useMemo(() => {
    
  const extracted = securityAuditReport?.value || securityAuditReport || {};
  console.log("Flattening security report data...:",extracted); 
  console.log("scoreControls",extracted.scoreControls?.value||[]);
  console.log("failedControls",extracted.failedControls?.value || []);
  console.log("secureScoreRaw",secureScoreRaw)
  return securityAuditReport?.value || securityAuditReport || {};

  }, [securityAuditReport]);

// 2. Updated return statement
return {
  // Existing fields
  users, 
  applications, 
  allTenantUsers, 
  loading,
  foreignGroupsCount, 
  servicePrincipalsCount, 
  adminRolesData,
  licenseUsageData, 
  m365Score, 
  m365ActionPlan,
  m365Metadata,
  overallScore, 
  summaryItems,
  auditLogs, 
  isAuditLoading, 
  organization,
  secureScoreRaw,

  // NEW: Flattened Security Data Categories
  // This maps exactly to the keys found in your JSON file
  networkData: report.networkFindings || [],         // The 2 findings
  dataSecData: report.dataSecurity || [],           // The 3 findings
  recommendationsData: report.recommendations || [], // The 15 recommendations
  failedControlsData: report.failedControls?.value || [], // The 85 critical items
  scoreControls:report.scoreControls?.value||[],
  kpiData: report.postureKPI || {},                  // The score/totalFailedControls object
  allAssessments: report.allAssessments?.value || [], // The total check list

  // Maintain compatibility with existing props
  securityAuditReport, 
  isSecurityReportLoading,
  subSecurity: report, 
  isSubLoading: isSecurityReportLoading,
};
}