import { useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, Typography, Tag, Drawer, Table, Collapse, Progress, Badge, Space } from 'antd';
import { 
  WarningFilled, SafetyCertificateOutlined, DatabaseOutlined, 
  GlobalOutlined, UserOutlined, BulbOutlined, RocketOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Panel } = Collapse;

interface SecurityTileProps {
  networkData: any[];
  dataSecData: any[];
  recommendationsData: any[];
  failedControlsData: any[];
  kpiData: any;
  adminRolesData: any[];
  overallScore: number;
  secureScoreRaw: any;
  loading: boolean;
  subscriptionId?: string | null;
}

export const SecurityTile = ({ 
  networkData, dataSecData, recommendationsData, failedControlsData,
  kpiData, adminRolesData, overallScore, secureScoreRaw, 
  loading, subscriptionId 
}: SecurityTileProps) => {
  const [activeDetail, setActiveDetail] = useState<string | null>(null);
  const isSubSelected = !!subscriptionId;
  const sortedData = [...failedControlsData].sort((a, b) => {
  const aFailed = a.properties?.failedAssessments || 0;
  const bFailed = b.properties?.failedAssessments || 0;
  return bFailed - aFailed; // Highest failures first
});


  const adminsWithoutMfa = useMemo(() => 
    adminRolesData?.filter(admin => !admin.mfaEnabled) || [], 
    [adminRolesData]
  );

  // Helper to match the clean colors from your screenshots
  const getTileStyle = (key: string) => {
    const styles: Record<string, { color: string, bg: string }> = {
      'Score':           { color: '#1890ff', bg: '#e6f7ff' }, // Blue
      'Network':         { color: '#13c2c2', bg: '#e6fffb' }, // Cyan
      'Data':            { color: '#fa8c16', bg: '#fff7e6' }, // Orange
      'Recommendations': { color: '#52c41a', bg: '#f6ffed' }, // Green
      'Identity':        { color: '#722ed1', bg: '#f9f0ff' }, // Purple
      'Critical':        { color: '#cf1322', bg: '#fff1f0' }, // Red
    };
    return styles[key] || { color: '#d9d9d9', bg: '#ffffff' };
  };

  const securityDetails: Record<string, any> = useMemo(() => ({
    'Network': {
      title: "Network Security Findings",
      columns: [{ title: 'Finding', dataIndex: 'Finding' }, { title: 'Severity', dataIndex: 'Severity', render: (s:any) => <Tag color="orange">{s}</Tag>}],
      data: networkData.map((item, i) => ({ ...item, key: i }))
    },
    'Data': {
      title: "Data & Storage Risks",
      columns: [{ title: 'Finding', dataIndex: 'Finding' }, { title: 'Severity', dataIndex: 'Severity', render: (s:any) => <Tag color="red">{s}</Tag>}],
      data: dataSecData.map((item, i) => ({ ...item, key: i }))
    },
    'Critical': {
      title: "Critical Failed Controls",
      columns: [
        { title: 'Control ID', dataIndex: 'name', width: '15%', render: (text: string) => <Tag color="blue">{text}</Tag> },
        { title: 'Description', dataIndex: 'description', width: '55%', render: (text: string) => <Text strong>{text}</Text> }, 
        { 
          title: 'Assessments (F/P)', 
          render: (record: any) => (
            <Space>
              <Badge status="error" text={`${record.failed} Failed`} />
              <Badge status="success" text={`${record.passed} Passed`} />
            </Space>
          )
        }
      ],
      
      data: sortedData.map((item, i) => ({ 
        key: i, 
        name: item.name, 
        description: item.properties?.description || "No description available", 
        failed: item.properties?.failedAssessments || 0, 
        passed: item.properties?.passedAssessments || 0  
      }))
    },
    'Recommendations': {
      title: "Action Plan",
      renderCustom: () => (
        <Collapse accordion ghost>
          {recommendationsData.map((rec: any, i: number) => (
            <Panel 
              header={<Text strong>{rec.Finding || rec.RecommendationName || "Security Control"}</Text>} 
              key={i} 
              extra={<Tag color={rec.Severity === 'High' ? 'red' : 'orange'}>{rec.Severity}</Tag>}
            >
              <p style={{ color: '#595959' }}>Review your Azure policy settings in the {rec.Category || 'General'} category to resolve this finding.</p>
            </Panel>
          ))}
        </Collapse>
      )
    }
  }), [networkData, dataSecData, recommendationsData, sortedData]);

  const tiles = [
    { label: 'Score', val: overallScore, icon: <RocketOutlined />, key: 'Score', isScore: true },
    { label: 'Network', val: networkData.length, icon: <GlobalOutlined />, key: 'Network' },
    { label: 'Data Risks', val: dataSecData.length, icon: <DatabaseOutlined />, key: 'Data' },
    { label: 'Quick Fixes', val: recommendationsData.length, icon: <BulbOutlined />, key: 'Recommendations' },
    { label: 'MFA Gaps', val: adminsWithoutMfa.length, icon: <UserOutlined />, key: 'Identity' },
    { label: 'Critical Fails', val: kpiData.totalFailedControls || failedControlsData.length, icon: <WarningFilled />, key: 'Critical' },
  ];

  return (
    <div style={{ marginTop: '20px', padding: '0 10px' }}>
      <Title level={4}><SafetyCertificateOutlined style={{ color: '#52c41a' }} /> Security Command Center</Title>
      
      <Row gutter={[12, 12]}>
        {tiles.map(tile => {
          const style = getTileStyle(tile.key);
          return (
            <Col xs={12} lg={4} key={tile.key}>
              <Card 
                hoverable 
                loading={loading}
                onClick={() => !tile.isScore && setActiveDetail(tile.key)} 
                style={{ 
                  borderRadius: '8px', 
                  borderTop: `4px solid ${style.color}`,
                  background: '#fff' // Clean white background
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <Statistic 
                  title={<Text type="secondary" style={{ fontSize: '12px' }}>{tile.label.toUpperCase()}</Text>} 
                  value={isSubSelected || tile.isScore ? tile.val : 0} 
                  suffix={tile.isScore ? "%" : ""}
                  prefix={<span style={{ color: style.color }}>{tile.icon}</span>}
                  valueStyle={{ fontSize: '24px', fontWeight: 700 }}
                />
                
                {tile.isScore && secureScoreRaw ? (
                   <div style={{ marginTop: '8px' }}>
                     <Text style={{ fontSize: '10px' }} type="secondary">{secureScoreRaw.current} / {secureScoreRaw.max} pts</Text>
                     <Progress percent={overallScore} size="small" strokeColor={style.color} showInfo={false} />
                   </div>
                ) : (
                  <div style={{ height: '4px', background: '#f0f0f0', marginTop: '16px', borderRadius: '2px' }}>
                    <div style={{ height: '100%', width: isSubSelected ? '60%' : '0%', background: style.color, borderRadius: '2px' }} />
                  </div>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>

      <Drawer 
        title={activeDetail ? securityDetails[activeDetail]?.title : ''} 
        open={!!activeDetail} 
        onClose={() => setActiveDetail(null)} 
        width={750}
        headerStyle={{ borderBottom: `4px solid ${activeDetail ? getTileStyle(activeDetail).color : '#eee'}` }}
      >
        {activeDetail && (
          securityDetails[activeDetail]?.renderCustom 
            ? securityDetails[activeDetail].renderCustom() 
            : <Table dataSource={securityDetails[activeDetail]?.data} columns={securityDetails[activeDetail]?.columns} pagination={{ pageSize: 8 }} />
        )}
      </Drawer>
    </div>
  );
};