import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react"; // Added useMemo here
import { Row, Col, Spin, Alert, Empty } from "antd";
import { DashboardTiles } from "./DashboardTiles";
import { useCredentials } from "../hooks/useCredentials";
import { useAzureSubscriptions } from "@/hooks/useAzureSubscriptions";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SubscriptionSelector } from "@/components/dashboard/SubscriptionSelector";
import { SubscriptionMetadataBar } from "@/components/dashboard/SubscriptionMetadataBar";
import { DetailModal } from "@/components/dashboard/DetailModal";
import { ModalData } from "@/types/dashboard.types";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs"; 
import { 
  calculateMFAStats, 
  calculateMFADisabledByRole 
} from "@/utils/dashboardUtils";
import {
  getAzureIdentityModalData,
  getMicrosoft365ModalData,
  getDomainOverviewModalData,
  getTableRowModalData,
  getModalDataByRole,
  getMFADisabledModalData,
} from "@/utils/modalDataUtils";
import { AzureIdentityTile } from "@/components/dashboard/tiles/AzureIdentityTile";
import { SecurityTile } from "@/components/dashboard/tiles/SecurityTile";
import { CostManagementTile } from "@/components/dashboard/tiles/CostManagementTile";
import { BackupsDRTile } from "@/components/dashboard/tiles/BackupsDRTile";
import { PatchManagementTile } from "@/components/dashboard/tiles/PatchManagementTile";
import { Microsoft365Tile } from "@/components/dashboard/tiles/Microsoft365Tile";

function Dashboard() {
  const { tenantId, isConnected } = useCredentials();
  
  const [selectedTenant, setSelectedTenant] = useState<string>(tenantId || "");
  const [selectedSubscription, setSelectedSubscription] = useState<string | null>(null);
  const [selectedTile, setSelectedTile] = useState<string>("azure-identity");
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCardData, setSelectedCardData] = useState<ModalData | null>(null);
  const [viewMode, setViewMode] = useState<'tenant' | 'subscription'>('tenant');
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'day'), 
    dayjs()
  ]);

  useEffect(() => {
    if (!isConnected) {
      window.location.href = "/connection";
    }
  }, [isConnected]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('from')) {
      url.searchParams.delete('from');
      window.history.replaceState({}, '', url.pathname + url.hash);
    }
  }, []);

  const {
    azureSubscriptions,
    subMetadata,
    loading: subscriptionsLoading,
    error: subscriptionsError,
    fetchSubscriptionMetadata,
  } = useAzureSubscriptions({ selectedTenant });

  const {
    users,
    applications,
    allTenantUsers,
    loading: dataLoading,
    foreignGroupsCount,
    servicePrincipalsCount,
    adminRolesData,
    overallScore,
    summaryItems,
    identityGovernanceData,
    licenseUsageData,
    auditLogs,
    isAuditLoading,
    organization,
    secureScoreRaw, 
  } = useDashboardData({
    selectedTenant,
    selectedSubscription,
    activeFilter,
    dateRange
  });
  interface SecureScoreData {
  currentScore: number;
  maxScore: number;
  controlScores?: any[];
}

  // --- CALCULATION LOGIC ---
  // This derives the 89% from the raw points to fix the 0% display issue
 // Updated Logic with Safety Checks
