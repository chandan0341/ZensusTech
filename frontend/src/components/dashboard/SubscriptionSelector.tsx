import { Select, Segmented, Space, Typography } from "antd";
import { 
  GlobalOutlined, 
  DatabaseOutlined, 
  BankOutlined, 
  SolutionOutlined 
} from '@ant-design/icons';
import { SubscriptionOption } from "@/types/dashboard.types";

const { Text } = Typography;

// --- DEFINING THE MISSING INTERFACE ---
interface SubscriptionSelectorProps {
  viewMode: 'tenant' | 'subscription';
  onViewModeChange: (mode: 'tenant' | 'subscription') => void;
  selectedTenant: string;
  selectedSubscription: string | null;
  azureSubscriptions: SubscriptionOption[];
  loading: boolean;
  onTenantChange: (tenantId: string) => void;
  onSubscriptionChange: (subscriptionId: string | null) => void;
  tenantId?: string;
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
  tenantId,
}: SubscriptionSelectorProps) => {
  return (
    <div style={{ 
      background: '#fff', 
      padding: '10px 24px', 
      marginBottom: '20px',
      borderBottom: '1px solid #f0f0f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    }}>
      {/* LEFT SIDE: Master Scope Switch */}
      <Space size="large">
        <Space size="small">
          <Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            View Scope:
          </Text>
          <Segmented
            value={viewMode}
            onChange={(val) => onViewModeChange(val as 'tenant' | 'subscription')}
            options={[
              { 
                label: <Space><GlobalOutlined /> Organization</Space>, 
                value: 'tenant' 
              },
              { 
                label: <Space><DatabaseOutlined /> Subscription</Space>, 
                value: 'subscription' 
              },
            ]}
          />
        </Space>
      </Space>

      {/* RIGHT SIDE: Identifiers */}
      <Space size="large" split={<div style={{ width: '1px', height: '24px', background: '#f0f0f0' }} />}>
        
        {/* Organization ID */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BankOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Text type="secondary" style={{ fontSize: '10px', lineHeight: 1 }}>Organization ID</Text>
            <Select
              variant="borderless"
              value={selectedTenant}
              onChange={onTenantChange}
              style={{ minWidth: 240, fontWeight: 600, marginLeft: '-11px' }}
              options={[{ value: tenantId!, label: tenantId! }]}
            />
          </div>
        </div>

        {/* Target Subscription */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          opacity: viewMode === 'tenant' ? 0.3 : 1,
          transition: 'all 0.3s ease'
        }}>
          <SolutionOutlined style={{ color: viewMode === 'tenant' ? '#bfbfbf' : '#faad14', fontSize: '18px' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Text type="secondary" style={{ fontSize: '10px', lineHeight: 1 }}>Target Subscription</Text>
            <Select
              variant="borderless"
              loading={loading}
              placeholder={viewMode === 'tenant' ? "Global Governance Active" : "Select Subscription"}
              value={selectedSubscription || undefined}
              onChange={(val) => onSubscriptionChange(val || null)}
              disabled={viewMode === 'tenant'}
              allowClear
              style={{ minWidth: 280, fontWeight: 600, marginLeft: '-11px' }}
              options={azureSubscriptions}
            />
          </div>
        </div>
      </Space>
    </div>
  );
};