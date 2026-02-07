import { useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, Typography, Tag, Drawer, Table, Space, Alert, Collapse } from 'antd';
import { WarningFilled, SafetyCertificateOutlined, BulbOutlined } from '@ant-design/icons';

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
  mediumCount = 0,
  lowCount = 0,
}: SecurityTileProps) => {
  const [activeDetail, setActiveDetail] = useState<string | null>(null);

  // 1. Logic: Filter failing items (scoreInPercentage is 0)
  const failingControls = useMemo(() => 
    secureScoreRaw?.controlScores?.filter((c: any) => c.scoreInPercentage === 0) || [], 
    [secureScoreRaw]
  );

  // 2. Logic: Admins without MFA - Variable is now utilized
  const adminsWithoutMfa = useMemo(() => 
    adminRolesData.filter(admin => !admin.mfaEnabled), 
    [adminRolesData]
  );

  const securityDetails: any = {
    'Secure Score': {
      title: "Security Control Breakdown",
      description: "Overview of all identity security controls evaluated by Microsoft.",
      columns: [
        { title: 'Control', dataIndex: 'control' },
        { 
          title: 'Health', 
          dataIndex: 'pct', 
          render: (pct: number) => <Tag color={pct === 100 ? 'green' : (pct === 0 ? 'red' : 'orange')}>{pct}%</Tag> 
        }
      ],
      data: secureScoreRaw?.controlScores?.map((c: any, i: number) => ({
        key: i,
        control: c.controlName,
        pct: c.scoreInPercentage
      }))
    },
    'Admins without MFA': {
      title: "Critical: Admins at Risk",
      description: "These accounts have administrative privileges but do not have MFA enabled.",
      columns: [
        { title: 'Admin Name', dataIndex: 'name', key: 'name' },
        { title: 'Role', dataIndex: 'role', key: 'role' },
        { 
          title: 'Status', 
          dataIndex: 'status', 
          render: () => <Tag color="red">MFA DISABLED</Tag> 
        }
      ],
      data: adminsWithoutMfa.map((admin, i) => ({
        key: i,
        name: admin.displayName || admin.userPrincipalName,
        role: admin.roleName,
      }))
    },
    'High Severity Issues': {
      title: "Remediation Roadmap",
      description: "Critical gaps detected. Follow these steps to secure the tenant.",
      renderCustom: () => (
        <Collapse accordion ghost>
          {failingControls.map((c: any, i: number) => (
            <Panel header={<Text strong>{c.controlName}</Text>} key={i} extra={<Tag color="red">0%</Tag>}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Alert message="Issue" description={c.implementationStatus} type="error" showIcon />
                {c.remediation && c.remediation !== "No steps found." && (
                  <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
                    <Text strong><BulbOutlined /> Step-by-Step Fix:</Text>
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

  return (
    <div style={{ marginTop: '20px' }}>
      <Title level={4}><SafetyCertificateOutlined /> Identity & Security Posture</Title>
      
      <Row gutter={[12, 12]}>
        {/* 1. Secure Score */}
        <Col xs={12} md={8} lg={4}>
          <Card hoverable onClick={() => setActiveDetail('Secure Score')} style={{ borderTop: '4px solid #faad14' }}>
            <Statistic title="Score" value={overallScore} suffix="%" valueStyle={{ color: '#faad14' }} />
            <Tag color="warning" style={{ marginTop: '8px' }}>Health</Tag>
          </Card>
        </Col>

        {/* 2. Admins without MFA - Swapped to use the adminsWithoutMfa logic */}
        <Col xs={12} md={8} lg={4}>
          <Card hoverable onClick={() => setActiveDetail('Admins without MFA')} style={{ borderTop: '4px solid #cf1322' }}>
            <Statistic title="Admin MFA" value={adminsWithoutMfa.length} prefix={<WarningFilled />} valueStyle={{ color: '#cf1322' }} />
            <Tag color="error" style={{ marginTop: '8px' }}>MFA Alert</Tag>
          </Card>
        </Col>

        {/* 3. High Severity */}
        <Col xs={12} md={8} lg={4}>
          <Card hoverable onClick={() => setActiveDetail('High Severity Issues')} style={{ borderTop: '4px solid #cf1322' }}>
            <Statistic title="High" value={highCount} valueStyle={{ color: '#cf1322' }} />
            <Tag color="error" style={{ marginTop: '8px' }}>Fix Now</Tag>
          </Card>
        </Col>

        {/* 4. Medium Severity */}
        <Col xs={12} md={8} lg={4}>
          <Card hoverable onClick={() => setActiveDetail('Secure Score')} style={{ borderTop: '4px solid #fa8c16' }}>
            <Statistic title="Medium" value={mediumCount} valueStyle={{ color: '#fa8c16' }} />
            <Tag color="volcano" style={{ marginTop: '8px' }}>Priority</Tag>
          </Card>
        </Col>

        {/* 5. Low Severity */}
        <Col xs={12} md={8} lg={4}>
          <Card hoverable onClick={() => setActiveDetail('Secure Score')} style={{ borderTop: '4px solid #52c41a' }}>
            <Statistic title="Low" value={lowCount} valueStyle={{ color: '#52c41a' }} />
            <Tag color="green" style={{ marginTop: '8px' }}>Review</Tag>
          </Card>
        </Col>

        {/* 6. Identity Controls */}
        <Col xs={12} md={8} lg={4}>
          <Card hoverable onClick={() => setActiveDetail('Secure Score')} style={{ borderTop: '4px solid #1890ff' }}>
            <Statistic title="Total" value={secureScoreRaw?.controlScores?.length || 0} valueStyle={{ color: '#1890ff' }} />
            <Tag color="blue" style={{ marginTop: '8px' }}>Checks</Tag>
          </Card>
        </Col>
      </Row>

      <Drawer 
        title={activeDetail} 
        open={!!activeDetail} 
        onClose={() => setActiveDetail(null)} 
        width={550}
      >
        {activeDetail && securityDetails[activeDetail] && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Alert 
              message="Context" 
              description={securityDetails[activeDetail].description} 
              type="info" 
              showIcon 
            />
            {securityDetails[activeDetail].renderCustom ? (
              securityDetails[activeDetail].renderCustom()
            ) : (
              <Table 
                dataSource={securityDetails[activeDetail].data} 
                columns={securityDetails[activeDetail].columns} 
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