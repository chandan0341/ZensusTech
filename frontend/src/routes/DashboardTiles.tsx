import React from "react";
import { Card, Space, Typography } from "antd";
import { 
  LockOutlined, 
  GlobalOutlined, 
  TeamOutlined, 
  DollarOutlined, 
  CloudSyncOutlined, 
  SafetyCertificateOutlined,
  DatabaseOutlined,
  DashboardOutlined
} from "@ant-design/icons";

interface DashboardTilesProps {
  selectedTile: string;
  setSelectedTile: (tile: string) => void;
  viewMode: 'tenant' | 'subscription';
}

export const DashboardTiles: React.FC<DashboardTilesProps> = ({ 
  selectedTile, 
  setSelectedTile, 
  viewMode 
}) => {

  const renderTile = (key: string, title: string, subText: string, icon: React.ReactNode, color: string, activeBg: string) => (
    <Card
      style={{
        borderRadius: '8px',
        border: selectedTile === key ? `2px solid ${color}` : '1px solid #e8e8e8',
        background: selectedTile === key ? activeBg : 'white',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}
      bodyStyle={{ padding: '12px' }}
      onClick={() => setSelectedTile(key)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ fontSize: '20px', color: color }}>{icon}</div>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '13px', color: color }}>{title}</div>
          <div style={{ fontSize: '11px', color: '#666' }}>{subText}</div>
        </div>
      </div>
    </Card>
  );

  return (
    <Card
      style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', height: 'fit-content' }}
      bodyStyle={{ padding: '16px' }}
    >
      <div style={{ marginBottom: '16px' }}>
        <Typography.Title level={5} style={{ margin: 0, textAlign: 'center', color: '#434343' }}>
          <DashboardOutlined /> Dashboard Tiles
        </Typography.Title>
      </div>

      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        
        {/* Identity is always first, regardless of mode */}
        {renderTile(
          'azure-identity', 
          'Identity & Access', 
          viewMode === 'tenant' ? 'Organization Entra ID' : 'Subscription RBAC', 
          <LockOutlined />, '#1890ff', '#f0f8ff'
        )}

        {/* Tiles visible in BOTH modes */}
        {renderTile('security', 'Security', 'Posture & Alerts', <SafetyCertificateOutlined />, '#fa541c', '#fff7e6')}
        {renderTile('cost-management', 'Cost Management', 'FinOps & Spending', <DollarOutlined />, '#13c2c2', '#e6fffb')}
        {renderTile('backups-dr', 'Backups & DR', 'Recovery Points', <CloudSyncOutlined />, '#722ed1', '#f9f0ff')}
        {renderTile('patch-management', 'Patch Management', 'Updates & Compliance', <SafetyCertificateOutlined />, '#faad14', '#fffbe6')}
        
        {/* Renamed CMDB Tile */}
        {renderTile('cmdb', 'Asset Optimization', 'Inventory & Reserved Instances', <DatabaseOutlined />, '#1890ff', '#f0f8ff')}
        
        {renderTile('infra-availability', 'Infrastructure', 'Performance Metrics', <DashboardOutlined />, '#52c41a', '#f6ffed')}
        {renderTile('billing-view', 'Billing View', 'Invoices & Charges', <DollarOutlined />, '#d4380d', '#fff2e8')}

        {/* Tenant-Only Tiles (Hidden in Subscription Mode) */}
        {viewMode === 'tenant' && (
          <>
            {renderTile('microsoft-365', 'Microsoft O365', 'Managed Services', <TeamOutlined />, '#722ed1', '#f9f0ff')}
            {renderTile('domain-overview', 'Domain Overview', 'Health & Security', <GlobalOutlined />, '#52c41a', '#f6ffed')}
          </>
        )}

      </Space>
    </Card>
  );
};