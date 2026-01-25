import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Row, Col, Spin, Alert } from "antd";
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
  const [selectedSubscription, setSelectedSubscription] = useState<string>("");
  const [selectedTile, setSelectedTile] = useState<string>("azure-identity");
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCardData, setSelectedCardData] = useState<ModalData | null>(null);

  // Check if credentials exist
  if (!clientId || !clientSecret) {
    window.location.href = "/login";
    return null;
  }

  // Clean up query parameters
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('from')) {
      url.searchParams.delete('from');
      window.history.replaceState({}, '', url.pathname + url.hash);
    }
  }, []);

  // Azure Subscriptions hook
  const {
    azureSubscriptions,
    mgtToken,
    subMetadata,
    loading: subscriptionsLoading,
    error: subscriptionsError,
    fetchSubscriptionMetadata,
  } = useAzureSubscriptions({
    clientId,
    clientSecret,
    selectedTenant,
  });

  // Dashboard data hook
  const {
    users,
    allTenantUsers, // <--- Add this here
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

  // Fetch subscription metadata when subscription changes
  useEffect(() => {
    if (selectedSubscription && mgtToken) {
      fetchSubscriptionMetadata(selectedSubscription);
    }
  }, [selectedSubscription, mgtToken, fetchSubscriptionMetadata]);

  const handleTenantChange = (tenantId: string) => {
    setSelectedTenant(tenantId);
    setSelectedSubscription("");
  };

  const handleSubscriptionChange = (subscriptionId: string) => {
    setSelectedSubscription(subscriptionId);
  };

  // Modal handlers
  const handleCardClick = (cardType: string, currentTile: string) => {
    let modalData: ModalData | null = null;

    if (currentTile === 'azure-identity') {
      modalData = getAzureIdentityModalData(cardType, users);
    } else if (currentTile === 'microsoft-365') {
      modalData = getMicrosoft365ModalData(cardType); // Use allTenantUsers here
    } else if (currentTile === 'domain-overview') {
      modalData = getDomainOverviewModalData(cardType);
    }

    if (modalData) {
      setSelectedCardData(modalData);
      setDetailModalVisible(true);
    }
  };

  const handleCardClickForUserType = (roleKey: string) => {
    if (!users || users.length === 0) return;
    const modalData = getModalDataByRole(roleKey, users);
    if (modalData) {
      setSelectedCardData(modalData);
      setDetailModalVisible(true);
    }
  };
  const handleCardClickForMicrosoftUserType = (roleKey: string) => {
    if (!allTenantUsers || allTenantUsers.length === 0) return;
    const modalData = getModalDataByRole(roleKey, allTenantUsers);
    if (modalData) {
      setSelectedCardData(modalData);
      setDetailModalVisible(true);
    }
  };

  const handleCardClickForMFADisabledRole = (record: { role: string; count: number }, type: string) => {
    if (type === 'mfa-disabled-roles') {
      const modalData = getMFADisabledModalData(record.role, users);
      if (modalData) {
        setSelectedCardData(modalData);
        setDetailModalVisible(true);
      }
    }
  };

  const handleRowClick = (record: any, tableType: string) => {
    const modalData = getTableRowModalData(tableType, record);
    if (modalData) {
      setSelectedCardData(modalData);
      setDetailModalVisible(true);
    }
  };

  // Calculate derived data
  const roleCounts = calculateRoleCounts(users);
  const { mfaEnabledCount, mfaDisabledCount } = calculateMFAStats(users);
  const mfaDisabledByRole = calculateMFADisabledByRole(users);

  const loading = subscriptionsLoading || dataLoading;

  return (
    <div style={{ padding: "24px", background: "#f5f5f5", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <DashboardHeader />

        <SubscriptionSelector
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
          <Alert
            message="Warning"
            description={subscriptionsError}
            type="error"
            style={{ marginBottom: "24px" }}
            closable
          />
        )}

        {loading && (
          <Row justify="center" style={{ padding: "64px 0" }}>
            <Spin size="large" tip="Loading dashboard data..." />
          </Row>
        )}

        {!loading && users.length > 0 && (
          <Row gutter={24} style={{ marginTop: '24px' }}>
            <Col xs={24} lg={6}>
              <DashboardTiles selectedTile={selectedTile} setSelectedTile={setSelectedTile} />
            </Col>

            <Col xs={24} lg={18}>
              {selectedTile === 'azure-identity' && (
                <AzureIdentityTile
                  users={users}
                  loading={dataLoading}
                  foreignGroupsCount={foreignGroupsCount}
                  servicePrincipalsCount={servicePrincipalsCount}
                  selectedSubscription={selectedSubscription}
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

              {selectedTile === 'security' && (
                <SecurityTile />
              )}

              {selectedTile === 'cost-management' && (
                <CostManagementTile />
              )}

              {selectedTile === 'backups-dr' && (
                <BackupsDRTile />
              )}

              {selectedTile === 'patch-management' && (
                <PatchManagementTile />
              )}

              {selectedTile === 'domain-overview' && (
                <DomainOverviewTile
                  sslCertificates={sslCertificates}
                  sslError={sslError}
                />
              )}

              {selectedTile === 'microsoft-365' && (
                <Microsoft365Tile
                 overallScore={overallScore}
                summaryItems={summaryItems}
                identityGovernanceData={identityGovernanceData}
                adminRolesData={adminRolesData} // <--- This line is the fix
                licenseUsageData={licenseUsageData} // Placeholder, implement fetching if needed
                onRowClick={handleRowClick}
                handleCardClickForMicrosoftUserType={handleCardClickForMicrosoftUserType}
                />
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
  head: () => ({
    meta: [
      {
        title: "Dashboard - ZensusTech",
      },
    ],
  }),
});
