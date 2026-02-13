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
  Badge,
  List,
  Divider,
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
  subscriptionId?: string | null; // ✅ ADD THIS
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

  // ----------------------------
  // 1️⃣ Risk Tier Logic
  // ----------------------------
  const riskTier = useMemo(() => {
    if (overallScore >= 75) return { label: "LOW RISK", color: "green" };
    if (overallScore >= 45) return { label: "MODERATE RISK", color: "orange" };
    return { label: "HIGH RISK", color: "red" };
  }, [overallScore]);

  // ----------------------------
  // 2️⃣ Severity Breakdown
  // ----------------------------
  const severityStats = useMemo(() => {
    return {
      high: allAssessments.filter(
        (a) => a.properties?.metadata?.severity === "High"
      ).length,
      medium: allAssessments.filter(
        (a) => a.properties?.metadata?.severity === "Medium"
      ).length,
      low: allAssessments.filter(
        (a) => a.properties?.metadata?.severity === "Low"
      ).length,
    };
  }, [allAssessments]);

  // ----------------------------
  // 3️⃣ Identity Risk
  // ----------------------------
  const identityStats = useMemo(() => {
    const totalAdmins = adminRolesData.length;
    const mfaDisabled = adminRolesData.filter((a) => !a.mfaEnabled).length;
    return { totalAdmins, mfaDisabled };
  }, [adminRolesData]);

  // ----------------------------
  // 4️⃣ Compliance Maturity
  // ----------------------------
  const complianceData = useMemo(() => {
    return scoreControls.map((c: any, index: number) => {
      const percent = Math.round(
        (c.properties?.score?.percentage || 0) * 100
      );
      return {
        key: index,
        domain: c.properties?.displayName,
        percent,
        unhealthy: c.properties?.unhealthyResourceCount || 0,
      };
    });
  }, [scoreControls]);

  // ----------------------------
  // 5️⃣ Top 5 Critical Recommendations
  // ----------------------------
  const topRecommendations = useMemo(() => {
    return recommendationsData.slice(0, 5);
  }, [recommendationsData]);

  return (
    <div style={{ marginTop: 24 }}>
      {/* ========================= */}
      {/* EXECUTIVE HEADER */}
      {/* ========================= */}

      <Card
        style={{
          borderRadius: 12,
          marginBottom: 16,
          borderLeft: `6px solid ${
            riskTier.color === "red"
              ? "#ff4d4f"
              : riskTier.color === "orange"
              ? "#faad14"
              : "#52c41a"
          }`,
        }}
      >
        <Title level={4}>
          <SafetyCertificateOutlined /> Security Posture Overview
        </Title>

        <Tag
          color={riskTier.color}
          style={{ fontSize: 14, padding: "4px 12px" }}
        >
          {riskTier.label}
        </Tag>

        <Text style={{ marginLeft: 12 }}>
          Secure Score: <strong>{overallScore}%</strong> (
          {secureScoreRaw?.current || 0}/{secureScoreRaw?.max || 0} pts)
        </Text>
      </Card>

      {/* ========================= */}
      {/* KPI CARDS */}
      {/* ========================= */}

      <Row gutter={[16, 16]}>
        {/* Secure Score */}
        <Col xs={24} md={8}>
          <Card hoverable loading={loading} onClick={() => setActiveDrawer("governance")} style={{ borderRadius: 12 }}>
            <Title level={5}>
              <RocketOutlined /> Secure Score
            </Title>

            <Progress
              type="circle"
              percent={overallScore}
              width={100}
              strokeColor={
                riskTier.color === "red"
                  ? "#ff4d4f"
                  : riskTier.color === "orange"
                  ? "#faad14"
                  : "#52c41a"
              }
            />
          </Card>
        </Col>

        {/* Critical Risks */}
        <Col xs={12} md={4}>
          <Card hoverable loading={loading}>
            <Statistic
              title="Critical Findings"
              value={severityStats.high}
              prefix={<WarningOutlined />}
              valueStyle={{ color: "#ff4d4f" }}
            />
          </Card>
        </Col>

        {/* Compliance Gaps */}
        <Col xs={12} md={4}>
          <Card hoverable loading={loading}>
            <Statistic
              title="Failed Controls"
              value={failedControlsData.length}
              prefix={<AuditOutlined />}
              valueStyle={{ color: "#fa541c" }}
            />
          </Card>
        </Col>

        {/* Identity Risk */}
        <Col xs={12} md={4}>
          <Card hoverable loading={loading}>
            <Statistic
              title="Privileged Admins"
              value={identityStats.totalAdmins}
              prefix={<UserOutlined />}
            />
            <Text type={identityStats.mfaDisabled > 0 ? "danger" : "secondary"}>
              {identityStats.mfaDisabled} Without MFA
            </Text>
          </Card>
        </Col>

        {/* Recommendations */}
        <Col xs={12} md={4}>
          <Card hoverable loading={loading}>
            <Statistic
              title="Open Recommendations"
              value={recommendationsData.length}
              prefix={<BulbOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* ========================= */}
      {/* COMPLIANCE MATURITY */}
      {/* ========================= */}

      <Divider />

      <Title level={5}>Compliance Maturity by Domain</Title>

      <Table
        dataSource={complianceData}
        pagination={false}
        size="small"
        columns={[
          { title: "Domain", dataIndex: "domain" },
          {
            title: "Maturity",
            dataIndex: "percent",
            render: (p: number) => (
              <Progress
                percent={p}
                size="small"
                status={p === 100 ? "success" : "normal"}
              />
            ),
          },
          {
            title: "Resources at Risk",
            dataIndex: "unhealthy",
            render: (u: number) => (
              <Badge
                count={u}
                color={u > 0 ? "#ff4d4f" : "#52c41a"}
              />
            ),
          },
        ]}
      />

      {/* ========================= */}
      {/* PRIORITIZED ACTION PLAN */}
      {/* ========================= */}

      <Divider />

      <Title level={5}>Top Priority Remediation Actions</Title>

      <List
        dataSource={topRecommendations}
        renderItem={(item: any, index) => (
          <List.Item>
            <List.Item.Meta
              title={
                <Text strong>
                  {index + 1}. {item.RecommendationName || item.Finding}
                </Text>
              }
              description={item.Description}
            />
          </List.Item>
        )}
      />

      {/* ========================= */}
      {/* DRAWER DETAILS */}
      {/* ========================= */}

      <Drawer
        title="Security Details"
        width={900}
        open={!!activeDrawer}
        onClose={() => setActiveDrawer(null)}
      >
        <Table
          dataSource={allAssessments}
          size="small"
          columns={[
            {
              title: "Assessment",
              dataIndex: ["properties", "metadata", "displayName"],
            },
            {
              title: "Severity",
              dataIndex: ["properties", "metadata", "severity"],
              render: (sev: string) => (
                <Tag
                  color={
                    sev === "High"
                      ? "red"
                      : sev === "Medium"
                      ? "orange"
                      : "green"
                  }
                >
                  {sev}
                </Tag>
              ),
            },
            {
              title: "Status",
              dataIndex: ["properties", "status", "code"],
              render: (st: string) => (
                <Tag color={st === "Healthy" ? "green" : "red"}>
                  {st}
                </Tag>
              ),
            },
          ]}
        />
      </Drawer>
    </div>
  );
};