const displayScore = useMemo(() => {
  // 1. Cast the raw data to our interface
  const data = secureScoreRaw as SecureScoreData | null;

  // 2. Check if data exists AND maxScore is greater than 0
  if (data && data.maxScore > 0) {
    return Math.round((data.currentScore / data.maxScore) * 100);
  }
  
  // 3. Fallback to overallScore or 0
  return overallScore || 0;
}, [secureScoreRaw, overallScore]);

  useEffect(() => {
    if (selectedSubscription) {
      fetchSubscriptionMetadata(selectedSubscription);
    }
  }, [selectedSubscription, fetchSubscriptionMetadata]);

  // --- Handlers ---
  const handleViewModeChange = (newMode: 'tenant' | 'subscription') => {
    setViewMode(newMode);
    if (newMode === 'subscription') {
      if (azureSubscriptions?.length > 0 && !selectedSubscription) {
        const firstSub = azureSubscriptions[0];
        const subId = (firstSub as any).subscriptionId || (firstSub as any).id;
        if (subId) handleSubscriptionChange(subId);
      }
      if (selectedTile === 'microsoft-365' || selectedTile === 'domain-overview') {
        setSelectedTile('azure-identity');
      }
    } else {
      handleSubscriptionChange(null);
    }
  };

  const handleTenantChange = (tId: string) => {
    setSelectedTenant(tId);
    setSelectedSubscription(null);
    setViewMode('tenant');
    setSelectedTile('azure-identity'); 
  };

  const handleSubscriptionChange = (subscriptionId: string | null) => {
    setSelectedSubscription(subscriptionId);
    setViewMode(subscriptionId ? 'subscription' : 'tenant');
    setSelectedTile('azure-identity');
  };

  const isSubModeWithoutSelection = viewMode === 'subscription' && !selectedSubscription;
  const displayUsers = isSubModeWithoutSelection 
    ? [] 
    : (viewMode === 'tenant' ? (allTenantUsers || []) : (users || []));

  const { mfaEnabledCount, mfaDisabledCount } = calculateMFAStats(displayUsers);
  const mfaDisabledByRole = calculateMFADisabledByRole(displayUsers);

  // Modal Handlers
  const handleCardClick = (cardType: string, currentTile: string) => {
    if (isSubModeWithoutSelection) return;
    let modalData = null;
    if (currentTile === 'azure-identity') modalData = getAzureIdentityModalData(cardType, displayUsers);
    else if (currentTile === 'microsoft-365') modalData = getMicrosoft365ModalData(cardType); 
    else if (currentTile === 'domain-overview') modalData = getDomainOverviewModalData(cardType);
    
    if (modalData) {
      setSelectedCardData(modalData);
      setDetailModalVisible(true);
    }
  };

  const handleCardClickForUserType = (roleKey: string) => {
    if (isSubModeWithoutSelection || displayUsers.length === 0) return;
    const modalData = getModalDataByRole(roleKey, displayUsers);
    if (modalData) {
      setSelectedCardData(modalData);
      setDetailModalVisible(true);
    }
  };

  const handleCardClickForMFADisabledRole = (record: { role: string; count: number }, type: string) => {
    if (isSubModeWithoutSelection || type !== 'mfa-disabled-roles') return;
    const modalData = getMFADisabledModalData(record.role, displayUsers);
    if (modalData) {
      setSelectedCardData(modalData);
      setDetailModalVisible(true);
    }
  };

  const handleRowClick = (record: any, tableType: string) => {
    const modalData = getTableRowModalData(tableType, record);
    if (modalData) {
      setSelectedCardData(modalData);
      setDetailModalVisible(true);
    }
  };

  const loading = subscriptionsLoading || dataLoading;

  if (!isConnected) return null;

  return (
    <div style={{ padding: "24px", background: "#f5f5f5", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <DashboardHeader />

        <SubscriptionSelector
          organization={organization}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          selectedTenant={selectedTenant}
          selectedSubscription={selectedSubscription}
          azureSubscriptions={azureSubscriptions}
          loading={subscriptionsLoading}
          onTenantChange={handleTenantChange}
          onSubscriptionChange={handleSubscriptionChange}
          tenantId={tenantId || undefined}
        />

        {selectedSubscription && (
          <SubscriptionMetadataBar subMetadata={subMetadata} loading={subscriptionsLoading} />
        )}

        {subscriptionsError && (
          <Alert message="Connection Error" description={subscriptionsError} type="error" style={{ marginBottom: "24px" }} showIcon closable />
        )}

        {loading ? (
          <Row justify="center" style={{ padding: "64px 0" }}>
            <Spin size="large" tip="Fetching Azure Intelligence..." />
          </Row>
        ) : (
          <Row gutter={24} style={{ marginTop: '24px' }}>
            <Col xs={24} lg={6}>
              <DashboardTiles 
                selectedTile={selectedTile} 
                setSelectedTile={setSelectedTile} 
                viewMode={viewMode} 
              />
            </Col>

            <Col xs={24} lg={18}>
              {isSubModeWithoutSelection ? (
                <div style={{ background: '#fff', padding: '100px 24px', borderRadius: '12px', textAlign: 'center' }}>
                  <Empty 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Select a subscription to analyze resources." 
                  />
                </div>
              ) : (
                <>
                  {selectedTile === 'azure-identity' && (
                    <AzureIdentityTile
                      users={displayUsers}
                      applications={applications}
                      loading={dataLoading}
                      foreignGroupsCount={foreignGroupsCount}
                      servicePrincipalsCount={servicePrincipalsCount}
                      selectedSubscription={selectedSubscription ?? ""}
                      mfaEnabledCount={mfaEnabledCount}
                      mfaDisabledCount={mfaDisabledCount}
                      mfaDisabledByRole={mfaDisabledByRole}
                      adminRolesData={adminRolesData}
                      selectedTenant={selectedTenant}
                      auditLogs={auditLogs}
                      isAuditLoading={isAuditLoading}
                      dateRange={dateRange}
                      setDateRange={setDateRange}
                      activeFilter={activeFilter}
                      setActiveFilter={setActiveFilter}
                      onCardClick={handleCardClick}
                      onCardClickForUserType={handleCardClickForUserType}
                      onCardClickForMFADisabledRole={handleCardClickForMFADisabledRole}
                    />
                  )}

                  {viewMode === 'tenant' && (
                    <>
                      {selectedTile === 'security' && (
                        <SecurityTile 
                          overallScore={displayScore} // USE THE NEW displayScore VARIABLE
                          secureScoreRaw={secureScoreRaw} 
                          adminRolesData={adminRolesData} 
                        />
                      )}
                      {selectedTile === 'microsoft-365' && (
                        <Microsoft365Tile
                          overallScore={displayScore} // Consistency
                          summaryItems={summaryItems}
                          identityGovernanceData={identityGovernanceData}
                          adminRolesData={adminRolesData}
                          licenseUsageData={licenseUsageData}
                          onRowClick={handleRowClick}
                          handleCardClickForMicrosoftUserType={handleCardClickForUserType}
                        />
                      )}
                    </>
                  )}

                  {viewMode === 'subscription' && (
                    <>
                      {selectedTile === 'cost-management' && <CostManagementTile />}
                      {selectedTile === 'backups-dr' && <BackupsDRTile />}
                      {selectedTile === 'patch-management' && <PatchManagementTile />}
                    </>
                  )}
                </>
              )}
            </Col>
          </Row>
        )}

        <DetailModal 
          visible={detailModalVisible} 
          data={selectedCardData} 
          onClose={() => setDetailModalVisible(false)} 
        />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard - ZensusTech" }] }),
});