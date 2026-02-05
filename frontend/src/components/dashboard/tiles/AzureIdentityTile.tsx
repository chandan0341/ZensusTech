import React, { useState, useEffect } from "react";
import { 
  Card, Row, Col, Space, Typography, Table, Tag, Timeline, 
  Button, Drawer, Segmented, DatePicker, Divider, Statistic, Empty, Badge
} from "antd";
import type { DividerProps } from "antd";
import { 
  TeamOutlined, AppstoreOutlined, HistoryOutlined, 
  CloseCircleOutlined, 
  CheckCircleFilled, ArrowRightOutlined,
  WarningOutlined,
  UserOutlined, SearchOutlined, GlobalOutlined, ClusterOutlined,
  SecurityScanOutlined, InfoCircleOutlined
} from "@ant-design/icons";
import { TableComponent } from "@/components/TailAdminReports";
import { User, AdminRoleData, AzureApplication } from "@/types/dashboard.types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { Dayjs } from "dayjs";

dayjs.extend(relativeTime);

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

interface AzureIdentityTileProps {
  users: User[];
  applications: AzureApplication[];
  loading: boolean;
  foreignGroupsCount: number | null; 
  servicePrincipalsCount: number | null;
  selectedSubscription: string;
  selectedTenant: string; // Now being used below
  roleCounts: Record<string, number>;
  mfaEnabledCount: number;
  mfaDisabledCount: number;
  mfaDisabledByRole: Array<{ role: string; count: number }>;
  adminRolesData: AdminRoleData[];
  auditLogs: any[]; 
  isAuditLoading: boolean; 
  activeFilter: string;
  setActiveFilter: (val: string) => void;
  dateRange: [Dayjs, Dayjs];
  setDateRange: (val: [Dayjs, Dayjs]) => void;
  onCardClick: (cardType: string, currentTile: string) => void;
  onCardClickForUserType: (roleKey: string) => void;
  onCardClickForMFADisabledRole: (record: { role: string; count: number }, type: string) => void;
}

