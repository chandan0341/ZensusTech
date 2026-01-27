import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Row, Col, Spin, Alert, Empty } from "antd";
import { DashboardTiles } from "./DashboardTiles";
import { useCredentials } from "@/context/CredentialsContext";
import { useAzureSubscriptions } from "@/hooks/useAzureSubscriptions";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SubscriptionSelector } from "@/components/dashboard/SubscriptionSelector";
import { SubscriptionMetadataBar } from "@/components/dashboard/SubscriptionMetadataBar";
import { DetailModal } from "@/components/dashboard/DetailModal";
import { ModalData } from "@/types/dashboard.types";
import { 
  calculateRoleCounts, 
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
import { DomainOverviewTile } from "@/components/dashboard/tiles/DomainOverviewTile";
import { Microsoft365Tile } from "@/components/dashboard/tiles/Microsoft365Tile";

function Dashboard() {
  const { clientId, clientSecret, tenantId } = useCredentials();
  const [selectedTenant, setSelectedTenant] = useState<string>(tenantId || "tenant-1");
  const [selectedSubscription, setSelectedSubscription] = useState<string | null>(null);
  const [selectedTile, setSelectedTile] = useState<string>("azure-identity");
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCardData, setSelectedCardData] = useState<ModalData | null>(null);
  const [viewMode, setViewMode] = useState<'tenant' | 'subscription'>('tenant');

  // Guard: Redirect if credentials missing
  if (!clientId || !clientSecret) {
    window.location.href = "/login";
    return null;
  }

  // Effect: URL Parameter Cleanup
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('from')) {
      url.searchParams.delete('from');
      window.history.replaceState({}, '', url.pathname + url.hash);
    }
  }, []);

  // Hook: Azure Subscriptions
  const {
    azureSubscriptions,
    mgtToken,
    subMetadata,
    loading: subscriptionsLoading,
    error: subscriptionsError,
    fetchSubscriptionMetadata,
  } = useAzureSubscriptions({ clientId, clientSecret, selectedTenant });

  // Hook: Dashboard Core Data
  const {
    users,
    allTenantUsers,
    loading: dataLoading,
    foreignGroupsCount,
    servicePrincipalsCount,
    adminRolesData,
    sslCertificates,
    sslError,
    overallScore,
    summaryItems,
    identityGovernanceData,
    licenseUsageData,
  } = useDashboardData({
    clientId,
    clientSecret,
    selectedTenant,
    selectedSubscription,
    mgtToken,
  });

  // Effect: Fetch metadata when sub changes
  useEffect(() => {
    if (selectedSubscription && mgtToken) {
      fetchSubscriptionMetadata(selectedSubscription);
    }
  }, [selectedSubscription, mgtToken, fetchSubscriptionMetadata]);

  // --- Handlers ---
  const handleViewModeChange = (newMode: 'tenant' | 'subscription') => {
    setViewMode(newMode);
    
    if (newMode === 'subscription') {
      // Auto-select first sub if none selected
      if (azureSubscriptions && azureSubscriptions.length > 0 && !selectedSubscription) {
        const firstSub = azureSubscriptions[0];
        const subId = (firstSub as any).subscriptionId || (firstSub as any).id || (firstSub as any).value;
        if (subId) handleSubscriptionChange(subId);
      }
      // Tile Guard: Move to Identity if on a Tenant-only tile
      if (selectedTile === 'microsoft-365' || selectedTile === 'domain-overview') {
        setSelectedTile('azure-identity');
      }
    } else {
      // Clear sub when switching back to Tenant mode
      handleSubscriptionChange(null);
    }
  };

  const handleTenantChange = (tenantId: string) => {
    setSelectedTenant(tenantId);
    setSelectedSubscription(null);
    setViewMode('tenant');
    setSelectedTile('azure-identity'); 
  };

  const handleSubscriptionChange = (subscriptionId: string | null) => {
    setSelectedSubscription(subscriptionId);
    if (subscriptionId) {
      setViewMode('subscription');
      setSelectedTile('azure-identity');
    } else {
      setViewMode('tenant');
      setSelectedTile('azure-identity');
    }
  };

  // --- Blank State Logic ---
  // If in subscription mode but no ID is selected, force a blank data state
  const isSubModeWithoutSelection = viewMode === 'subscription' && !selectedSubscription;

  const displayUsers = isSubModeWithoutSelection 
    ? [] 
    : (viewMode === 'tenant' ? (allTenantUsers || []) : (users || []));

  // Derived calculations (will result in empty/zero states if displayUsers is [])
  const roleCounts = calculateRoleCounts(displayUsers);
  const { mfaEnabledCount, mfaDisabledCount } = calculateMFAStats(displayUsers);
  const mfaDisabledByRole = calculateMFADisabledByRole(displayUsers);

  // --- Modal Interaction Handlers ---
  const handleCardClick = (cardType: string, currentTile: string) => {
    if (isSubModeWithoutSelection) return;
    let modalData: ModalData | null = null;
    if (currentTile === 'azure-identity') {
      modalData = getAzureIdentityModalData(cardType, displayUsers);
    } else if (currentTile === 'microsoft-365') {
      modalData = getMicrosoft365ModalData(cardType); 
    } else if (currentTile === 'domain-overview') {
      modalData = getDomainOverviewModalData(cardType);
    }
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

  return (
    <div style={{ padding: "24px", background: "#f5f5f5", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <DashboardHeader />

        <SubscriptionSelector
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
          <Alert message="Warning" description={subscriptionsError} type="error" style={{ marginBottom: "24px" }} closable />
        )}

        {loading ? (
          <Row justify="center" style={{ padding: "64px 0" }}>
            <Spin size="large" tip="Loading data..." />
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
              {/* Conditional Content Rendering */}
              {isSubModeWithoutSelection ? (
                <div style={{ background: '#fff', padding: '100px 24px', borderRadius: '12px', textAlign: 'center' }}>
                  <Empty 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Please select a subscription to view associated resources and identity data." 
                  />
                </div>
              ) : (
                <>
                  {selectedTile === 'azure-identity' && (
                    <AzureIdentityTile
                      users={displayUsers}
                      loading={dataLoading}
                      foreignGroupsCount={foreignGroupsCount}
                      servicePrincipalsCount={servicePrincipalsCount}
                      selectedSubscription={selectedSubscription ?? ""}
                      roleCounts={roleCounts}
                      mfaEnabledCount={mfaEnabledCount}
                      mfaDisabledCount={mfaDisabledCount}
                      mfaDisabledByRole={mfaDisabledByRole}
                      adminRolesData={adminRolesData}
                      onCardClick={handleCardClick}
                      onCardClickForUserType={handleCardClickForUserType}
                      onCardClickForMFADisabledRole={handleCardClickForMFADisabledRole}
                    />
                  )}

                  {viewMode === 'tenant' && (
                    <>
                      {selectedTile === 'domain-overview' && <DomainOverviewTile sslCertificates={sslCertificates} sslError={sslError} />}
                      {selectedTile === 'microsoft-365' && (
                        <Microsoft365Tile
                          overallScore={overallScore}
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
                      {selectedTile === 'security' && <SecurityTile />}
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