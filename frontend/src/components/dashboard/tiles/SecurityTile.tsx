import { useState, useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Tag,
  Drawer,
  Table,
  Progress,
  List
} from "antd";
import {
  RocketOutlined,
  WarningOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  BulbOutlined,
  AuditOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

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
  overallScore,
  secureScoreRaw,
  recommendationsData,
  failedControlsData,
  scoreControls,
  allAssessments,
  adminRolesData,
  loading,
}: SecurityTileProps) => {
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);

  // 1️⃣ Risk Tier Logic
  const riskTier = useMemo(() => {
    if (overallScore >= 75) return { label: "LOW RISK", color: "green", hex: "#52c41a" };
    if (overallScore >= 45) return { label: "MODERATE RISK", color: "orange", hex: "#faad14" };
    return { label: "HIGH RISK", color: "red", hex: "#ff4d4f" };
  }, [overallScore]);

  // 2️⃣ Severity Parsing
  const severityStats = useMemo(() => {
    const stats = { high: 0, medium: 0, low: 0 };
    (allAssessments || []).forEach((a) => {
      const topSev = a.properties?.metadata?.severity;
      if (topSev === "High") stats.high++;
      try {
        const cves = JSON.parse(a.properties?.additionalData?.CvesDetails || "[]");
        if (cves.some((c: any) => c.Severity === "High")) stats.high++;
      } catch (e) { /* ignore */ }
    });
    return stats;
  }, [allAssessments]);

  // 3️⃣ Configuration for click-to-drawer mapping
  const tiles = [
    { 
        id: "governance", 
        title: "Secure Score", 
        value: overallScore, 
        prefix: <RocketOutlined />, 
        color: riskTier.hex, 
        isProgress: true, 
        extra: `${secureScoreRaw?.current || 0}/${secureScoreRaw?.max || 0} pts` 
    },
    { 
        id: "inventory", 
        title: "Critical Findings", 
        value: severityStats.high, 
        prefix: <WarningOutlined />, 
        color: "#ff4d4f",
        extra: "High Severity Issues" 
    },
    { 
        id: "compliance", 
        title: "Failed Controls", 
        value: failedControlsData?.length || 0, 
        prefix: <AuditOutlined />, 
        color: "#fa541c",
        extra: "Policy Violations" 
    },
    { 
        id: "identity", 
        title: "Privileged Admins", 
        value: adminRolesData?.length || 0, 
        prefix: <UserOutlined />, 
        color: "#1890ff",
        extra: `${adminRolesData?.filter(a => !a.mfaEnabled).length} No MFA` 
    },
    { 
        id: "actions", 
        title: "Open Actions", 
        value: recommendationsData?.length || 0, 
        prefix: <BulbOutlined />, 
        color: "#722ed1",
        extra: "Remediation Steps" 
    }
  ];

  // 4️⃣ Updated Content Switcher
  const renderDrawerContent = () => {
    if (!activeDrawer) return null;

    switch (activeDrawer) {
      case "governance":
        return (
          <Table 
            dataSource={scoreControls} 
            size="small" 
            columns={[
              { title: 'Domain', dataIndex: ['properties', 'displayName'] },
              { title: 'Score', render: (r) => `${r.properties?.score?.current} / ${r.properties?.score?.max}` },
              { title: 'Health', render: (r) => <Progress percent={Math.round(r.properties?.score?.percentage * 100)} size="small" /> }
            ]}
          />
        );
      case "inventory":
        return (
          <Table 
            dataSource={allAssessments} 
            size="small" 
            columns={[
              { title: 'Resource', render: (r) => r.properties?.resourceDetails?.ResourceName || 'Global' },
              { title: 'Finding', dataIndex: ['properties', 'metadata', 'displayName'] },
              { title: 'Severity', dataIndex: ['properties', 'metadata', 'severity'], render: (s) => <Tag color={s === 'High' ? 'red' : 'orange'}>{s}</Tag> }
            ]}
          />
        );
      case "compliance":
        return (
          <Table 
            dataSource={failedControlsData} 
            size="small" 
            columns={[
              { title: 'Control', dataIndex: 'name' },
              { title: 'Description', dataIndex: ['properties', 'description'], ellipsis: true },
              { title: 'Status', render: () => <Tag color="red">FAILED</Tag> }
            ]}
          />
        );
      case "identity":
        return (
          <Table 
            dataSource={adminRolesData} 
            size="small" 
            columns={[
              { title: 'User Principal', dataIndex: 'userPrincipalName' },
              { title: 'MFA', dataIndex: 'mfaEnabled', render: (mfa) => <Tag color={mfa ? 'green' : 'red'}>{mfa ? 'Active' : 'Missing'}</Tag> }
            ]}
          />
        );
      case "actions":
        return (
          <List 
            itemLayout="horizontal"
            dataSource={recommendationsData} 
            renderItem={(item: any) => (
              <List.Item>
                <List.Item.Meta title={item.RecommendationName} description={item.Description} />
              </List.Item>
            )} 
          />
        );
      default:
        return <Text>No details available for this section.</Text>;
    }
  };

  return (
    <div style={{ marginTop: 24 }}>
      <Card style={{ borderRadius: 12, marginBottom: 16, borderLeft: `6px solid ${riskTier.hex}` }}>
        <Title level={4}><SafetyCertificateOutlined /> Security Posture Overview</Title>
        <Tag color={riskTier.color} style={{ fontSize: 14, padding: "4px 12px" }}>{riskTier.label}</Tag>
        <Text style={{ marginLeft: 12 }}>Secure Score: <strong>{overallScore}%</strong></Text>
      </Card>

      <Row gutter={[16, 16]}>
        {tiles.map((tile) => (
          <Col xs={24} md={tile.id === "governance" ? 8 : 4} key={tile.id}>
            <Card 
              hoverable 
              loading={loading} 
              // We use a wrapper function to ensure state updates
              onClick={() => {
                console.log("Opening drawer for:", tile.id);
                setActiveDrawer(tile.id);
              }} 
              style={{ 
                borderRadius: 12, 
                borderTop: `4px solid ${tile.color}`, 
                height: '100%',
                cursor: 'pointer' 
              }}
              // bodyStyle helps ensure the click hits the whole card area
              bodyStyle={{ height: '100%' }}
            >
              {tile.isProgress ? (
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>{tile.title}</Text>
                  <br />
                  <Progress type="circle" percent={Number(tile.value)} width={80} strokeColor={tile.color} />
                  <br />
                  <Text strong style={{ fontSize: 10 }}>{tile.extra}</Text>
                </div>
              ) : (
                <div style={{ pointerEvents: 'none' }}> 
                  {/* pointerEvents: none on children ensures the card gets the click */}
                  <Statistic 
                    title={<Text type="secondary" style={{ fontSize: 11 }}>{tile.title}</Text>} 
                    value={tile.value} 
                    prefix={tile.prefix} 
                    valueStyle={{ color: tile.color }} 
                  />
                  <Text type="secondary" style={{ fontSize: 10 }}>{tile.extra}</Text>
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <Drawer 
        title={`${activeDrawer?.replace(/^\w/, (c) => c.toUpperCase())} Details`} 
        width={950} 
        open={!!activeDrawer} 
        onClose={() => setActiveDrawer(null)}
        destroyOnClose={true} // Forces clean re-render when switching cards
      >
        {renderDrawerContent()}
      </Drawer>
    </div>
  );
};