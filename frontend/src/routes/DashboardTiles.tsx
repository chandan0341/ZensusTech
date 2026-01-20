import React from "react";
import { Card, Space, Typography } from "antd";
import { LockOutlined, GlobalOutlined, TeamOutlined } from "@ant-design/icons";

interface DashboardTilesProps {
  selectedTile: string;
  setSelectedTile: (tile: string) => void;
}

export const DashboardTiles: React.FC<DashboardTilesProps> = ({ selectedTile, setSelectedTile }) => (
  <Card
    style={{
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      height: 'fit-content'
    }}
    bodyStyle={{ padding: '16px' }}
  >
    <div style={{ marginBottom: '16px' }}>
      <Typography.Title level={4} style={{ margin: 0, textAlign: 'center' }}>
        Dashboard Tiles
      </Typography.Title>
    </div>
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {/* Azure Identity Tile */}
      <Card
        style={{
          borderRadius: '8px',
          border: selectedTile === 'azure-identity' ? '2px solid #1890ff' : '1px solid #e8e8e8',
          background: selectedTile === 'azure-identity' ? '#f0f8ff' : 'white',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        bodyStyle={{ padding: '12px' }}
        onClick={() => setSelectedTile('azure-identity')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LockOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1890ff' }}>
              Azure Identity
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Access Governance
            </div>
          </div>
        </div>
      </Card>

      {/* Security Tile */}
      <Card
        style={{
          borderRadius: '8px',
          border: selectedTile === 'security' ? '2px solid #fa541c' : '1px solid #e8e8e8',
          background: selectedTile === 'security' ? '#fff7e6' : 'white',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        bodyStyle={{ padding: '12px' }}
        onClick={() => setSelectedTile('security')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LockOutlined style={{ fontSize: '20px', color: '#fa541c' }} />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fa541c' }}>
              Security
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Security Posture & Alerts
            </div>
          </div>
        </div>
      </Card>

      {/* Cost Management (FinOps) & Optimisation Tile */}
      <Card
        style={{
          borderRadius: '8px',
          border: selectedTile === 'cost-management' ? '2px solid #13c2c2' : '1px solid #e8e8e8',
          background: selectedTile === 'cost-management' ? '#e6fffb' : 'white',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        bodyStyle={{ padding: '12px' }}
        onClick={() => setSelectedTile('cost-management')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TeamOutlined style={{ fontSize: '20px', color: '#13c2c2' }} />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#13c2c2' }}>
              Cost Management (FinOps)
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Optimisation & Spend
            </div>
          </div>
        </div>
      </Card>

      {/* Backups & DR Tile */}
      <Card
        style={{
          borderRadius: '8px',
          border: selectedTile === 'backups-dr' ? '2px solid #722ed1' : '1px solid #e8e8e8',
          background: selectedTile === 'backups-dr' ? '#f9f0ff' : 'white',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        bodyStyle={{ padding: '12px' }}
        onClick={() => setSelectedTile('backups-dr')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LockOutlined style={{ fontSize: '20px', color: '#722ed1' }} />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#722ed1' }}>
              Backups & DR
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Backup & Disaster Recovery
            </div>
          </div>
        </div>
      </Card>

      {/* Patch Management Tile */}
      <Card
        style={{
          borderRadius: '8px',
          border: selectedTile === 'patch-management' ? '2px solid #faad14' : '1px solid #e8e8e8',
          background: selectedTile === 'patch-management' ? '#fffbe6' : 'white',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        bodyStyle={{ padding: '12px' }}
        onClick={() => setSelectedTile('patch-management')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TeamOutlined style={{ fontSize: '20px', color: '#faad14' }} />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#faad14' }}>
              Patch Management
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Updates & Compliance
            </div>
          </div>
        </div>
      </Card>

      {/* CMDB Tile */}
      <Card
        style={{
          borderRadius: '8px',
          border: selectedTile === 'cmdb' ? '2px solid #1890ff' : '1px solid #e8e8e8',
          background: selectedTile === 'cmdb' ? '#f0f8ff' : 'white',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        bodyStyle={{ padding: '12px' }}
        onClick={() => setSelectedTile('cmdb')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GlobalOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1890ff' }}>
              CMDB
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Asset Inventory
            </div>
          </div>
        </div>
      </Card>

      {/* Infrastructure Availability & Performance Report Tile */}
      <Card
        style={{
          borderRadius: '8px',
          border: selectedTile === 'infra-availability' ? '2px solid #52c41a' : '1px solid #e8e8e8',
          background: selectedTile === 'infra-availability' ? '#f6ffed' : 'white',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        bodyStyle={{ padding: '12px' }}
        onClick={() => setSelectedTile('infra-availability')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TeamOutlined style={{ fontSize: '20px', color: '#52c41a' }} />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#52c41a' }}>
              Infrastructure Availability
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Performance Report
            </div>
          </div>
        </div>
      </Card>

      {/* Billing View Tile */}
      <Card
        style={{
          borderRadius: '8px',
          border: selectedTile === 'billing-view' ? '2px solid #d4380d' : '1px solid #e8e8e8',
          background: selectedTile === 'billing-view' ? '#fff2e8' : 'white',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        bodyStyle={{ padding: '12px' }}
        onClick={() => setSelectedTile('billing-view')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TeamOutlined style={{ fontSize: '20px', color: '#d4380d' }} />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#d4380d' }}>
              Billing View
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Invoices & Charges
            </div>
          </div>
        </div>
      </Card>
      {/* Domain Overview Tile */}
      <Card
        style={{
          borderRadius: '8px',
          border: selectedTile === 'domain-overview' ? '2px solid #52c41a' : '1px solid #e8e8e8',
          background: selectedTile === 'domain-overview' ? '#f6ffed' : 'white',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        bodyStyle={{ padding: '12px' }}
        onClick={() => setSelectedTile('domain-overview')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GlobalOutlined style={{ fontSize: '20px', color: '#52c41a' }} />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#52c41a' }}>
              Domain Overview
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Health & Security
            </div>
          </div>
        </div>
      </Card>
      {/* Microsoft 365 Managed Services Tile */}
      <Card
        style={{
          borderRadius: '8px',
          border: selectedTile === 'microsoft-365' ? '2px solid #722ed1' : '1px solid #e8e8e8',
          background: selectedTile === 'microsoft-365' ? '#f9f0ff' : 'white',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        bodyStyle={{ padding: '12px' }}
        onClick={() => setSelectedTile('microsoft-365')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TeamOutlined style={{ fontSize: '20px', color: '#722ed1' }} />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#722ed1' }}>
              Microsoft 365
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Managed Services
            </div>
          </div>
        </div>
      </Card>
    </Space>
  </Card>
);
