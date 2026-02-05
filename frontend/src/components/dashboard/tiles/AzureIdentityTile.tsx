import React, { useEffect, useState } from "react";
import { 
  Card, Row, Col, Space, Typography, Tag, Timeline, 
  Button, Segmented, DatePicker, Statistic, Progress, Badge, Table, Empty, Drawer
} from "antd";
import { 
  TeamOutlined, AppstoreOutlined, HistoryOutlined, 
  CheckCircleFilled, SearchOutlined, GlobalOutlined, 
  ClusterOutlined, RocketOutlined, SafetyCertificateOutlined,
  AuditOutlined, LockOutlined, KeyOutlined, ArrowRightOutlined
} from "@ant-design/icons";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { User, AzureApplication, AdminRoleData } from "@/types/dashboard.types";
import dayjs, { Dayjs } from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
const { Text, Title, Link } = Typography;
const { RangePicker } = DatePicker;

interface AzureIdentityTileProps {
  users: User[];
  applications: AzureApplication[];
  loading: boolean;
  foreignGroupsCount: number | null; 
  servicePrincipalsCount: number | null;
  selectedSubscription: string;
  selectedTenant: string; 
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
  users, applications, foreignGroupsCount, servicePrincipalsCount, 
  selectedSubscription, roleCounts, mfaEnabledCount, mfaDisabledCount, 
  mfaDisabledByRole, auditLogs, activeFilter, setActiveFilter, 
  dateRange, setDateRange, onCardClick, onCardClickForUserType, 
  onCardClickForMFADisabledRole, selectedTenant, adminRolesData, isAuditLoading 
}) => {
  
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => { 
    setDrawerVisible(false);
  }, [selectedSubscription]);

  const getRoleColor = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes('owner') || r.includes('admin')) return '#ff4d4f';
    if (r.includes('contributor')) return '#faad14';
    return '#1890ff';
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesCategory = activeFilter === 'All' || 
      log.category?.toLowerCase() === activeFilter.toLowerCase();
    const logDate = dayjs(log.activityDateTime);
    return matchesCategory && logDate.isAfter(dateRange[0].startOf('day')) && logDate.isBefore(dateRange[1].endOf('day'));
  });

  const disabledDate = (current: Dayjs) => current && current > dayjs().endOf('day');

  // Restored all filter categories
  const auditTabs = [
    { label: 'All', value: 'All' },
    { label: 'Roles', value: 'RoleManagement' },
    { label: 'Users', value: 'UserManagement' },
    { label: 'Apps', value: 'ApplicationManagement' },
    { label: 'Auth', value: 'Authentication' }
  ];

  return (
    <div style={{ padding: '0px' }}>
      <Space direction="vertical" size={24} style={{ width: "100%" }}>
        
        {/* SECTION 1: TOP SUMMARY */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f0f0f0', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <Row gutter={[24, 24]} align="stretch">
            <Col xs={24} lg={7} style={{ borderRight: '1px solid #f0f0f0' }}>
              <Statistic 
                title={<Text strong style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase' }}>Total Identity Surface</Text>}
                value={users.length} 
                prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ fontSize: '32px', fontWeight: '800' }}
              />
              <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {Object.entries(roleCounts).map(([role, count]) => (
                  <Tag key={role} color="blue" bordered={false} style={{ cursor: 'pointer', borderRadius: '4px', fontSize: '11px' }} onClick={() => onCardClickForUserType(role.toLowerCase())}>
                    {count} {role}
                  </Tag>
                ))}
              </div>

              <div style={{ marginTop: '20px', padding: '12px', background: '#fafafa', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                <Text type="secondary" style={{ fontSize: '10px', fontWeight: 700, display: 'block', marginBottom: '10px' }}>PRIVILEGED ROLES ({selectedTenant})</Text>
                <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                    {adminRolesData?.map((role, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <Space size={4}>
                                <KeyOutlined style={{ fontSize: '10px', color: '#faad14' }} />
                                <Text style={{ fontSize: '12px' }}>{role.role}</Text>
                                {role.mfaEnabled === "No" && <LockOutlined style={{ color: '#ff4d4f', fontSize: '10px' }} />}
                            </Space>
                            <Badge count={role.assignedUsers} size="small" style={{ backgroundColor: '#e6f7ff', color: '#1890ff', border: '1px solid #91d5ff' }} />
                        </div>
                    ))}
                </div>
              </div>
            </Col>

            <Col xs={24} lg={8} style={{ padding: '0 24px' }}>
              <Card hoverable size="small" onClick={() => onCardClick('mfa-disabled', 'azure-identity')} style={{ borderRadius: '16px', border: '1px solid #ffccc7', background: 'linear-gradient(180deg, #fffcf6 0%, #fff 100%)', textAlign: 'center' }}>
                <Tag color="error" icon={<SafetyCertificateOutlined />} style={{ borderRadius: '10px', fontWeight: 700 }}>SECURITY GAP</Tag>
                <div style={{ margin: '8px 0' }}>
                  <Title level={2} style={{ fontSize: '42px', color: '#ff4d4f', margin: 0, fontWeight: '900' }}>{mfaDisabledCount}</Title>
                  <Text strong style={{ color: '#ff4d4f', fontSize: '13px' }}>Users with MFA Disabled</Text>
                </div>
                <Button danger type="primary" block icon={<RocketOutlined />} style={{ borderRadius: '8px' }}>Remediate</Button>
              </Card>
            </Col>

            <Col xs={24} lg={9} style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: '24px' }}>
               <Row gutter={[12, 12]}>
                  <Col span={12}><Card size="small" hoverable onClick={() => onCardClick('mfa-enabled', 'azure-identity')} style={{ background: '#f6ffed', borderRadius: '12px' }}><Statistic title="Compliant" value={mfaEnabledCount} valueStyle={{ color: '#52c41a', fontSize: '18px' }} prefix={<CheckCircleFilled />} /></Card></Col>
                  <Col span={12}><Card size="small" style={{ background: '#f9f0ff', borderRadius: '12px' }}><Statistic title="Foreign" value={foreignGroupsCount ?? 0} valueStyle={{ color: '#722ed1', fontSize: '18px' }} prefix={<GlobalOutlined />} /></Card></Col>
                  <Col span={12}><Card size="small" style={{ background: '#e6f7ff', borderRadius: '12px' }}><Statistic title="Apps" value={applications.length} valueStyle={{ color: '#1890ff', fontSize: '18px' }} prefix={<AppstoreOutlined />} /></Card></Col>
                  <Col span={12}><Card size="small" style={{ background: '#fff7e6', borderRadius: '12px' }}><Statistic title="Svc Princ" value={servicePrincipalsCount ?? 0} valueStyle={{ color: '#fa8c16', fontSize: '18px' }} prefix={<ClusterOutlined />} /></Card></Col>
               </Row>
            </Col>
          </Row>
        </div>

        {/* SECTION 2: MFA BREAKDOWN */}
        <Card title={<Space><SafetyCertificateOutlined /> Identity Risk Distribution</Space>} style={{ borderRadius: '16px' }}>
          <Row gutter={48} align="middle">
            <Col xs={24} lg={10} style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={mfaDisabledByRole} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="count" onClick={(i) => onCardClickForMFADisabledRole(i.payload, 'mfa-disabled-roles')}>
                      {mfaDisabledByRole.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getRoleColor(entry.role)} style={{ cursor: 'pointer' }} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>TOTAL</Text>
                  <Title level={3} style={{ margin: 0 }}>{mfaDisabledCount}</Title>
                </div>
              </div>
            </Col>
            <Col xs={24} lg={14}>
              <Title level={5} style={{ marginBottom: '20px' }}>Impact Analysis</Title>
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                {mfaDisabledByRole.map((item, idx) => (
                  <div key={idx} style={{ cursor: 'pointer' }} onClick={() => onCardClickForMFADisabledRole(item, 'mfa-disabled-roles')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <Text strong>{item.role}</Text>
                      <Text type="secondary">{item.count} Users</Text>
                    </div>
                    <Progress percent={mfaDisabledCount > 0 ? (item.count / mfaDisabledCount) * 100 : 0} strokeColor={getRoleColor(item.role)} showInfo={false} size="small" />
                  </div>
                ))}
              </Space>
            </Col>
          </Row>
        </Card>

        {/* SECTION 3: REVERTED INVESTIGATION & AUDIT LOGS ROW */}
        <Row gutter={[24, 24]}>
          <Col lg={12} xs={24}>
            <Card title={<Space><SearchOutlined /> Investigation Console</Space>} style={{ borderRadius: '16px', height: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }} size={20}>
                <div>
                  <Text type="secondary" style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>FILTER CATEGORY</Text>
                  <Segmented block options={auditTabs} value={activeFilter} onChange={(v) => setActiveFilter(v as string)} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>TIME HORIZON</Text>
                  <RangePicker style={{ width: '100%' }} value={dateRange} disabledDate={disabledDate} onChange={(v) => v && setDateRange([v[0]!, v[1]!])} />
                </div>
                <div style={{ padding: '24px', background: '#e6f7ff', borderRadius: '12px', textAlign: 'center' }}>
                    <Statistic title="Events Detected" value={filteredLogs.length} prefix={<AuditOutlined />} valueStyle={{ color: '#1890ff' }} />
                </div>
              </Space>
            </Card>
          </Col>

          <Col lg={12} xs={24}>
            <Card title={<Space><HistoryOutlined /> {activeFilter} Feed</Space>} extra={<Link onClick={() => setDrawerVisible(true)}>View All</Link>} style={{ borderRadius: '16px', height: '100%' }}>
              {filteredLogs.length > 0 ? (
                <Timeline items={filteredLogs.slice(0, 4).map((log, idx) => ({
                  key: idx,
                  children: (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong style={{ fontSize: '12px' }}>{log.activityDisplayName}</Text>
                        <Text type="secondary" style={{ fontSize: '10px' }}>{dayjs(log.activityDateTime).fromNow()}</Text>
                      </div>
                      <Tag color="blue" style={{ fontSize: '9px' }}>{log.category}</Tag>
                    </div>
                  )
                }))} />
              ) : <Empty description="No logs found" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
              <Button block icon={<ArrowRightOutlined />} onClick={() => setDrawerVisible(true)} style={{ marginTop: '10px' }}>Explore All Logs</Button>
            </Card>
          </Col>
        </Row>

        {/* SECTION 4: APPLICATION INVENTORY */}
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Card title={<Space><AppstoreOutlined /> Application Inventory</Space>} extra={<Link onClick={() => setDrawerVisible(true)}>Manage</Link>} style={{ borderRadius: '16px' }}>
              <Table dataSource={applications.slice(0, 5)} pagination={false} rowKey="id" columns={[
                { title: 'App Name', dataIndex: 'displayName', render: (t) => <Text strong>{t}</Text> },
                { title: 'App ID', dataIndex: 'appId', render: (id) => <Text type="secondary" style={{ fontSize: '12px' }}>{id}</Text> },
                { title: 'Type', dataIndex: 'signInAudience', render: (v) => <Tag color={v === 'AzureADMyOrg' ? 'blue' : 'orange'}>{v === 'AzureADMyOrg' ? 'Internal' : 'Multi'}</Tag> },
                { title: 'Created', dataIndex: 'createdDateTime', render: (d) => dayjs(d).format('MMM DD, YYYY') }
              ]} />
            </Card>
          </Col>
        </Row>
      </Space>

      <Drawer title={`${activeFilter} Explorer`} width="80%" open={drawerVisible} onClose={() => setDrawerVisible(false)}>
        <Table 
          dataSource={activeFilter === 'ApplicationManagement' ? applications : filteredLogs} 
          loading={isAuditLoading}
          rowKey="id"
          columns={activeFilter === 'ApplicationManagement' ? [
            { title: 'Name', dataIndex: 'displayName' },
            { title: 'App ID', dataIndex: 'appId' },
            { title: 'Audience', dataIndex: 'signInAudience' }
          ] : [
            { title: 'Activity', dataIndex: 'activityDisplayName' },
            { title: 'Actor', dataIndex: ['initiatedBy', 'user', 'userPrincipalName'] },
            { title: 'Date', dataIndex: 'activityDateTime', render: (d) => dayjs(d).format('lll') }
          ]}
        />
      </Drawer>
    </div>
  );
};