import React, { useState, useEffect, useMemo } from "react";
import { 
  Card, Row, Col, Space, Typography, Tag, Timeline, 
  Button, Segmented, Statistic, Progress, Badge, Table, Drawer, Empty
} from "antd";
import { 
  TeamOutlined, AppstoreOutlined, HistoryOutlined, 
  CheckCircleFilled, SearchOutlined, GlobalOutlined, 
  ClusterOutlined, RocketOutlined, SafetyCertificateOutlined,
  AuditOutlined, LockOutlined, KeyOutlined, ArrowRightOutlined,
  WarningOutlined, CheckSquareOutlined, InfoCircleOutlined
} from "@ant-design/icons";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { User, AzureApplication, AdminRoleData } from "@/types/dashboard.types";
import dayjs, { Dayjs } from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

const { Text, Title, Link } = Typography;

// --- DYNAMIC RISK CONFIGURATION ---
const RISK_COLORS = {
  SECURE: '#52c41a', // Green
  MEDIUM: '#faad14', // Amber
  HIGH: '#cf1322',   // Red
};

const getMfaRiskConfig = (count: number) => {
  if (count === 0) return { color: RISK_COLORS.SECURE, label: 'SECURE', bg: '#f6ffed', status: 'success' };
  if (count <= 3) return { color: RISK_COLORS.MEDIUM, label: 'MEDIUM RISK', bg: '#fffbe6', status: 'warning' };
  return { color: RISK_COLORS.HIGH, label: 'HIGH RISK', bg: '#fff1f0', status: 'error' };
};

const getDynamicRiskColor = (count: number) => {
  if (count === 0) return RISK_COLORS.SECURE;
  if (count <= 3) return RISK_COLORS.MEDIUM;
  return RISK_COLORS.HIGH;
};

