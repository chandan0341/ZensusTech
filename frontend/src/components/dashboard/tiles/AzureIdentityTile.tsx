import React from "react";
import { Card, Row, Col, Space, Typography, Tooltip ,Badge} from "antd";
import { 
  TeamOutlined, 
  LockOutlined, 
  ExclamationCircleOutlined, 
  CheckSquareOutlined, 
  WarningOutlined,CloseCircleOutlined
} from "@ant-design/icons";
import { TableComponent } from "@/components/TailAdminReports";
import { User, AdminRoleData } from "@/types/dashboard.types";
const { Text, Title } = Typography;

interface AzureIdentityTileProps {
  users: User[];
  loading: boolean;
  foreignGroupsCount: number | null;
  servicePrincipalsCount: number | null;
  selectedSubscription: string;
  roleCounts: Record<string, number>;
  mfaEnabledCount: number;
  mfaDisabledCount: number;
  mfaDisabledByRole: Array<{ role: string; count: number }>;
  adminRolesData: AdminRoleData[];
  onCardClick: (cardType: string, currentTile: string) => void;
  onCardClickForUserType: (roleKey: string) => void;
  onCardClickForMFADisabledRole: (record: { role: string; count: number }, type: string) => void;
}

// --- Internal Pattern: Financial Risk Banner (Lead's Suggestion) ---
const FinancialRiskBanner = ({ count }: { count: number }) => (
  <Card
    style={{ backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '8px', marginBottom: '16px' }}
    bodyStyle={{ padding: '16px 24px' }}
  >
    <Row align="middle" gutter={24}>
      <Col xs={24} md={18}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <WarningOutlined style={{ fontSize: '24px', color: '#faad14', marginTop: '4px' }} />
          <div>
            <Title level={4} style={{ color: '#856404', margin: 0 }}>Financial Risk Alert: Microsoft Refund Warning</Title>
            <Text style={{ fontSize: '14px', color: '#856404', display: 'block', marginTop: '8px' }}>
              <strong>WARNING:</strong> MFA is disabled for {count} users. Compromise charges may be treated as valid usage. 
              Microsoft may not refund costs if breached without MFA.
            </Text>
          </div>
        </div>
      </Col>
      <Col xs={24} md={6} style={{ borderLeft: '1px solid #ffe58f' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#856404', fontSize: '12px' }}>
          <li><CheckSquareOutlined /> Unauthorized Spending</li>
          <li><CheckSquareOutlined /> Crypto Mining Threat</li>
          <li><CheckSquareOutlined /> No Refund Without MFA</li>
        </ul>
      </Col>
    </Row>
  </Card>
);

export const AzureIdentityTile: React.FC<AzureIdentityTileProps> = ({
  users,
  loading,
  foreignGroupsCount,
  servicePrincipalsCount,
  selectedSubscription,
  roleCounts,
  mfaEnabledCount,
  mfaDisabledCount,
  mfaDisabledByRole,
  onCardClick,
  onCardClickForUserType,
  onCardClickForMFADisabledRole,
}) => {
  return (
    <div>
      {/* 1. Main Header */}
      <Card 
        style={{ borderRadius: '16px', border: '2px solid #1890ff', overflow: 'hidden', marginBottom: '24px' }} 
        bodyStyle={{ padding: '0' }}
      >
        <div style={{ background: 'linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)', padding: '20px', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LockOutlined style={{ fontSize: '32px' }} />
            <div>
              <Title level={2} style={{ color: 'white', margin: 0 }}>Identity & Access</Title>
              <Text style={{ color: 'white', opacity: 0.9 }}>Identity & Access Governance Reports</Text>
            </div>
          </div>
        </div>
      </Card>

      <div style={{ padding: '24px' }}>
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          
          {/* 2. Identity Distribution */}
          {selectedSubscription && (
            <div style={{ marginBottom: '24px' }}>
              <Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>Identity Type Distribution</Title>
              <Row gutter={[24, 24]} justify="center">
                <Col xs={24} sm={12} lg={8}>
                  <Card loading={loading} style={{ borderRadius: '12px', borderTop: `4px solid ${foreignGroupsCount && foreignGroupsCount > 1 ? '#faad14' : '#52c41a'}`, textAlign: 'center' }}>
                    <Text type="secondary" strong>Foreign Principal</Text>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: foreignGroupsCount && foreignGroupsCount > 1 ? '#faad14' : '#52c41a' }}>
                      {foreignGroupsCount ?? 0}
                      {foreignGroupsCount && foreignGroupsCount > 1 && (
                        <Tooltip title="Multiple assignments detected for the same identity."><ExclamationCircleOutlined style={{ marginLeft: '8px', fontSize: '20px' }} /></Tooltip>
                      )}
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                  <Card loading={loading} style={{ borderRadius: '12px', borderTop: `4px solid ${servicePrincipalsCount && servicePrincipalsCount > 1 ? '#faad14' : '#52c41a'}`, textAlign: 'center' }}>
                    <Text type="secondary" strong>Service Principal</Text>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: servicePrincipalsCount && servicePrincipalsCount > 1 ? '#faad14' : '#52c41a' }}>
                      {servicePrincipalsCount ?? 0}
                    </div>
                  </Card>
                </Col>
              </Row>
            </div>
          )}

          {/* 3. Executive Summary */}
          <div>
            <Title level={3} style={{ textAlign: 'center', marginBottom: '32px' }}>Executive Summary</Title>
            <Row justify="center" style={{ marginBottom: '32px' }}>
              <Col xs={24} sm={12} lg={6}>
                <Card 
                  hoverable 
                  loading={loading}
                  onClick={() => onCardClick('total-users', 'azure-identity')} 
                  style={{ textAlign: 'center', borderTop: '4px solid #1890ff', borderRadius: '12px' }}
                >
                  <TeamOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '8px' }} />
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#1890ff' }}>{users.length}</div>
                  <Text strong>Total Users</Text>
                </Card>
              </Col>
            </Row>
            <Row gutter={[24, 24]} justify="center">
              {Object.entries(roleCounts).map(([role, count]) => (
                <Col xs={22} sm={10} lg={6} key={role}>
                  <Card 
                    hoverable 
                    loading={loading}
                    onClick={() => onCardClickForUserType(role.toLowerCase())} 
                    style={{ textAlign: 'center', borderTop: '4px solid #52c41a', borderRadius: '12px' }}
                  >
                    <Text type="secondary" strong>{role}</Text>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#52c41a' }}>{count}</div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>

          {/* 4. MFA & Security Compliance (Lead's Patterns integrated here) */}
          <div style={{ marginBottom: '24px' }}>
            
            {!loading && mfaDisabledCount > 0 && (
              <>
                <FinancialRiskBanner count={mfaDisabledCount} />
              </>
            )}
            <Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>MFA & Security Compliance</Title>

           <Row gutter={[16, 16]} style={{ marginBottom: '24px', alignItems: 'stretch' }}>
  {/* 1. ENABLED CARD (Now fully center-aligned) */}
  <Col xs={24} sm={12}>
    <Card 
      loading={loading}
      hoverable
      style={{ 
        textAlign: 'center', 
        borderRadius: '12px', 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }} 
      onClick={() => onCardClick('mfa-enabled', 'azure-identity')}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        {/* Lock symbol above the text */}
        <LockOutlined style={{ fontSize: '28px', color: '#52c41a' }} />
        
        <div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#52c41a', lineHeight: 1.2 }}>
            {mfaEnabledCount} users
          </div>
          <Text strong type="secondary" style={{ fontSize: '14px' }}>
            MFA Coverage - Enabled
          </Text>
        </div>
      </div>
    </Card>
  </Col>

  {/* 2. DISABLED CARD (Symmetrical Warning Card) */}
  <Col xs={24} sm={12}>
    <Card 
      hoverable
      style={{ 
        textAlign: 'center', 
        borderRadius: '12px', 
        background: '#fffbe6', // Soft warning yellow
        border: '1px solid #ffe58f', 
        height: '100%' 
      }} 
      bodyStyle={{ padding: '20px' }}
      onClick={() => onCardClick('mfa-disabled', 'azure-identity')}
    >
      {/* Centered Section Header */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <CloseCircleOutlined style={{ color: '#cf1322', fontSize: '18px' }} />
        <Text strong style={{ color: '#a8071a', fontSize: '16px' }}>
          Critical Issue: MFA Recommendations
        </Text>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        {/* Matches icon-above-text layout of the green card */}
        <LockOutlined style={{ fontSize: '28px', color: '#ff4d4f' }} />
        
        <div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff4d4f', lineHeight: 1.2 }}>
            {mfaDisabledCount} users
          </div>
          <Text strong type="secondary" style={{ fontSize: '14px' }}>
            MFA Coverage - Disabled
          </Text>
        </div>

        {/* Centered Recommendation Footer */}
        <div style={{ marginTop: '8px' }}>
          <Badge 
            count="Risk: CRITICAL" 
            style={{ backgroundColor: '#cf1322', borderRadius: '4px', fontWeight: 'bold', marginBottom: '8px' }} 
          />
          <div style={{ marginTop: '4px' }}>
            <Text strong style={{ fontSize: '13px' }}>Recommendation: </Text>
            <Text style={{ fontSize: '13px' }}>Enable MFA Immediately</Text>
          </div>
        </div>
      </div>
    </Card>
  </Col>
</Row>

            <TableComponent
              title="MFA Disabled by Role Details"
              columns={[
                { key: "role", label: "Role" },
                { key: "count", label: "Count" }
              ]}
              data={mfaDisabledByRole}
              onRowClick={(record) => onCardClickForMFADisabledRole(record, 'mfa-disabled-roles')}
            />
          </div>
        </Space>
      </div>
    </div>
  );
};