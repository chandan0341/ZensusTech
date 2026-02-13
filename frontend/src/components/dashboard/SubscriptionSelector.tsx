import { Select, Segmented, Space, Typography, Tooltip, Progress, Tag, Divider, Button } from "antd";
import { 
  GlobalOutlined, 
  DatabaseOutlined, 
  SyncOutlined,
  CopyOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
// Import the centralized interface to prevent "Type Incompatibility" errors
import { SubscriptionOption, OrganizationData } from "@/types/dashboard.types";

const { Text } = Typography;

interface SubscriptionSelectorProps {
  viewMode: 'tenant' | 'subscription';
  onViewModeChange: (mode: 'tenant' | 'subscription') => void;
  selectedTenant: string;
  selectedSubscription: string | null;
  azureSubscriptions: SubscriptionOption[];
  loading: boolean;
  onTenantChange: (tenantId: string) => void;
  onSubscriptionChange: (subscriptionId: string | null) => void;
  onRefresh?: () => void; // Added this line
  tenantId?: string;
  organization?: OrganizationData | null;
}

export const SubscriptionSelector = ({
  viewMode,
  onViewModeChange,
  selectedTenant,
  selectedSubscription,
  azureSubscriptions,
  loading,
  onTenantChange,
  onSubscriptionChange,
  onRefresh, // Added this line
  tenantId,
  organization,
}: SubscriptionSelectorProps) => {

  // Logic mapping based on your backend return keys
  const displayTitle = organization?.tenantName || "Loading Tenant..."; 
  const domainName = organization?.domain || "---";
  const isSynced = !!organization?.isSynced;
  const quotaPercent = organization?.quota?.percent || 0;

  const handleCopy = (text: string) => {
    if (text) navigator.clipboard.writeText(text);
  };

  return (
    <div style={{ 
      background: '#fff', 
      padding: '16px 24px', 
      marginBottom: '20px',
      borderBottom: '1px solid #f0f0f0',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      width: '100%',
      gap: '16px'
    }}>
      
      {/* TOP ROW: Identity & Scope Selection */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        
        {/* LEFT: BRANDING & LOCATION */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1' }}>
          <div style={{ 
            width: '48px', height: '48px', 
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', 
            color: '#fff', borderRadius: '12px', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', fontWeight: 'bold', fontSize: '22px',
            boxShadow: '0 4px 10px rgba(24,144,255,0.3)'
          }}>
            {displayTitle !== "Loading Tenant..." ? displayTitle.charAt(0).toUpperCase() : '?'}
          </div>
          
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text strong style={{ fontSize: '18px', color: '#002766' }}>{displayTitle}</Text>
              <Tag icon={isSynced ? <SyncOutlined spin={false} /> : <GlobalOutlined />} color={isSynced ? "processing" : "default"}>
               {organization?.country}
              </Tag>
            </div>
            <Space split={<Divider type="vertical" />} style={{ marginTop: '2px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>{domainName}</Text>
              {organization?.city && (
                <Tooltip title={organization.street || "Primary Location"}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    <EnvironmentOutlined /> {organization.city}{organization.state ? `, ${organization.state}` : ''}
                  </Text>
                </Tooltip>
              )}
            </Space>
          </div>
        </div>

        {/* RIGHT: VIEW MODE TOGGLE + REFRESH */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#f5f5f5', padding: '4px', borderRadius: '8px' }}>
            <Segmented
              value={viewMode}
              onChange={(val) => onViewModeChange(val as 'tenant' | 'subscription')}
              options={[
                { label: <Space><GlobalOutlined /> Tenant</Space>, value: 'tenant' },
                { label: <Space><DatabaseOutlined /> Subscription</Space>, value: 'subscription' },
              ]}
            />
          </div>
          
          {/* REFRESH BUTTON */}
          <Tooltip title="Refresh Dashboard Data">
            <Button 
              icon={<SyncOutlined spin={loading} />} 
              onClick={onRefresh}
              loading={loading}
              style={{ 
                borderRadius: '8px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              Refresh
            </Button>
          </Tooltip>
        </div>
      </div>

      <Divider style={{ margin: '0' }} />

      {/* BOTTOM ROW: Resource Quota & Directory Selectors */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        
        {/* QUOTA SECTION */}
        <div style={{ width: '280px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <Space size={4}>
              <Text strong style={{ fontSize: '10px', color: '#8c8c8c' }}>DIRECTORY OBJECT QUOTA</Text>
              <Tooltip title="Percentage of allowed Entra ID objects (Users, Groups, Devices) currently in use.">
                <InfoCircleOutlined style={{ fontSize: '10px', color: '#bfbfbf' }} />
              </Tooltip>
            </Space>
            <Text style={{ fontSize: '10px' }}>
              {organization?.quota ? `${organization.quota.used.toLocaleString()} / ${organization.quota.total.toLocaleString()}` : '-- / --'}
            </Text>
          </div>
          <Progress 
            percent={quotaPercent} 
            size="small" 
            status={quotaPercent > 85 ? "exception" : "active"} 
            strokeColor={quotaPercent > 85 ? '#ff4d4f' : '#52c41a'}
            showInfo={false}
          />
        </div>

        {/* SELECTORS (Right Aligned) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginLeft: 'auto' }}>
          
          {/* Tenant/Directory ID */}
          <div style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: '24px' }}>
            <Text type="secondary" style={{ fontSize: '10px', display: 'block', textTransform: 'uppercase' }}>Directory ID</Text>
            <Space>
              <Select 
                variant="borderless" 
                value={selectedTenant} 
                onChange={onTenantChange}
                style={{ width: 180, fontWeight: 600, marginLeft: '-11px' }} 
                options={[{ value: tenantId || selectedTenant, label: tenantId || 'No ID' }]}
              />
              <Tooltip title="Copy Directory ID">
                <CopyOutlined style={{ color: '#bfbfbf', cursor: 'pointer' }} onClick={() => handleCopy(selectedTenant)} />
              </Tooltip>
            </Space>
          </div>

          {/* Subscription Selector */}
          <div style={{ 
            borderLeft: '1px solid #f0f0f0', 
            paddingLeft: '24px',
            opacity: viewMode === 'tenant' ? 0.4 : 1 
          }}>
            <Text type="secondary" style={{ fontSize: '10px', display: 'block', textTransform: 'uppercase' }}>Target Subscription</Text>
            <Select 
              variant="borderless" 
              loading={loading}
              placeholder="Select Subscription"
              value={selectedSubscription || undefined}
              onChange={(val) => onSubscriptionChange(val || null)}
              disabled={viewMode === 'tenant'}
              style={{ width: 220, fontWeight: 600, marginLeft: '-11px' }} 
              options={azureSubscriptions}
            />
          </div>
        </div>
      </div>
    </div>
  );
};