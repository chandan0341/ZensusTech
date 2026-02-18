import { useState, useEffect, useCallback, useMemo } from "react";
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
  const [applications, setApplications] = useState<AzureApplication[]>([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);

  const [secureScoreRaw, setSecureScoreRaw] = useState<any>(null);
  const [securityAuditReport, setSecurityAuditReport] = useState<any>(null);
  const [isSecurityReportLoading, setIsSecurityReportLoading] = useState(false);

  const [m365Score, setM365Score] = useState<any | null>(null);
  const [m365ActionPlan, setM365ActionPlan] = useState<any[]>([]);
  const [m365Metadata, setM365Metadata] = useState<any | null>(null);

  // --- Auth Helper ---
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
    return {
      "Authorization": `Bearer ${mgmtToken}`,
      "X-Graph-Token": graphToken || "",
      "Content-Type": "application/json"
    };
  }, []);

  // --- THE REFETCH FUNCTION (Fixes TS2339) ---
  const refetchData = useCallback(async () => {
    if (!selectedTenant) return;

    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const queryParams = `?tenant_id=${selectedTenant}`;

      // 1. Fetch Tenant-level Data (Users, Apps, Org, M365 Security/License)
      const [userRes, appRes, orgRes, securityRes, licenseRes] = await Promise.all([
        fetch(`${ENDPOINTS.AZURE.TANENT_USERS}${queryParams}`, { headers: authHeaders as any }),
        fetch(`${ENDPOINTS.AZURE.TENANT_APPLICATIONS}${queryParams}`, { headers: authHeaders as any }),
        fetch(`${ENDPOINTS.AZURE.ORGANIZATION}${queryParams}`, { headers: authHeaders as any }),
        fetch(`${ENDPOINTS.MICROSOFT.SECURE_SCORE_DETAILS}${queryParams}`, { headers: authHeaders as any }),
        fetch(`${ENDPOINTS.MICROSOFT.LICENSE_AND_USAGE_DETAILS}${queryParams}`, { headers: authHeaders as any })
      ]);

      // Process Tenant Identity
      const userData = await userRes.json();
      setAllTenantUsers(userData.users || []);
      setAdminRolesData(processAdminRoles(userData.users || []));
       setForeignGroupsCount(null);
        setServicePrincipalsCount(null);

      const appData = await appRes.json();
      setApplications(appData.applications || []);

      const orgData = await orgRes.json();
      setOrganization(orgData.organization);

      // Process M365 Data
      const securityData = await securityRes.json();
      if (securityData.success) {
        setM365Score(securityData.data.overall);
        setM365ActionPlan(securityData.data.action_plan);
        setM365Metadata(securityData.data.batch_metadata);
      }

      const licenseData = await licenseRes.json();
      if (licenseData.success) {
        setLicenseUsageData(licenseData.tableData || []);
        setSummaryItems(licenseData.summaryItems || []);
      }

      // 2. Fetch Subscription Specific Data
      if (selectedSubscription) {
        setIsSecurityReportLoading(true);
        const [subRes, auditReportRes] = await Promise.all([
          fetch(`${ENDPOINTS.AZURE.USERS}?subscription_id=${selectedSubscription}&tenant_id=${selectedTenant}`, { headers: authHeaders as any }),
          fetch(`${ENDPOINTS.AZURE.SECURITY_AUDIT_REPORT}?subscription_id=${selectedSubscription}`, { headers: authHeaders as any })
        ]);

        const subData = await subRes.json();
        setUsers(subData.users || []);
        setForeignGroupsCount(subData.foreignGroupsCount);
        setServicePrincipalsCount(subData.servicePrincipalsCount);
        setAdminRolesData(processAdminRoles(subData.users || []));

        const auditResult = await auditReportRes.json();
        setSecurityAuditReport(auditResult);
        if (auditResult.scoreData?.properties?.score) {
          setOverallScore(Math.round(auditResult.scoreData.properties.score.percentage * 100));
          setSecureScoreRaw(auditResult.scoreData.properties.score);
        }
        setIsSecurityReportLoading(false);
      }

      // 3. Fetch Audit Logs
      setIsAuditLoading(true);
      const auditRes = await fetch(
        `${ENDPOINTS.AZURE.AUDIT_LOGS}${queryParams}&category=${activeFilter}&start_date=${dateRange[0].toISOString()}`,
        { headers: authHeaders as any }
      );
      const auditData = await auditRes.json();
      setAuditLogs(auditData.logs || []);
      setIsAuditLoading(false);

    } catch (error) {
      console.error("Dashboard Data Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedTenant, selectedSubscription, activeFilter, dateRange, getAuthHeaders]);

  // Initial trigger and dependency update trigger
  useEffect(() => {
    refetchData();
  }, [refetchData]);

  const report = useMemo(() => {
    const data = securityAuditReport?.value
    console.log(data)
    return securityAuditReport?.value || securityAuditReport || {};

  }, [securityAuditReport]);

  return {
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

    // Flattened Security Data Categories
    networkData: report.networkFindings || [],
    dataSecData: report.dataSecurity || [],
    recommendationsData: report.recommendations || [],
    failedControlsData: report.failedControls?.value || [],
    scoreControls: report.scoreControls?.value || [],
    kpiData: report.postureKPI || {},
    allAssessments: report.allAssessments?.value || [],
    complianceStandards:report.complianceStandards?.value||[],
    resourceInventory:report.resourceInventory?.value||[],
    activeAlerts:report.activeAlerts,

    // Meta/Loading states
    securityAuditReport,
    isSecurityReportLoading,
    subSecurity: report,
    isSubLoading: isSecurityReportLoading,

    // REFETCH FUNCTION EXPORT
    refetchData,
  };
};