export const AzureIdentityTile: React.FC<AzureIdentityTileProps> = ({
  users, applications, loading, foreignGroupsCount, servicePrincipalsCount, 
  selectedSubscription, selectedTenant, roleCounts, mfaEnabledCount, mfaDisabledCount, 
  mfaDisabledByRole, onCardClick, onCardClickForUserType, 
  onCardClickForMFADisabledRole, auditLogs, 
  isAuditLoading, activeFilter, setActiveFilter, dateRange, setDateRange
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    setDrawerVisible(false);
  }, [selectedSubscription]);

  const getLogImportance = (activity: string) => {
    const act = activity.toLowerCase();
    if (act.includes('delete') || act.includes('remove') || act.includes('role') || act.includes('permission')) {
      return { color: '#ff4d4f', label: 'CRITICAL', icon: <SecurityScanOutlined /> };
    }
    if (act.includes('update') || act.includes('add')) {
      return { color: '#faad14', label: 'WARNING', icon: <WarningOutlined /> };
    }
    return { color: '#1890ff', label: 'INFO', icon: <InfoCircleOutlined /> };
  };

  const previewLogs = auditLogs.slice(0, 5);

  const timelineItems = previewLogs.map((log: any) => {
    const importance = getLogImportance(log.activityDisplayName);
    const isSuccess = log.result?.toLowerCase() === "success";

    return {
      dot: (
        <Badge dot={!isSuccess} status={isSuccess ? "success" : "error"} offset={[-2, 12]}>
          <div style={{ background: importance.color, borderRadius: '50%', padding: '4px', display: 'flex', color: 'white', fontSize: '10px' }}>
            {importance.icon}
          </div>
        </Badge>
      ),
      children: (
        <div style={{ paddingBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text strong style={{ fontSize: '13px' }}>{log.activityDisplayName}</Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>{dayjs(log.activityDateTime).fromNow()}</Text>
          </div>
          <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
            Actor: {log.initiatedBy?.user?.userPrincipalName || "System"}
          </Text>
        </div>
      )
    };
  });

  return (
    <div style={{ padding: '0px', background: 'transparent' }}>
      <Space direction="vertical" size={24} style={{ width: "100%" }}>
        
        {/* --- 1. EXECUTIVE SUMMARY --- */}
        <Card styles={{ body: { padding: '24px' } }} style={{ borderRadius: '12px', border: '1px solid #f0f0f0' }}>
          <Row gutter={[32, 24]} align="middle">
            <Col xs={24} lg={7} style={{ borderRight: '1px solid #f0f0f0' }}>
              <Statistic 
                title={<Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase' }}>Total Users</Text>}
                value={loading ? 0 : users.length} 
                prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ fontSize: '32px', fontWeight: '700' }}
              />
              <Space split={<Divider type="vertical" />} style={{ marginTop: '4px', flexWrap: 'wrap' }}>
                {!loading && Object.entries(roleCounts).map(([role, count]) => (
                  <Text key={role} style={{ fontSize: '12px', cursor: 'pointer', fontWeight: 500 }} onClick={() => onCardClickForUserType(role.toLowerCase())}>
                    <UserOutlined style={{ color: '#1890ff', marginRight: '4px' }} />
                    {count} {role}
                  </Text>
                ))}
              </Space>
            </Col>
            
            <Col xs={24} lg={8} style={{ paddingLeft: '40px', borderRight: '1px solid #f0f0f0' }}>
               <Row gutter={16}>
                  <Col span={12} style={{ cursor: 'pointer' }} onClick={() => onCardClick('mfa-enabled', 'azure-identity')}>
                    <Statistic title="MFA COMPLIANT" value={loading ? 0 : mfaEnabledCount} valueStyle={{ color: '#52c41a', fontSize: '22px' }} prefix={<CheckCircleFilled />} />
                    <Tag color="success" bordered={false}>Secure</Tag>
                  </Col>
                  <Col span={12} style={{ cursor: 'pointer' }} onClick={() => onCardClick('mfa-disabled', 'azure-identity')}>
                    <Statistic title="MFA VULNERABLE" value={loading ? 0 : mfaDisabledCount} valueStyle={{ color: '#ff4d4f', fontSize: '22px' }} prefix={<CloseCircleOutlined />} />
                    <Tag color="error" bordered={false}>Critical Risk</Tag>
                  </Col>
               </Row>
            </Col>

            <Col xs={24} lg={9} style={{ paddingLeft: '40px' }}>
              <Row gutter={12}>
                <Col span={12}>
                    <Card size="small" styles={{ body: { padding: '12px' } }} style={{ background: '#f0f5ff', border: 'none', textAlign: 'center' }}>
                        <Statistic title={<Text style={{ fontSize: '11px' }}>Apps</Text>} value={loading ? 0 : (servicePrincipalsCount ?? 0)} valueStyle={{ fontSize: '18px' }} prefix={<ClusterOutlined />} />
                    </Card>
                </Col>
                <Col span={12}>
                    <Card size="small" styles={{ body: { padding: '12px' } }} style={{ background: '#f9f0ff', border: 'none', textAlign: 'center' }}>
                        <Statistic title={<Text style={{ fontSize: '11px' }}>Foreign Groups</Text>} value={loading ? 0 : (foreignGroupsCount ?? 0)} valueStyle={{ fontSize: '18px' }} prefix={<GlobalOutlined />} />
                    </Card>
                </Col>
              </Row>
              <Button danger type="primary" block style={{ marginTop: '16px', height: '40px', fontWeight: '600' }} onClick={() => onCardClick('mfa-disabled', 'azure-identity')}>
                Remediate MFA Issues
              </Button>
            </Col>
          </Row>
        </Card>

        {/* --- 2. RISK BANNER --- */}
        {!loading && mfaDisabledCount > 0 && (
          <Card styles={{ body: { padding: '20px' } }} style={{ backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '8px' }}>
            <Row align="middle" gutter={24}>
              <Col flex="auto">
                <Space align="start" size={16}>
                  <WarningOutlined style={{ fontSize: '24px', color: '#faad14' }} />
                  <div>
                    <Text strong style={{ fontSize: '16px' }}>Security Posture Alert</Text>
                    <div style={{ marginTop: '4px' }}>
                      <Text style={{ fontSize: '13px' }}>
                        MFA is disabled for {mfaDisabledCount} users. Microsoft reserves the right to treat compromise charges as valid usage if MFA is not enforced.
                      </Text>
                    </div>
                  </div>
                </Space>
              </Col>
            </Row>
          </Card>
        )}

        {/* --- 3. BREAKDOWN TABLE --- */}
        <Card title="MFA Status Breakdown by Role" styles={{ body: { padding: '0px' } }} style={{ borderRadius: '8px', overflow: 'hidden' }}>
            <TableComponent
              title=""
              columns={[{ key: "role", label: "Identity Role" }, { key: "count", label: "MFA Disabled Users" }]}
              data={loading ? [] : mfaDisabledByRole}
              onRowClick={(record) => onCardClickForMFADisabledRole(record, 'mfa-disabled-roles')}
            />
        </Card>

        {/* --- 4. APPLICATION INVENTORY --- */}
        <Card title={<Space><AppstoreOutlined /> Application Inventory (Top 5)</Space>} styles={{ body: { padding: '0px' } }} style={{ borderRadius: '8px' }}>
          <Table 
            dataSource={loading ? [] : applications.slice(0, 5)}
            loading={loading}
            rowKey="id"
            pagination={false}
            columns={[
              { title: 'Display Name', dataIndex: 'displayName', render: (text) => <Text strong>{text || 'Unnamed'}</Text> },
              { title: 'App ID', dataIndex: 'appId', render: (id) => <Text code style={{ fontSize: '11px' }}>{id}</Text> },
              { title: 'Audience', dataIndex: 'signInAudience', render: (aud) => <Tag color="blue">{aud}</Tag> },
              { title: 'Created', dataIndex: 'createdDateTime', render: (date) => dayjs(date).format('MMM D, YYYY') }
            ]}
          />
        </Card>

        {/* --- 5. INVESTIGATION CONSOLE --- */}
        <Card title={<Space><SearchOutlined /> Investigation Console</Space>} style={{ borderRadius: '8px' }}>
            <Row gutter={[24, 24]} align="middle">
                <Col xs={24} md={10}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Text strong style={{ fontSize: '11px', color: '#8c8c8c' }}>TIME HORIZON</Text>
                        <RangePicker 
                          style={{ width: '100%' }} 
                          value={dateRange} 
                          onChange={(values) => {
                            if (values && values[0] && values[1]) {
                              setDateRange([values[0], values[1]]);
                            }
                          }} 
                        />
                    </Space>
                </Col>
                <Col xs={24} md={14}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Text strong style={{ fontSize: '11px', color: '#8c8c8c' }}>CATEGORY</Text>
                        <Segmented block options={['All', 'Role Changes', 'User Lifecycle', 'App Reg', 'MFA']} value={activeFilter} onChange={(v) => setActiveFilter(v as string)} />
                    </Space>
                </Col>
            </Row>
        </Card>

        {/* --- 6. AUDIT FEED (TOP 5) --- */}
        <Card 
          title={<Space><HistoryOutlined /> Recent Audit Feed</Space>} 
          extra={<Badge count={auditLogs.length} overflowCount={99} style={{ backgroundColor: '#108ee9' }} />}
          style={{ borderRadius: '8px' }}
        >
          <Divider orientation={"left" as DividerProps["orientation"]} plain>
            <Text type="secondary" style={{ fontSize: '11px' }}>LATEST 5 EVENTS</Text>
          </Divider>
          
          {auditLogs.length > 0 ? (
            <>
              <Timeline items={timelineItems} style={{ marginTop: '20px' }} />
              <Button block type="primary" ghost icon={<ArrowRightOutlined />} onClick={() => setDrawerVisible(true)} style={{ marginTop: '16px' }}>
                Open Full Investigation Page
              </Button>
            </>
          ) : (
            <Empty description="No events found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
      </Space>

      {/* --- 7. FULL HISTORY DRAWER --- */}
      <Drawer 
        title={
          <Space>
            <SecurityScanOutlined /> 
            {/* Using selectedTenant here to satisfy TS and provide context */}
            <Text strong>Audit History for {selectedTenant || 'Default Tenant'}</Text>
          </Space>
        } 
        width="80%" 
        open={drawerVisible} 
        onClose={() => setDrawerVisible(false)}
      >
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Title level={4}>Detailed Audit Records</Title>
            <Table 
              dataSource={auditLogs} 
              rowKey="id"
              loading={isAuditLoading}
              pagination={{ pageSize: 15 }}
              columns={[
                { title: 'Severity', render: (_, rec) => <Tag color={getLogImportance(rec.activityDisplayName).color}>{getLogImportance(rec.activityDisplayName).label}</Tag> },
                { title: 'Time', dataIndex: 'activityDateTime', render: (d) => dayjs(d).format('YYYY-MM-DD HH:mm:ss') },
                { title: 'Activity', dataIndex: 'activityDisplayName', render: (t) => <Text strong>{t}</Text> },
                { title: 'Actor', dataIndex: ['initiatedBy', 'user', 'userPrincipalName'] },
                { title: 'Result', dataIndex: 'result', render: (r) => <Badge status={r === 'success' ? 'success' : 'error'} text={String(r || '').toUpperCase()} /> }
              ]}
            />
        </Space>
      </Drawer>
    </div>
  );
};