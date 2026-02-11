import { useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, Typography, Tag, Drawer, Table, Tabs, Progress, Badge, List } from 'antd';
import { 
  GlobalOutlined, DatabaseOutlined,  
  RocketOutlined, BulbOutlined,
  SafetyCertificateOutlined, UserOutlined,
  WarningOutlined, InfoCircleOutlined,
  SafetyOutlined, AuditOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface SecurityTileProps {
  overallScore: number;
  secureScoreRaw: any;
  networkData: any[];
  dataSecData: any[];
  recommendationsData: any[];
  failedControlsData: any[];
  scoreControls: any[];
  kpiData: any;
  allAssessments: any[];
  adminRolesData: any[];
  loading: boolean;
  subscriptionId?: string | null;
}

export const SecurityTile = ({ 
  overallScore, secureScoreRaw, networkData, dataSecData, 
  recommendationsData, failedControlsData, scoreControls, 
  kpiData, allAssessments, adminRolesData, loading 
}: SecurityTileProps) => {
  const [activeDetail, setActiveDetail] = useState<string | null>(null);

  // --- MAP TECHNICAL PILLARS (The "Why" behind the 12%) ---
  const mappedPillarData = useMemo(() => {
    return (scoreControls || []).map((item, index) => ({
      key: index,
      name: item.properties?.displayName || 'Unknown Control',
      current: item.properties?.score?.current || 0,
      max: item.properties?.score?.max || 0,
      percentage: Math.round((item.properties?.score?.percentage || 0) * 100),
      unhealthy: item.properties?.unhealthyResourceCount || 0
    }));
  }, [scoreControls]);

  const identityStats = useMemo(() => {
    const totalAdmins = adminRolesData.length;
    const mfaDisabled = adminRolesData.filter(a => !a.mfaEnabled).length;
    return { totalAdmins, mfaDisabled };
  }, [adminRolesData]);

  const severityBreakdown = useMemo(() => {
    return {
      high: allAssessments.filter(a => a.properties?.metadata?.severity === 'High').length,
      medium: allAssessments.filter(a => a.properties?.metadata?.severity === 'Medium').length,
    };
  }, [allAssessments]);

  const securityDetails: Record<string, any> = useMemo(() => ({
    'Governance': {
      title: "Security Posture & Compliance Audit",
      render: () => (
        <Tabs 
          defaultActiveKey="1"
          items={[
            {
              key: '1', 
              label: (<span><RocketOutlined /> Technical Pillars</span>), 
              children: (
                <Table 
                  dataSource={mappedPillarData} 
                  size="small" 
                  pagination={{pageSize: 8}} 
                  columns={[
                    { title: 'Security Domain', dataIndex: 'name', width: '35%' },
                    { 
                      title: 'Score Contribution', 
                      key: 'score',
                      render: (record) => (
                        <Text strong>
                          {record.current} / {record.max} 
                          <Text type="secondary" style={{ fontSize: '10px', marginLeft: '4px' }}>pts</Text>
                        </Text>
                      ) 
                    },
                    { 
                      title: 'Health', 
                      dataIndex: 'percentage', 
                      render: (p) => <Progress percent={p} size="small" status={p === 100 ? 'success' : 'normal'} /> 
                    },
                    { 
                      title: 'Resources at Risk', 
                      dataIndex: 'unhealthy', 
                      render: (u) => <Badge count={u} color={u > 0 ? '#ff4d4f' : '#52c41a'} /> 
                    }
                  ]} 
                />
              )
            },
            {
              key: '2', 
              label: (<span><AuditOutlined /> Regulatory Compliance</span>), 
              children: (
                <Table 
                  dataSource={failedControlsData} 
                  size="small" 
                  pagination={{ pageSize: 7 }}
                  expandable={{
                    expandedRowRender: (record) => (
                      <div style={{ padding: '10px 20px', background: '#fafafa', borderLeft: '3px solid #1890ff' }}>
                        <Text type="secondary"><InfoCircleOutlined /> <strong>Compliance Resource Path:</strong></Text>
                        <br />
                        <Text code style={{ fontSize: '11px' }}>{record.id}</Text>
                      </div>
                    ),
                  }}
                  columns={[
                    { 
                      title: 'Control ID', 
                      dataIndex: 'name', 
                      width: '120px',
                      render: (name) => <Tag color="blue" style={{ fontWeight: 'bold' }}>{name}</Tag> 
                    },
                    { 
                      title: 'Requirement Description', 
                      dataIndex: ['properties', 'description'],
                      render: (desc) => <Text style={{ fontSize: '13px' }}>{desc}</Text>
                    },
                    { 
                      title: 'Assessment Ratio', 
                      key: 'health',
                      width: '200px',
                      render: (record) => {
                        const passed = record.properties?.passedAssessments || 0;
                        const failed = record.properties?.failedAssessments || 0;
                        const total = passed + failed;
                        const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
                        return (
                          <div style={{ minWidth: '150px' }}>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                              <Badge status="success" text={`${passed} P`} />
                              <Badge status="error" text={`${failed} F`} />
                            </div>
                            <Progress percent={rate} size="small" showInfo={false} strokeColor={rate === 100 ? '#52c41a' : '#faad14'} />
                          </div>
                        );
                      }
                    },
                    { 
                      title: 'Status', 
                      dataIndex: ['properties', 'state'],
                      width: '120px',
                      render: (state) => (
                        <Tag 
                          icon={state === 'Passed' ? <SafetyOutlined /> : <WarningOutlined />}
                          color={state === 'Passed' ? 'success' : 'error'}
                          style={{ borderRadius: '10px', width: '90px', textAlign: 'center' }}
                        >
                          {state.toUpperCase()}
                        </Tag>
                      )
                    }
                  ]} 
                />
              )
            }
          ]} 
        />
      )
    },
    'Inventory': {
      title: "Technical Risk Inventory",
      render: () => (
        <Table dataSource={allAssessments} size="small" columns={[
          { title: 'Assessment', dataIndex: ['properties', 'metadata', 'displayName'] },
          { title: 'Resource', dataIndex: ['properties', 'resourceDetails', 'Id'], render: (id) => <Text code>{id.split('/').pop()}</Text> },
          { title: 'Status', dataIndex: ['properties', 'status', 'code'], render: (st) => <Tag color={st === 'Healthy' ? 'green' : 'red'}>{st}</Tag> }
        ]} />
      )
    },
    'Identity': {
      title: "Admin & Role Security",
      render: () => (
        <Table dataSource={adminRolesData} size="small" columns={[
          { title: 'User', dataIndex: 'userPrincipalName' },
          { title: 'MFA Status', dataIndex: 'mfaEnabled', render: (mfa) => <Tag color={mfa ? 'green' : 'volcano'}>{mfa ? 'Protected' : 'Risk'}</Tag> }
        ]} />
      )
    }
  }), [mappedPillarData, failedControlsData, allAssessments, adminRolesData]);

  const tiles = [
    { label: 'Secure Score', val: overallScore, icon: <RocketOutlined />, key: 'Governance', extra: `${secureScoreRaw?.current || 0}/${secureScoreRaw?.max || 0} Pts` },
    { label: 'Critical Risks', val: severityBreakdown.high, icon: <WarningOutlined />, key: 'Inventory', extra: `${kpiData?.totalFailedControls || 0} Total Fails` },
    { label: 'Admin Safety', val: identityStats.totalAdmins, icon: <UserOutlined />, key: 'Identity', extra: `${identityStats.mfaDisabled} Missing MFA` },
    { label: 'Network Gaps', val: networkData.length, icon: <GlobalOutlined />, key: 'Inventory', extra: 'Perimeter Security' },
    { label: 'Data Security', val: dataSecData.length, icon: <DatabaseOutlined />, key: 'Inventory', extra: 'Encryption/Storage' },
    { label: 'Remediation', val: recommendationsData.length, icon: <BulbOutlined />, key: 'Inventory', extra: 'Actionable Steps' },
  ];

  return (
    <div style={{ marginTop: '20px' }}>
      <Title level={4}><SafetyCertificateOutlined style={{ color: '#52c41a' }} /> Infrastructure Security Posture</Title>
      
      <Row gutter={[12, 12]}>
        {tiles.map(tile => (
          <Col xs={12} lg={4} key={tile.label}>
            <Card hoverable loading={loading} onClick={() => setActiveDetail(tile.key)} style={{ borderTop: '4px solid #1890ff', borderRadius: '8px' }}>
              <Statistic title={<Text type="secondary" style={{fontSize: '11px'}}>{tile.label}</Text>} value={tile.val} suffix={tile.label.includes('Score') ? "%" : ""} prefix={tile.icon} />
              <div style={{ marginTop: '4px' }}>
                <Text type="secondary" style={{ fontSize: '10px' }}>{tile.extra}</Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Drawer title={activeDetail} open={!!activeDetail} onClose={() => setActiveDetail(null)} width={1000}>
        {activeDetail && securityDetails[activeDetail] ? (
          securityDetails[activeDetail].render()
        ) : (
          <List dataSource={recommendationsData} renderItem={(item: any) => (
            <List.Item><List.Item.Meta title={item.RecommendationName || item.Finding} description={item.Description} /></List.Item>
          )} />
        )}
      </Drawer>
    </div>
  );
};