import { Card, Row, Col, Space, Typography, Tooltip } from "antd";
import { TeamOutlined, LockOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { TableComponent } from "@/components/TailAdminReports";
import { User, AdminRoleData } from "@/types/dashboard.types";

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

export const AzureIdentityTile = ({
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
}: AzureIdentityTileProps) => {
  return (
    <div>
      <Card
        style={{
          borderRadius: '16px',
          border: '2px solid #1890ff',
          boxShadow: '0 4px 12px rgba(24,144,255,0.15)',
          overflow: 'hidden',
          marginBottom: '24px'
        }}
        bodyStyle={{ padding: '0' }}
      >
        <div style={{
          background: 'linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)',
          padding: '20px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LockOutlined style={{ fontSize: '32px' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                Identity & Access
              </h2>
              <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
                Identity & Access Governance Reports
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div style={{ padding: '24px' }}>
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          {selectedSubscription && (
            <div style={{ marginBottom: '24px' }}>
              <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
                Identity Type Distribution
              </Typography.Title>
              <Row gutter={[24, 24]} justify="center">
                <Col xs={24} sm={12} lg={8}>
                  <Card
                    hoverable
                    loading={loading || foreignGroupsCount === undefined}
                    style={{
                      borderRadius: '12px',
                      borderTop: `4px solid ${foreignGroupsCount && foreignGroupsCount > 1 ? '#faad14' : '#52c41a'}`,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      height: '160px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}
                    bodyStyle={{ padding: '0px' }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px', fontWeight: '500' }}>
                        Foreign Principal
                      </div>
                      <div style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: foreignGroupsCount && foreignGroupsCount > 1 ? '#faad14' : '#52c41a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {foreignGroupsCount ?? 0}
                        {foreignGroupsCount && foreignGroupsCount > 1 && (
                          <Tooltip title="Multiple assignments detected for the same identity.">
                            <ExclamationCircleOutlined style={{ marginLeft: '8px', fontSize: '20px' }} />
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </Card>
                </Col>

                <Col xs={24} sm={12} lg={8}>
                  <Card
                    hoverable
                    loading={loading || servicePrincipalsCount === undefined}
                    style={{
                      borderRadius: '12px',
                      borderTop: `4px solid ${servicePrincipalsCount && servicePrincipalsCount > 1 ? '#faad14' : '#52c41a'}`,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      height: '160px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}
                    bodyStyle={{ padding: '0px' }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px', fontWeight: '500' }}>
                        Service Principal
                      </div>
                      <div style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: servicePrincipalsCount && servicePrincipalsCount > 1 ? '#faad14' : '#52c41a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {servicePrincipalsCount ?? 0}
                        {servicePrincipalsCount && servicePrincipalsCount > 1 && (
                          <Tooltip title="Multiple assignments detected for the same identity.">
                            <ExclamationCircleOutlined style={{ marginLeft: '8px', fontSize: '20px' }} />
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </Card>
                </Col>
              </Row>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '32px' }}>
              Executive Summary
            </Typography.Title>

            <Row justify="center" style={{ marginBottom: '32px' }}>
              <Col xs={24} sm={12} lg={6}>
                <Card
                  hoverable
                  loading={loading}
                  style={{
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    borderTop: '4px solid #1890ff'
                  }}
                  bodyStyle={{ padding: '24px', textAlign: 'center' }}
                  onClick={() => !loading && onCardClick('total-users', 'azure-identity')}
                >
                  <div style={{ marginBottom: '8px' }}>
                    <TeamOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#1890ff' }}>
                    {users.length}
                  </div>
                  <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>
                    Total Users
                  </div>
                </Card>
              </Col>
            </Row>

            <Row gutter={[24, 24]} justify="center">
              {Object.entries(roleCounts).map(([role, count]) => (
                <Col xs={22} sm={10} lg={6} key={role}>
                  <Card
                    hoverable
                    loading={loading}
                    style={{
                      borderRadius: '12px',
                      borderTop: '4px solid #52c41a',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                    bodyStyle={{ textAlign: 'center', padding: '24px' }}
                    onClick={() => !loading && onCardClickForUserType(role.toLowerCase())}
                  >
                    <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px', fontWeight: '500' }}>
                      {role}
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#52c41a' }}>
                      {count}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
              MFA & Security Compliance
            </Typography.Title>

            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
              <Col xs={24} sm={12}>
                <Card
                  loading={loading}
                  style={{
                    borderRadius: '12px',
                    border: '1px solid #e8e8e8',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                  bodyStyle={{ padding: '20px', textAlign: 'center' }}
                  onClick={() => onCardClick('mfa-enabled', 'azure-identity')}
                >
                  <div style={{ marginBottom: '8px' }}>
                    <LockOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#52c41a', marginBottom: '4px' }}>
                    {mfaEnabledCount} users
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
                    MFA Coverage - Enabled
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card
                  loading={loading}
                  style={{
                    borderRadius: '12px',
                    border: '1px solid #e8e8e8',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                  bodyStyle={{ padding: '20px', textAlign: 'center' }}
                  onClick={() => onCardClick('mfa-disabled', 'azure-identity')}
                >
                  <div style={{ marginBottom: '8px' }}>
                    <LockOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ff4d4f', marginBottom: '4px' }}>
                    {mfaDisabledCount} users
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
                    MFA Coverage - Disabled
                  </div>
                </Card>
              </Col>
            </Row>

            <TableComponent
              title="MFA Disabled by Role"
              columns={[
                { key: "role", label: "Role" },
                { key: "count", label: "Count" },
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
