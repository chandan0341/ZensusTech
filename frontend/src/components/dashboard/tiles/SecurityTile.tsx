import { useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, Typography, Tag, Drawer, Table, Collapse, Progress } from 'antd';
import { 
  WarningFilled, SafetyCertificateOutlined, DatabaseOutlined, 
  GlobalOutlined, UserOutlined, BulbOutlined 
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Panel } = Collapse;

// The "Contract" - Matches exactly what Dashboard sends
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

  const adminsWithoutMfa = useMemo(() => 
    adminRolesData?.filter(admin => !admin.mfaEnabled) || [], 
    [adminRolesData]
  );

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
    { 
      title: 'Control ID', 
      dataIndex: 'name', 
      key: 'name', 
      width: '15%',
      render: (text: string) => <Tag color="blue">{text}</Tag>
    },
    { 
      title: 'Description', 
      dataIndex: 'description', 
      key: 'description',
      width: '55%',
      render: (text: string) => <Text strong>{text}</Text>
    }, 
    { 
      title: 'Assessments (F/P)', 
      key: 'stats',
      width: '30%',
      render: (_: any, record: any) => (
        <span>
          <Tag color="red">{record.failed} Failed</Tag>
          <Tag color="green">{record.passed} Passed</Tag>
        </span>
      )
    }
  ],
  // Mapping based on your provided JSON structure
  data: failedControlsData.map((item, i) => ({ 
    key: i, 
    name: item.name, // "AM.1"
    description: item.properties?.description || "No description available", // "Track asset inventory..."
    failed: item.properties?.failedAssessments || 0, //
    passed: item.properties?.passedAssessments || 0  //
  }))
},
    'Recommendations': {
  title: "Action Plan",
  renderCustom: () => {
    console.log("DEBUG: Confirmed Structure:", recommendationsData);

    return (
      <Collapse accordion ghost>
        {recommendationsData.map((rec: any, i: number) => {
          // Mapping based on the JSON you just shared
          const title = rec.Finding || rec.RecommendationName || "Review Security Control";
          const severity = rec.Severity || "Unknown";
          const category = rec.Category || "General";
          
          return (
            <Panel 
              header={<Text strong>{title}</Text>} 
              key={i} 
              extra={<Tag color={severity === 'High' ? 'red' : 'orange'}>{severity}</Tag>}
            >
              <div style={{ padding: '4px 0' }}>
                <Text type="secondary">Category: </Text><Tag>{category}</Tag>
              </div>
              <p style={{ color: '#595959', marginTop: '8px' }}>
                This control was flagged in the {category} category. Please review your Azure policy settings to resolve this finding.
              </p>
            </Panel>
          );
        })}
      </Collapse>
    );
  }
}
  }), [networkData, dataSecData, recommendationsData, failedControlsData]);

  return (
    <div style={{ marginTop: '20px' }}>
      <Title level={4}><SafetyCertificateOutlined style={{ color: '#52c41a' }} /> Security Command Center</Title>
      <Row gutter={[12, 12]}>
        {/* Score Card */}
        <Col xs={12} lg={4}>
          <Card loading={loading} style={{ borderTop: '4px solid #1890ff' }}>
            <Statistic title="Score" value={overallScore || 0} suffix="%" />
            {secureScoreRaw && <Text type="secondary" style={{fontSize: '11px'}}>{secureScoreRaw.current} / {secureScoreRaw.max} pts</Text>}
            <Progress percent={overallScore} size="small" showInfo={false} />
          </Card>
        </Col>

        {/* Dynamic Tiles */}
        {[
          { label: 'Network', val: networkData.length, icon: <GlobalOutlined />, color: '#13c2c2', key: 'Network' },
          { label: 'Data Risks', val: dataSecData.length, icon: <DatabaseOutlined />, color: '#fa8c16', key: 'Data' },
          { label: 'Quick Fixes', val: recommendationsData.length, icon: <BulbOutlined />, color: '#52c41a', key: 'Recommendations' },
          { label: 'MFA Gaps', val: adminsWithoutMfa.length, icon: <UserOutlined />, color: '#722ed1', key: 'Identity' },
          { label: 'Critical Fails', val: kpiData.totalFailedControls || failedControlsData.length, icon: <WarningFilled />, color: '#cf1322', key: 'Critical' },
        ].map(tile => (
          <Col xs={12} lg={4} key={tile.key}>
            <Card hoverable onClick={() => setActiveDetail(tile.key)} style={{ borderTop: `4px solid ${tile.color}` }}>
              <Statistic title={tile.label} value={isSubSelected ? tile.val : 0} prefix={tile.icon} />
            </Card>
          </Col>
        ))}
      </Row>

      <Drawer title={activeDetail ? securityDetails[activeDetail]?.title : ''} open={!!activeDetail} onClose={() => setActiveDetail(null)} width={700}>
        {activeDetail && (securityDetails[activeDetail]?.renderCustom ? securityDetails[activeDetail].renderCustom() : <Table dataSource={securityDetails[activeDetail]?.data} columns={securityDetails[activeDetail]?.columns} />)}
      </Drawer>
    </div>
  );
};