// --- ROBUST FORENSIC LOG PARSER ---
const getLogForensics = (log: any) => {
  const target = log.targetResources?.[0];
  const actor = log.initiatedBy?.user?.displayName || log.initiatedBy?.app?.displayName || "System Process";
  const homeTenant = log.initiatedBy?.user?.homeTenantName || "";
  const targetName = target?.userPrincipalName || target?.displayName || "Unknown Resource";
  let detail = "Configuration updated";

  if (target?.modifiedProperties && target.modifiedProperties.length > 0) {
    const mfaProp = target.modifiedProperties.find((p: any) => p.displayName === "StrongAuthenticationPhoneAppDetail");
    if (mfaProp?.newValue) {
      try {
        const parsed = JSON.parse(mfaProp.newValue);
        detail = `MFA Update: ${parsed[0]?.DeviceName || 'Device'}`;
      } catch { detail = "MFA Settings Updated"; }
    } else {
      const firstProp = target.modifiedProperties[0];
      const val = String(firstProp.newValue).replace(/[\[\]\"]/g, '');
      // Truncate extremely long values to prevent UI stretching
      detail = `${firstProp.displayName}: ${val.length > 120 ? val.substring(0, 120) + '...' : val}`;
    }
  }
  return { detail, actor, target: targetName, homeTenant };
};

const FinancialRiskBanner = ({ count }: { count: number }) => (
  <Card style={{ backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '12px', marginBottom: '24px' }} bodyStyle={{ padding: '16px 24px' }}>
    <Row align="middle" gutter={24}>
      <Col xs={24} md={18}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <WarningOutlined style={{ fontSize: '24px', color: RISK_COLORS.MEDIUM, marginTop: '4px' }} />
          <div>
            <Title level={4} style={{ color: '#856404', margin: 0 }}>Financial Risk Alert: Microsoft Refund Warning</Title>
            <Text style={{ fontSize: '14px', color: '#856404', display: 'block', marginTop: '8px' }}>
              <strong>CRITICAL:</strong> MFA is disabled for {count} users. Microsoft support policies may refuse refunds for tenant breaches occurring without MFA protection.
            </Text>
          </div>
        </div>
      </Col>
      <Col xs={24} md={6} style={{ borderLeft: '1px solid #ffe58f' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#856404', fontSize: '12px', lineHeight: '2' }}>
          <li><CheckSquareOutlined /> Potential Crypto Mining</li>
          <li><CheckSquareOutlined /> Service Usage Spikes</li>
        </ul>
      </Col>
    </Row>
  </Card>
);

interface AzureIdentityTileProps {
  users: User[];
  applications: AzureApplication[];
  loading: boolean;
  foreignGroupsCount: number | null; 
  servicePrincipalsCount: number | null;
  selectedSubscription: string;
  selectedTenant: string; 
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

export const AzureIdentityTile: React.FC<AzureIdentityTileProps> = (props) => {
  const { 
    users, applications, foreignGroupsCount, servicePrincipalsCount, 
    selectedSubscription, selectedTenant, mfaEnabledCount, mfaDisabledCount, 
    mfaDisabledByRole, auditLogs, activeFilter, setActiveFilter, 
    dateRange, setDateRange, onCardClick, onCardClickForUserType, 
    onCardClickForMFADisabledRole, adminRolesData, isAuditLoading, loading 
  } = props;

  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => { if (selectedSubscription) setDrawerVisible(false); }, [selectedSubscription]);

  const filteredLogs = useMemo(() => {
    return (auditLogs || []).filter(log => {
      const logDate = dayjs(log.activityDateTime);
      const isInDate = logDate.isAfter(dateRange[0].startOf('day')) && logDate.isBefore(dateRange[1].endOf('day'));
      if (!isInDate) return false;
      if (activeFilter === 'All') return true;
      const category = (log.category || "").toLowerCase();
      const activity = (log.activityDisplayName || "").toLowerCase();
      const filter = activeFilter.toLowerCase();
      if (filter === 'auth') return category === 'authentication' || activity.includes('mfa') || activity.includes('authenticator');
      return category.includes(filter);
    });
  }, [auditLogs, activeFilter, dateRange]);

  return (
    <div style={{ padding: '0px' }}>
      <Card style={{ borderRadius: '16px', border: '2px solid #1890ff', overflow: 'hidden', marginBottom: '24px' }} bodyStyle={{ padding: '0' }}>
        <div style={{ background: 'linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)', padding: '20px', color: 'white' }}>
          <Space size={12}>
            <LockOutlined style={{ fontSize: '32px' }} />
            <div>
              <Title level={2} style={{ color: 'white', margin: 0 }}>Identity & Access</Title>
              <Text style={{ color: 'white', opacity: 0.9 }}>Tenant: {selectedTenant}</Text>
            </div>
          </Space>
        </div>
      </Card>

      <Space direction="vertical" size={24} style={{ width: "100%" }}>
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f0f0f0', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <Row gutter={[24, 24]} align="stretch">
            <Col xs={24} lg={7} style={{ borderRight: '1px solid #f0f0f0' }}>
              <Statistic title="Total Users" value={users.length} prefix={<TeamOutlined />} valueStyle={{ fontWeight: 800, color: RISK_COLORS.MEDIUM }} />
              <div style={{ marginTop: '15px' }}>
                {adminRolesData.slice(0, 4).map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', cursor: 'pointer' }} onClick={() => onCardClickForUserType(r.role.toLowerCase())}>
                    <Space size={4}><KeyOutlined style={{ fontSize: 10, color: RISK_COLORS.MEDIUM }} /><Text style={{ fontSize: 12 }}>{r.role}</Text></Space>
                    <Badge count={r.assignedUsers} size="small" />
                  </div>
                ))}
              </div>
            </Col>
            
            <Col xs={24} lg={8} style={{ textAlign: 'center' }}>
              {(() => {
                const risk = getMfaRiskConfig(mfaDisabledCount);
                return (
                  <Card hoverable size="small" style={{ borderRadius: '16px', border: `1px solid ${risk.color}`, background: risk.bg, transition: 'all 0.3s' }} onClick={() => onCardClick('mfa-disabled', 'azure-identity')}>
                    <Tag color={risk.status} icon={<SafetyCertificateOutlined />}>{risk.label}</Tag>
                    <Statistic value={mfaDisabledCount} valueStyle={{ fontSize: '38px', fontWeight: 800, color: risk.color }} />
                    <Text strong style={{ color: risk.color }}>MFA Disabled</Text>
                    <Button block icon={<RocketOutlined />} style={{ marginTop: 12, borderRadius: 8, background: mfaDisabledCount === 0 ? '#fff' : risk.color, color: mfaDisabledCount === 0 ? risk.color : '#fff', borderColor: risk.color }}>
                      {mfaDisabledCount > 0 ? "Remediate Now" : "Secure"}
                    </Button>
                  </Card>
                );
              })()}
            </Col>

            <Col xs={24} lg={9} style={{ paddingLeft: '24px' }}>
              <Row gutter={[12, 12]}>
                <Col span={12}><Card size="small" style={{ background: '#f6ffed' }} onClick={() => onCardClick('mfa-enabled', 'azure-identity')}><Statistic title="Compliant" value={mfaEnabledCount} valueStyle={{ fontSize: 16, color: RISK_COLORS.SECURE }} prefix={<CheckCircleFilled />} /></Card></Col>
                <Col span={12}><Card size="small" style={{ background: '#f9f0ff' }}><Statistic title="Foreign" value={foreignGroupsCount || 0} valueStyle={{ fontSize: 16, color: '#722ed1' }} prefix={<GlobalOutlined />} /></Card></Col>
                <Col span={12}><Card size="small" style={{ background: '#e6f7ff' }}><Statistic title="Apps" value={applications.length} valueStyle={{ fontSize: 16, color: '#1890ff' }} prefix={<AppstoreOutlined />} /></Card></Col>
                <Col span={12}><Card size="small" style={{ background: '#fff7e6' }}><Statistic title="Svc Princ" value={servicePrincipalsCount || 0} valueStyle={{ fontSize: 16, color: '#fa8c16' }} prefix={<ClusterOutlined />} /></Card></Col>
              </Row>
            </Col>
          </Row>
        </div>

        {!loading && mfaDisabledCount > 0 && <FinancialRiskBanner count={mfaDisabledCount} />}

        <Card title={<Space><SafetyCertificateOutlined /> Identity Risk Distribution</Space>} style={{ borderRadius: '16px' }}>
          <Row gutter={48} align="middle">
            <Col lg={10} xs={24}>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={mfaDisabledByRole} innerRadius={60} outerRadius={80} dataKey="count" onClick={(i) => onCardClickForMFADisabledRole(i.payload, 'mfa-disabled-roles')}>
                      {mfaDisabledByRole.map((entry, index) => <Cell key={index} fill={getDynamicRiskColor(entry.count)} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Col>
            <Col lg={14} xs={24}>
              <Title level={5}>Impact Analysis</Title>
              {mfaDisabledByRole.map((item, idx) => (
                <div key={idx} style={{ marginBottom: 15, cursor: 'pointer' }} onClick={() => onCardClickForMFADisabledRole(item, 'mfa-disabled-roles')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><Text strong>{item.role}</Text><Text style={{ color: getDynamicRiskColor(item.count) }}>{item.count} Users</Text></div>
                  <Progress percent={(item.count / (mfaDisabledCount || 1)) * 100} strokeColor={getDynamicRiskColor(item.count)} showInfo={false} size="small" />
                </div>
              ))}
            </Col>
          </Row>
        </Card>
        
        <Card title={<Space><AppstoreOutlined /> Application Inventory</Space>} style={{ borderRadius: '16px' }}>
           <Table dataSource={applications.slice(0, 5)} pagination={false} rowKey="id" size="middle" columns={[{ title: 'App Name', dataIndex: 'displayName', render: (t) => <Text strong>{t}</Text> }, { title: 'App ID', dataIndex: 'appId', render: (id) => <Text code style={{ fontSize: 11 }}>{id}</Text> }, { title: 'Type', dataIndex: 'signInAudience', render: (v) => <Tag color="blue">{v}</Tag> }]} />
        </Card>

        {/* --- FIXED HEIGHT AUDIT & INVESTIGATION SECTION --- */}
        <Row gutter={[24, 24]} align="stretch">
          <Col lg={12} xs={24}>
            <Card 
              title={<Space><SearchOutlined /> Investigation Console</Space>} 
              style={{ borderRadius: '16px', height: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size={20}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 8 }}>FILTER CATEGORY</Text>
                  <Segmented 
                    block 
                    options={['All', 'Auth', 'User', 'Application', 'Role']} 
                    value={activeFilter} 
                    onChange={(v) => setActiveFilter(v as string)} 
                  />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 8 }}>TIME HORIZON</Text>
                  <Segmented 
                    block 
                    options={[{ label: '24H', value: '1' }, { label: '7D', value: '7' }, { label: '30D', value: '30' }]} 
                    defaultValue="7" 
                    onChange={(v) => { 
                      const start = dayjs().subtract(Number(v), 'day'); 
                      setDateRange([start, dayjs()]); 
                    }} 
                  />
                </div>
                <div style={{ padding: 20, background: '#f0f5ff', borderRadius: 12, textAlign: 'center' }}>
                  <Statistic title="Events Detected" value={filteredLogs.length} prefix={<AuditOutlined />} loading={isAuditLoading} />
                </div>
              </Space>
            </Card>
          </Col>

          <Col lg={12} xs={24}>
            <Card 
              title={<Space><HistoryOutlined /> {activeFilter} Feed</Space>} 
              style={{ borderRadius: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}
              extra={<Link onClick={() => setDrawerVisible(true)}>View All</Link>}
              bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', maxHeight: '450px' }}>
                <Timeline items={filteredLogs.map((log, i) => {
                  const forensic = getLogForensics(log);
                  return { 
                    key: i, 
                    children: (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                          <Text strong style={{ fontSize: '13px' }}>{log.activityDisplayName}</Text>
                          <Text type="secondary" style={{ fontSize: 10 }}>{dayjs(log.activityDateTime).fromNow()}</Text>
                        </div>
                        <Tag style={{ fontSize: 9, marginTop: 4 }}>Actor: {forensic.actor}</Tag>
                        
                        <div style={{ 
                          background: '#f5f5f5', 
                          padding: '8px', 
                          borderRadius: '6px', 
                          fontSize: '11px', 
                          marginTop: '6px',
                          maxHeight: '80px',
                          overflowY: 'auto',
                          wordBreak: 'break-all',
                          borderLeft: '3px solid #1890ff',
                          fontFamily: 'monospace'
                        }}>
                          <strong>{forensic.detail}</strong>
                        </div>
                      </div>
                    ) 
                  };
                })} />
                {filteredLogs.length === 0 && <Empty description="No activities found" />}
              </div>

              <Button block icon={<ArrowRightOutlined />} onClick={() => setDrawerVisible(true)} style={{ marginTop: 12 }}>
                Explore All Logs
              </Button>
            </Card>
          </Col>
        </Row>
      </Space>

      {/* FORENSIC DRAWER */}
      <Drawer title={`${activeFilter} Forensic Explorer`} width="85%" open={drawerVisible} onClose={() => setDrawerVisible(false)}>
        <Table 
          dataSource={filteredLogs} 
          loading={isAuditLoading} 
          rowKey="id" 
          columns={[
            { title: 'Activity', dataIndex: 'activityDisplayName' },
            { title: 'Actor', render: (_, r) => { const f = getLogForensics(r); return <Space direction="vertical" size={0}><Text strong style={{ fontSize: 12 }}>{f.actor}</Text><Text type="secondary" style={{ fontSize: 10 }}>{f.homeTenant}</Text></Space>; } },
            { title: 'Target Resource', render: (_, r) => <Text style={{ fontSize: 12 }}>{getLogForensics(r).target}</Text> },
            { title: 'Forensic Change', width: '35%', render: (_, r) => (
              <div style={{ maxHeight: '100px', overflowY: 'auto', padding: '4px' }}>
                <Tag color="blue" style={{ whiteSpace: 'normal', height: 'auto', margin: 0 }}>{getLogForensics(r).detail}</Tag>
              </div>
            )},
            { title: 'Timestamp', dataIndex: 'activityDateTime', render: (d) => dayjs(d).format('lll') }
          ]}
          expandable={{
            expandedRowRender: (record: any) => (
              <div style={{ padding: '16px', background: '#fafafa', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
                <Title level={5} style={{ fontSize: '13px' }}><InfoCircleOutlined /> Detailed Property Changes</Title>
                <Table size="small" pagination={false} dataSource={record.targetResources?.[0]?.modifiedProperties || []} 
                  columns={[
                    { title: 'Property', dataIndex: 'displayName', width: '30%' },
                    { title: 'Old Value', dataIndex: 'oldValue', render: (v) => <Text type="secondary" delete>{v || '-'}</Text> },
                    { title: 'New Value', dataIndex: 'newValue', render: (v) => <Text code style={{ color: '#c41d7f', wordBreak: 'break-all' }}>{v || '-'}</Text> }
                  ]} 
                />
              </div>
            )
          }}
        />
      </Drawer>
    </div>
  );
};