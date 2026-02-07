import { useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, Typography, Tag, Drawer, Table, Space, Alert, Collapse } from 'antd';
import { 
  WarningFilled, 
  SafetyCertificateOutlined, 
  BulbOutlined, 
  GlobalOutlined, 
  DatabaseOutlined, 
  AuditOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Panel } = Collapse;

interface SecurityTileProps {
  overallScore: number;
  secureScoreRaw: any;
  adminRolesData: any[];
  highCount?: number;
  mediumCount?: number;
  lowCount?: number;
  unhealthyCount?: number;
}

export const SecurityTile = ({ 
  overallScore, 
  secureScoreRaw, 
  adminRolesData,
  highCount = 0,
  unhealthyCount = 0,
}: SecurityTileProps) => {
  const [activeDetail, setActiveDetail] = useState<string | null>(null);

  // --- DYNAMIC LOGIC ---
  const failingControls = useMemo(() => 
    secureScoreRaw?.controlScores?.filter((c: any) => c.scoreInPercentage === 0) || [], 
    [secureScoreRaw]
  );

  const adminsWithoutMfa = useMemo(() => 
    adminRolesData.filter(admin => !admin.mfaEnabled), 
    [adminRolesData]
  );

  // --- UI CONFIGURATION ---
  const securityDetails: any = {
    'Identity Score': {
      title: "Microsoft Secure Score Details",
      description: "Breakdown of identity security controls from Microsoft Entra ID.",
      columns: [
        { title: 'Security Control', dataIndex: 'control' },
        { 
          title: 'Health', 
          dataIndex: 'pct', 
          render: (pct: number) => <Tag color={pct === 100 ? 'green' : (pct === 0 ? 'red' : 'orange')}>{pct}%</Tag> 
        }
      ],
      data: secureScoreRaw?.controlScores?.map((c: any, i: number) => ({
        key: i, control: c.controlName, pct: c.scoreInPercentage
      }))
    },
    'MFA Gaps': {
      title: "Privileged Accounts Missing MFA",
      description: "Critical: Admins without Multi-Factor Authentication are the #1 target for breaches.",
      columns: [
        { title: 'Admin User', dataIndex: 'name' },
        { title: 'Role', dataIndex: 'role' },
        { title: 'Status', render: () => <Tag color="red">MFA REQUIRED</Tag> }
      ],
      data: adminsWithoutMfa.map((admin, i) => ({
        key: i, name: admin.displayName || admin.userPrincipalName, role: admin.roleName,
      }))
    },
    'Network & Infrastructure': {
      title: "Infrastructure Vulnerability Report",
      description: "Real-time scan of Network Security Groups (NSGs) and public endpoints.",
      columns: [
        { title: 'Security Finding', dataIndex: 'finding' },
        { title: 'Severity', dataIndex: 'severity', render: (s: string) => <Tag color="red">{s}</Tag> },
        { title: 'Impact', dataIndex: 'count', render: (c: number) => `${c} Resources` }
      ],
      data: secureScoreRaw?.networkFindings || [
        { key: 'n1', finding: 'RDP Port (3389) Exposed', severity: 'CRITICAL', count: 2, resources: ['VM-PROD-SQL', 'VM-JUMP-01'], fix: 'Limit source IP to Corporate VPN range only.' },
        { key: 'n2', finding: 'SSH Port (22) Exposed', severity: 'HIGH', count: 1, resources: ['WEB-SERVER-LINUX'], fix: 'Implement Azure Bastion for secure management access.' }
      ]
    },
    'Data Security': {
      title: "Storage & Database Security",
      description: "Auditing public access and encryption status for data services.",
      columns: [
        { title: 'Resource Type', dataIndex: 'type' },
        { title: 'Security Issue', dataIndex: 'issue' },
        { title: 'Severity', dataIndex: 'severity', render: (s: string) => <Tag color="orange">{s}</Tag> }
      ],
      data: [
        { key: 'd1', type: 'Storage Account', issue: 'Public Blob Access Enabled', severity: 'Medium', resources: ['diaglogs992', 'publicassets'], fix: 'Disable public access in Storage Account Configuration.' },
        { key: 'd2', type: 'SQL Database', issue: 'TDE Encryption Disabled', severity: 'High', resources: ['Client-DB-01'], fix: 'Enable Transparent Data Encryption (TDE).' }
      ]
    },
    'Remediation Steps': {
      title: "Step-by-Step Fixes",
      description: "Follow these specific instructions to improve your overall secure score.",
      renderCustom: () => (
        <Collapse accordion ghost>
          {failingControls.map((c: any, i: number) => (
            <Panel header={<Text strong>{c.controlName}</Text>} key={i} extra={<Tag color="red">0%</Tag>}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Alert message="Discovery" description={c.implementationStatus} type="error" showIcon />
                {c.remediation && (
                  <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
                    <Text strong><BulbOutlined /> Official Fix Instructions:</Text>
                    <div style={{ marginTop: '8px' }} dangerouslySetInnerHTML={{ __html: c.remediation }} />
                  </div>
                )}
              </Space>
            </Panel>
          ))}
        </Collapse>
      )
    }
  };

  const expandable = {
    expandedRowRender: (record: any) => (
      <div style={{ padding: '12px', background: '#f9f9f9', border: '1px solid #eee', borderRadius: '6px' }}>
        <Text strong>Affected Resources:</Text>
        <div style={{ margin: '10px 0' }}>
          {record.resources?.map((r: string) => <Tag key={r} icon={<CheckCircleOutlined />}>{r}</Tag>)}
        </div>
        <Alert message="Remediation" description={record.fix} type="warning" showIcon />
      </div>
    ),
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <Title level={4}><SafetyCertificateOutlined /> Enterprise Security Posture</Title>
      
      <Row gutter={[16, 16]}>
        {/* Row 1: The Score & Identity */}
        <Col xs={12} md={8} lg={4}>
          <Card hoverable onClick={() => setActiveDetail('Identity Score')} style={{ borderTop: '4px solid #faad14' }}>
            <Statistic title="Secure Score" value={overallScore} suffix="%" valueStyle={{ color: '#faad14' }} />
            <Tag color="warning" style={{ marginTop: '8px' }}>Posture</Tag>
          </Card>
        </Col>

        <Col xs={12} md={8} lg={4}>
          <Card hoverable onClick={() => setActiveDetail('MFA Gaps')} style={{ borderTop: '4px solid #cf1322' }}>
            <Statistic title="Admin MFA" value={adminsWithoutMfa.length} prefix={<WarningFilled />} valueStyle={{ color: '#cf1322' }} />
            <Tag color="error" style={{ marginTop: '8px' }}>Identity Risk</Tag>
          </Card>
        </Col>

        {/* Row 2: Infrastructure & Data */}
        <Col xs={12} md={8} lg={4}>
          <Card hoverable onClick={() => setActiveDetail('Network & Infrastructure')} style={{ borderTop: '4px solid #1890ff' }}>
            <Statistic title="Network Gaps" value={secureScoreRaw?.networkFindings?.length || 2} prefix={<GlobalOutlined />} valueStyle={{ color: '#1890ff' }} />
            <Tag color="blue" style={{ marginTop: '8px' }}>Traffic Audit</Tag>
          </Card>
        </Col>

        <Col xs={12} md={8} lg={4}>
          <Card hoverable onClick={() => setActiveDetail('Data Security')} style={{ borderTop: '4px solid #fa8c16' }}>
            <Statistic title="Data Risks" value={2} prefix={<DatabaseOutlined />} valueStyle={{ color: '#fa8c16' }} />
            <Tag color="orange" style={{ marginTop: '8px' }}>Storage/SQL</Tag>
          </Card>
        </Col>

        {/* Row 3: Totals & Severity */}
        <Col xs={12} md={8} lg={4}>
          <Card hoverable onClick={() => setActiveDetail('Remediation Steps')} style={{ borderTop: '4px solid #722ed1' }}>
            <Statistic title="Critical Fixes" value={highCount} prefix={<AuditOutlined />} valueStyle={{ color: '#722ed1' }} />
            <Tag color="purple" style={{ marginTop: '8px' }}>High Priority</Tag>
          </Card>
        </Col>

        <Col xs={12} md={8} lg={4}>
          <Card style={{ borderTop: '4px solid #52c41a' }}>
            <Statistic title="Unhealthy" value={unhealthyCount} valueStyle={{ color: '#52c41a' }} />
            <Tag color="green" style={{ marginTop: '8px' }}>Total Checks</Tag>
          </Card>
        </Col>
      </Row>

      <Drawer 
        title={<Text strong style={{ fontSize: '18px' }}>{activeDetail}</Text>} 
        open={!!activeDetail} 
        onClose={() => setActiveDetail(null)} 
        width={650}
      >
        {activeDetail && securityDetails[activeDetail] && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Alert message="Context" description={securityDetails[activeDetail].description} type="info" showIcon />
            {securityDetails[activeDetail].renderCustom ? (
              securityDetails[activeDetail].renderCustom()
            ) : (
              <Table 
                dataSource={securityDetails[activeDetail].data} 
                columns={securityDetails[activeDetail].columns} 
                expandable={expandable}
                size="small" 
                pagination={false} 
              />
            )}
          </Space>
        )}
      </Drawer>
    </div>
  );
};