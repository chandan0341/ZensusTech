import { useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, Typography, Tag, Drawer, Table, Space, Alert, Collapse, Button, Divider } from 'antd';
import { 
  WarningFilled, 
  SafetyCertificateOutlined, 
  BulbOutlined, 
  GlobalOutlined, 
  DatabaseOutlined, 
  AuditOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  RocketOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Panel } = Collapse;

interface SecurityTileProps {
  overallScore: number;
  secureScoreRaw: any;
  adminRolesData: any[];
  subscriptionId?: string;
  networkFindings?: any[];
  dataFindings?: any[];
  hygieneFindings?: any[];
  unhealthyCount?: number;
  loading?: boolean;
}

export const SecurityTile = ({ 
  overallScore = 0, 
  secureScoreRaw, 
  adminRolesData = [],
  subscriptionId,
  networkFindings = [],
  dataFindings = [],
  hygieneFindings = [],
  unhealthyCount = 0,
  loading = false
}: SecurityTileProps) => {
  const [activeDetail, setActiveDetail] = useState<string | null>(null);
  const isSubSelected = !!subscriptionId;

  // --- DYNAMIC IDENTITY LOGIC ---
  const failingControls = useMemo(() => 
    secureScoreRaw?.controlScores?.filter((c: any) => c.scoreInPercentage === 0) || [], 
    [secureScoreRaw]
  );

  const adminsWithoutMfa = useMemo(() => 
    adminRolesData?.filter(admin => !admin.mfaEnabled) || [], 
    [adminRolesData]
  );

  // --- REFACTORED DYNAMIC DATA MAPPING ---
  const securityDetails = useMemo(() => ({
    'Identity Score': {
      title: "Microsoft Secure Score Details",
      description: "Identity security controls from Microsoft Entra ID (Tenant Level).",
      columns: [
        { title: 'Control', dataIndex: 'control' }, 
        { title: 'Health', dataIndex: 'pct', render: (pct: number) => <Tag color={pct === 100 ? 'green' : 'orange'}>{pct}%</Tag> }
      ],
      data: secureScoreRaw?.controlScores?.map((c: any, i: number) => ({ 
        key: `score-${i}`, 
        control: c.controlName, 
        pct: c.scoreInPercentage 
      })) || []
    },
    'Identity Remediation': {
        title: "Critical Identity Fixes",
        description: "Step-by-step remediation for failing Entra ID controls.",
        renderCustom: () => (
          <Collapse accordion ghost>
            {failingControls.length > 0 ? failingControls.map((c: any, i: number) => (
              <Panel header={<Text strong>{c.controlName}</Text>} key={i} extra={<Tag color="red">0% Health</Tag>}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Alert message="Issue" description={c.implementationStatus} type="error" showIcon />
                  <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
                    <Text strong><BulbOutlined /> Recommendation:</Text>
                    <div style={{ marginTop: '4px' }} dangerouslySetInnerHTML={{ __html: c.remediation || 'No instructions available.' }} />
                  </div>
                </Space>
              </Panel>
            )) : <Alert message="All identity controls are healthy!" type="success" showIcon />}
          </Collapse>
        )
      },
    'Network Audit': {
      title: "Network Exposure Report",
      description: `Vulnerabilities detected in Subscription: ${subscriptionId || 'None'}`,
      columns: [
        { title: 'Finding', dataIndex: 'finding' }, 
        { title: 'Severity', dataIndex: 'severity', render: (s: string) => <Tag color="volcano">{s}</Tag> }
      ],
      data: (networkFindings || []).map((f, i) => ({ ...f, key: `net-${i}` }))
    },
    'Data Audit': {
      title: "Data & Encryption Audit",
      description: "Findings for Storage Accounts and SQL Databases.",
      columns: [{ title: 'Resource', dataIndex: 'name' }, { title: 'Issue', dataIndex: 'issue' }],
      data: (dataFindings || []).map((f, i) => ({ ...f, key: `data-${i}` }))
    },
    'Hygiene Audit': {
      title: "Subscription Hygiene",
      description: "Orphaned resources and cost-saving security cleanup.",
      columns: [{ title: 'Item', dataIndex: 'item' }, { title: 'Impact', dataIndex: 'impact' }],
      data: (hygieneFindings || []).map((f, i) => ({ ...f, key: `hyg-${i}` }))
    },
    'MFA Gaps': {
        title: "Admin MFA Audit",
        description: "Administrators with privileged roles currently missing MFA.",
        columns: [
            { title: 'User', dataIndex: 'user' },
            { title: 'Role', dataIndex: 'role' }
        ],
        data: adminsWithoutMfa.map((a, i) => ({ key: `mfa-${i}`, user: a.displayName || a.userPrincipalName, role: a.roleName }))
    },
    'Audit Summary': {
        title: "Consolidated Security Findings",
        description: "All detected risks across Network, Data, and Hygiene categories.",
        columns: [
          { title: 'Category', dataIndex: 'category', render: (cat: string) => <Tag color="blue">{cat}</Tag> },
          { title: 'Issue', dataIndex: 'displayIssue' },
          { title: 'Severity/Impact', dataIndex: 'displaySeverity', render: (val: string) => <Tag color="orange">{val}</Tag> }
        ],
        data: [
          ...networkFindings.map(f => ({ ...f, category: 'Network', displayIssue: f.finding, displaySeverity: f.severity })),
          ...dataFindings.map(f => ({ ...f, category: 'Data', displayIssue: f.issue, displaySeverity: 'High' })),
          ...hygieneFindings.map(f => ({ ...f, category: 'Hygiene', displayIssue: f.item, displaySeverity: f.impact }))
        ].map((item, i) => ({ ...item, key: `summary-${i}` }))
    }
  }), [secureScoreRaw, failingControls, networkFindings, dataFindings, hygieneFindings, adminsWithoutMfa, subscriptionId]);

  const expandable = {
    expandedRowRender: (record: any) => (
      <div style={{ padding: '12px', background: '#f9f9f9', borderRadius: '6px', border: '1px solid #eee' }}>
        <Text strong>Target Resources:</Text>
        <div style={{ margin: '8px 0' }}>
          {record.resources?.length > 0 ? 
            record.resources.map((r: string) => <Tag key={r} color="blue" icon={<CheckCircleOutlined />}>{r}</Tag>) :
            <Text type="secondary">No specific resources listed.</Text>
          }
        </div>
        <Alert message="Fix Action" description={record.fix || "Review Azure Security Center recommendations for this item."} type="warning" showIcon />
      </div>
    ),
  };

  return (
    <div style={{ marginTop: '20px' }}>
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <SafetyCertificateOutlined style={{ color: '#52c41a' }} /> Security Command Center
          </Title>
          <Text type="secondary">
            {isSubSelected ? `Active Scan: ${subscriptionId}` : "Select a subscription to enable infrastructure auditing"}
          </Text>
        </div>
      </div>

      {/* QUICK ACTIONS BAR */}
      <Card size="small" style={{ marginBottom: '24px', background: '#fafafa', borderStyle: 'dashed' }}>
        <Space split={<Divider type="vertical" />}>
          <Text strong><SearchOutlined /> Identity:</Text>
          <Button size="small" onClick={() => setActiveDetail('Identity Remediation')}>Fixes ({failingControls.length})</Button>
          
          <Text strong style={{ marginLeft: '10px' }}>Infrastructure:</Text>
          <Button 
            size="small" 
            type="primary" 
            ghost 
            disabled={!isSubSelected} 
            onClick={() => setActiveDetail('Network Audit')}
          >
            Network
          </Button>
          <Button 
            size="small" 
            type="primary" 
            ghost 
            disabled={!isSubSelected} 
            onClick={() => setActiveDetail('Data Audit')}
          >
            Data
          </Button>
        </Space>
      </Card>

      {/* 6-CARD METRIC GRID */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={8} lg={4}>
          <Card 
            hoverable 
            onClick={() => setActiveDetail('Identity Score')} 
            style={{ borderTop: '4px solid #faad14', cursor: 'pointer' }}
          >
            <Statistic title="Score" value={overallScore} suffix="%" valueStyle={{ color: '#faad14' }} />
            <Tag color="warning" style={{ marginTop: '8px' }}>Tenant</Tag>
          </Card>
        </Col>

        <Col xs={12} sm={8} lg={4}>
          <Card 
            hoverable 
            onClick={() => setActiveDetail('MFA Gaps')} 
            style={{ borderTop: '4px solid #cf1322', cursor: 'pointer' }}
          >
            <Statistic title="MFA Gaps" value={adminsWithoutMfa.length} prefix={<WarningFilled />} valueStyle={{ color: '#cf1322' }} />
            <Tag color="error" style={{ marginTop: '8px' }}>Critical</Tag>
          </Card>
        </Col>

        <Col xs={12} sm={8} lg={4}>
          <Card 
            hoverable={isSubSelected} 
            loading={loading}
            onClick={() => isSubSelected && setActiveDetail('Network Audit')} 
            style={{ 
                borderTop: `4px solid ${isSubSelected ? '#1890ff' : '#d9d9d9'}`, 
                opacity: isSubSelected ? 1 : 0.6,
                cursor: isSubSelected ? 'pointer' : 'not-allowed'
            }}
          >
            <Statistic title="Network" value={isSubSelected ? networkFindings.length : '—'} prefix={<GlobalOutlined />} valueStyle={{ color: isSubSelected ? '#1890ff' : '#bfbfbf' }} />
            <Tag color={isSubSelected ? "blue" : "default"}>{isSubSelected ? "Gaps" : "Select Sub"}</Tag>
          </Card>
        </Col>

        <Col xs={12} sm={8} lg={4}>
          <Card 
            hoverable={isSubSelected} 
            loading={loading}
            onClick={() => isSubSelected && setActiveDetail('Data Audit')} 
            style={{ 
                borderTop: `4px solid ${isSubSelected ? '#fa8c16' : '#d9d9d9'}`, 
                opacity: isSubSelected ? 1 : 0.6,
                cursor: isSubSelected ? 'pointer' : 'not-allowed'
            }}
          >
            <Statistic title="Data" value={isSubSelected ? dataFindings.length : '—'} prefix={<DatabaseOutlined />} valueStyle={{ color: isSubSelected ? '#fa8c16' : '#bfbfbf' }} />
            <Tag color={isSubSelected ? "orange" : "default"}>{isSubSelected ? "Risks" : "Select Sub"}</Tag>
          </Card>
        </Col>

        <Col xs={12} sm={8} lg={4}>
          <Card 
            hoverable={isSubSelected} 
            loading={loading}
            onClick={() => isSubSelected && setActiveDetail('Hygiene Audit')}
            style={{ 
                borderTop: `4px solid ${isSubSelected ? '#722ed1' : '#d9d9d9'}`, 
                opacity: isSubSelected ? 1 : 0.6,
                cursor: isSubSelected ? 'pointer' : 'not-allowed'
            }}
          >
            <Statistic title="Hygiene" value={isSubSelected ? hygieneFindings.length : '—'} prefix={<AuditOutlined />} valueStyle={{ color: isSubSelected ? '#722ed1' : '#bfbfbf' }} />
            <Tag color={isSubSelected ? "purple" : "default"}>{isSubSelected ? "Orphaned" : "Select Sub"}</Tag>
          </Card>
        </Col>

        <Col xs={12} sm={8} lg={4}>
          <Card 
            hoverable={isSubSelected}
            onClick={() => isSubSelected && setActiveDetail('Audit Summary')}
            style={{ 
              borderTop: '4px solid #52c41a', 
              cursor: isSubSelected ? 'pointer' : 'not-allowed',
              opacity: isSubSelected ? 1 : 0.6 
            }}
          >
            <Statistic title="Unhealthy" value={isSubSelected ? unhealthyCount : '—'} valueStyle={{ color: '#52c41a' }} />
            <Tag color={isSubSelected ? "green" : "default"} style={{ marginTop: '8px' }}>Total Checks</Tag>
          </Card>
        </Col>
      </Row>

      <Drawer 
        title={<Text strong>{activeDetail}</Text>} 
        open={!!activeDetail} 
        onClose={() => setActiveDetail(null)} 
        width={720}
      >
        {activeDetail && (securityDetails as any)[activeDetail] ? (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Alert message="Context" description={(securityDetails as any)[activeDetail].description} type="info" showIcon />
            {(securityDetails as any)[activeDetail].renderCustom ? (securityDetails as any)[activeDetail].renderCustom() : (
              <Table 
                dataSource={(securityDetails as any)[activeDetail].data} 
                columns={(securityDetails as any)[activeDetail].columns} 
                expandable={expandable} 
                size="small" 
                pagination={false} 
                bordered 
                locale={{ emptyText: 'No security risks detected.' }}
              />
            )}
          </Space>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '100px' }}>
            <SearchOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
            <Title level={5} type="secondary">Select a metric to view findings.</Title>
          </div>
        )}
      </Drawer>
    </div>
  );
};