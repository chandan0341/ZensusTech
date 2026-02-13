import { useState, useMemo } from "react";
import {
  Card, Row, Col, Statistic, Typography, Tag, Drawer, Table,
  Progress, Space, Badge, Tooltip
} from "antd";
import {
  RocketOutlined, WarningOutlined, SafetyCertificateOutlined,
  UserOutlined, BulbOutlined, AuditOutlined, InfoCircleOutlined,
  FileProtectOutlined, CheckCircleOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;

interface SecurityTileProps {
  overallScore: number;
  secureScoreRaw: any;
  networkData: any[];
  dataSecData: any[];
  failedControlsData: any[];
  recommendationsData: any;
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
  failedControlsData,
  scoreControls,
  allAssessments,
  adminRolesData,
  loading,
}: SecurityTileProps) => {
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);

  // Core Math Logic
  const currentPoints = secureScoreRaw?.current || 0;
  const maxPoints = secureScoreRaw?.max || 0;
  const industryStandard = 80;
  const gapToStandard = Math.max(0, industryStandard - overallScore);
  const targetPoints = Math.ceil(maxPoints * (industryStandard / 100));
  const pointsNeeded = Math.max(0, targetPoints - currentPoints);

  const riskTier = useMemo(() => {
    if (overallScore >= 75) return { label: "LOW RISK", color: "green", hex: "#52c41a" };
    if (overallScore >= 45) return { label: "MODERATE RISK", color: "orange", hex: "#faad14" };
    return { label: "HIGH RISK", color: "red", hex: "#ff4d4f" };
  }, [overallScore]);

  const openActionsCount = useMemo(() => {
    return (allAssessments || []).filter(asm => 
      asm.properties?.status?.code === 'Unhealthy' && 
      asm.properties?.metadata?.severity !== 'High'
    ).length;
  }, [allAssessments]);

  const criticalFindings = useMemo(() => {
    const findings: any[] = [];
    (allAssessments || []).forEach((assessment) => {
      let cves = [];
      try {
        cves = JSON.parse(assessment.properties?.additionalData?.CvesDetails || "[]");
      } catch (e) { cves = []; }

      if (cves.length > 0) {
        cves.forEach((cve: any) => {
          if (cve.Severity === "High") {
            findings.push({
              id: `${assessment.id}-${cve.CveId}`,
              resource: assessment.properties?.resourceDetails?.ResourceName,
              software: assessment.properties?.additionalData?.SoftwareName || "System",
              cveId: cve.CveId,
              severity: "High",
              remediation: cve.ExtendedDescription?.Remediation,
              impact: cve.ExtendedDescription?.Impact,
              fixedVersion: cve.FixedVersion
            });
          }
        });
      } else if (assessment.properties?.metadata?.severity === "High") {
        findings.push({
          id: assessment.id,
          resource: assessment.properties?.resourceDetails?.ResourceName,
          software: assessment.properties?.additionalData?.SoftwareName || "Azure Resource",
          cveId: assessment.properties?.displayName || "High Risk Finding",
          severity: "High",
          remediation: "Review Azure Security Center",
          impact: "Critical vulnerability detected."
        });
      }
    });
    return findings;
  }, [allAssessments]);

  const tiles = [
    { id: "governance", title: "Secure Score", value: overallScore, prefix: <RocketOutlined />, color: riskTier.hex, isProgress: true, extra: `${currentPoints}/${maxPoints} pts` },
    { id: "inventory", title: "Critical Findings", value: criticalFindings.length, prefix: <WarningOutlined />, color: "#ff4d4f", extra: "High Severity Issues" },
    { id: "compliance", title: "Failed Controls", value: failedControlsData?.length || 0, prefix: <AuditOutlined />, color: "#fa541c", extra: "Policy Violations" },
    { id: "identity", title: "Privileged Admins", value: adminRolesData?.length || 0, prefix: <UserOutlined />, color: "#1890ff", extra: `${adminRolesData?.filter(a => !a.mfaEnabled).length} No MFA` },
    { id: "actions", title: "Open Actions", value: openActionsCount, prefix: <BulbOutlined />, color: "#722ed1", extra: "Remediation Steps" }
  ];

  const renderDrawerContent = () => {
    if (!activeDrawer) return null;

    switch (activeDrawer) {
      case "governance":
        return (
          <Table 
            dataSource={scoreControls} 
            size="small" 
            rowKey="id"
            pagination={{ pageSize: 6 }}
            columns={[
              { 
                title: 'Security Control', 
                render: (record) => (
                  <Space direction="vertical" size={0}>
                    <Text strong>{record.properties?.displayName}</Text>
                    <Text type="secondary" style={{ fontSize: '11px' }}>Weight: {record.properties?.weight}</Text>
                  </Space>
                )
              },
              { 
                title: 'Resource Health', 
                render: (record) => (
                  <Space size="middle">
                    <Tooltip title="Healthy"><Tag color="success">{record.properties?.healthyResourceCount || 0}</Tag></Tooltip>
                    <Tooltip title="Unhealthy"><Tag color="error">{record.properties?.unhealthyResourceCount || 0}</Tag></Tooltip>
                  </Space>
                )
              },
              { 
                title: 'Score Impact', 
                render: (record) => {
                  const percent = Math.round((record.properties?.score?.percentage || 0) * 100);
                  return (
                    <div style={{ width: '150px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>{record.properties?.score?.current} / {record.properties?.score?.max} pts</Text>
                        <Text strong style={{ fontSize: '12px' }}>{percent}%</Text>
                      </div>
                      <Progress percent={percent} size="small" strokeColor={percent === 100 ? '#52c41a' : '#1890ff'} showInfo={false} />
                    </div>
                  );
                }
              }
            ]}
          />
        );

      case "inventory":
        return (
          <Table 
            dataSource={criticalFindings} 
            size="small" 
            rowKey="id"
            columns={[
              { title: 'High Severity Finding', render: (f) => (
                <Space direction="vertical" size={0}>
                  <Text strong style={{ color: '#ff4d4f' }}>{f.cveId}</Text>
                  <Text type="secondary" style={{ fontSize: '11px' }}>{f.software}</Text>
                </Space>
              )},
              { title: 'Resource', dataIndex: 'resource', render: (text) => <Tag color="blue">{text?.toUpperCase()}</Tag> },
              { title: 'Status', render: () => <Tag color="error">UNHEALTHY</Tag> }
            ]}
            expandable={{
              expandedRowRender: (f) => (
                <Card size="small" style={{ background: '#f9f9f9', borderLeft: '4px solid #ff4d4f' }}>
                  <Row gutter={[24, 12]}>
                    <Col span={12}>
                      <Title level={5} style={{ fontSize: '14px' }}><BulbOutlined /> Remediation</Title>
                      <Paragraph style={{ fontSize: '13px' }}>{f.remediation}</Paragraph>
                    </Col>
                    <Col span={12}>
                      <Title level={5} style={{ fontSize: '14px' }}><InfoCircleOutlined /> Risk Impact</Title>
                      <Paragraph style={{ fontSize: '13px' }}>{f.impact}</Paragraph>
                    </Col>
                  </Row>
                </Card>
              ),
            }}
          />
        );

      case "compliance":
        const totals = failedControlsData.reduce((acc, curr) => {
          const state = (curr.properties?.state || "Failed").toLowerCase();
          if (state === "passed") acc.passed++;
          else if (state === "skipped") acc.skipped++;
          else acc.failed++;
          return acc;
        }, { passed: 0, failed: 0, skipped: 0 });

        return (
          <>
            <Row gutter={16} style={{ marginBottom: 20 }}>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center', borderBottom: '3px solid #ff4d4f' }}>
                  <Statistic title="Failed" value={totals.failed} valueStyle={{ color: '#ff4d4f' }} prefix={<WarningOutlined />} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center', borderBottom: '3px solid #52c41a' }}>
                  <Statistic title="Passed" value={totals.passed} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center', borderBottom: '3px solid #faad14' }}>
                  <Statistic title="Skipped" value={totals.skipped} valueStyle={{ color: '#faad14' }} prefix={<InfoCircleOutlined />} />
                </Card>
              </Col>
            </Row>

            <Table 
              dataSource={failedControlsData} 
              size="small" 
              rowKey={(r) => r.id || r.name || Math.random().toString()}
              columns={[
                { 
                  title: 'Control Information', 
                  render: (record) => (
                    <Space direction="vertical" size={0}>
                      <Text strong><FileProtectOutlined /> {record.name}</Text>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        Category: {record.properties?.metadata?.category || "Security"}
                      </Text>
                    </Space>
                  )
                },
                { 
                  title: 'Compliance Status', 
                  render: (record) => {
                      const state = (record.properties?.state || "Failed").toLowerCase();
                      let color = "volcano";
                      let label = "FAILED";
                      if (state === "passed") { color = "success"; label = "PASSED"; }
                      else if (state === "skipped") { color = "orange"; label = "SKIPPED"; }
                      return <Tag color={color}>{label}</Tag>;
                  }
                }
              ]}
              expandable={{
                  expandedRowRender: (record) => (
                    <Card size="small" style={{ background: '#f9f9f9', borderLeft: '4px solid #fa541c' }}>
                      <Title level={5} style={{ fontSize: '14px' }}>Policy Description</Title>
                      <Paragraph style={{ fontSize: '13px' }}>{record.properties?.description || "Policy baseline monitoring."}</Paragraph>
                      <Space>
                          <Tag>Type: {record.properties?.policyType || "BuiltIn"}</Tag>
                          <Tag color="blue">Effect: {record.properties?.policyRule?.then?.effect || "Audit"}</Tag>
                      </Space>
                    </Card>
                  )
              }}
            />
          </>
        );

      case "actions":
        const openActionsData = (allAssessments || [])
          .filter((asm: any) => 
            asm.properties?.status?.code === 'Unhealthy' && 
            asm.properties?.metadata?.severity !== 'High'
          )
          .map((asm: any) => ({
            id: asm.id,
            displayName: asm.properties?.displayName,
            resourceName: asm.properties?.resourceDetails?.ResourceName,
            severity: asm.properties?.metadata?.severity,
            softwareName: asm.properties?.additionalData?.SoftwareName,
            fixedVersion: asm.properties?.additionalData?.FixedVersion,
            description: asm.properties?.description,
            remediation: asm.properties?.remediationSteps
          }));

        return (
          <Table 
            dataSource={openActionsData} 
            size="small" 
            rowKey="id"
            columns={[
              { 
                title: 'Recommendation', 
                render: (record) => (
                  <Space>
                    {/* RESTORED: The + button indicator */}
                    <div style={{ 
                      width: 20, height: 20, border: '1px solid #d9d9d9', 
                      borderRadius: '50%', display: 'flex', alignItems: 'center', 
                      justifyContent: 'center', color: '#1890ff', fontSize: '12px' 
                    }}>+</div>
                    <Text strong>{record.displayName}</Text>
                  </Space>
                )
              },
              { 
                title: 'Resource', 
                render: (record) => <Tag color="blue">{record.resourceName?.toUpperCase()}</Tag>
              },
              { 
                title: 'Severity', 
                render: (record) => <Tag color="orange" style={{ fontWeight: 'bold' }}>{record.severity?.toUpperCase() || 'MEDIUM'}</Tag>
              }
            ]}
            expandable={{
              expandedRowRender: (record) => (
                <div style={{ padding: '16px', background: '#f9f9f9', borderLeft: '5px solid #722ed1' }}>
                  <Title level={5} style={{ fontSize: '14px', color: '#722ed1' }}><BulbOutlined /> WHAT NEEDS TO BE DONE:</Title>
                  <Paragraph style={{ fontSize: '13px' }}>
                    The software <strong>{record.softwareName}</strong> is out of date. 
                    Install version <strong>{record.fixedVersion || 'latest patch'}</strong> to resolve this failure.
                  </Paragraph>
                  <Title level={5} style={{ fontSize: '14px', color: '#1890ff' }}><InfoCircleOutlined /> WHY IT FAILED:</Title>
                  <Paragraph style={{ fontSize: '13px', marginBottom: 0 }}>{record.description || "This resource is currently unhealthy."}</Paragraph>
                </div>
              ),
            }}
          />
        );

      case "identity":
        return (
          <Table 
            dataSource={adminRolesData} 
            size="small" 
            rowKey={(_, index) => index ?? 0}
            columns={[
              { title: 'Assigned Role', dataIndex: 'role', render: (role: string) => (
                <Space size={[0, 4]} wrap>
                  {role.split(',').map((r) => <Tag color="blue" key={r.trim()}>{r.trim()}</Tag>)}
                </Space>
              )},
              { title: 'Users', dataIndex: 'assignedUsers', align: 'center', render: (count) => <Badge count={count} style={{ backgroundColor: '#108ee9' }} /> },
              { title: 'MFA Status', dataIndex: 'mfaEnabled', align: 'center', render: (mfa) => mfa === "✅" ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <WarningOutlined style={{ color: '#ff4d4f' }} /> }
            ]}
          />
        );

      

      default:
        return <Text>No details available.</Text>;
    }
  };

  return (
    <div style={{ marginTop: 24 }}>
      <Card style={{ borderRadius: 12, marginBottom: 16, borderLeft: `6px solid ${riskTier.hex}` }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Title level={4} style={{ margin: 0 }}><SafetyCertificateOutlined /> Security Maturity Benchmark</Title>
            <Tag color={riskTier.color} style={{ fontWeight: 'bold' }}>{riskTier.label}</Tag>
          </Space>
          <Text style={{ fontSize: 16 }}>Secure Score: <strong>{overallScore}%</strong></Text>
          <Paragraph style={{ marginBottom: 0 }}>
            Status: <Text strong style={{ color: riskTier.hex }}>CRITICAL GAP</Text>. 
            Current Score: <Text strong>{currentPoints} / {maxPoints} pts</Text>. 
            You are <Text strong type="danger">{gapToStandard}%</Text> below the industry standard. 
            Need <Text strong>{pointsNeeded} more points</Text> to hit the 80% target.
          </Paragraph>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        {tiles.map((tile) => (
          <Col xs={24} md={tile.id === "governance" ? 8 : 4} key={tile.id}>
            <Card hoverable loading={loading} onClick={() => setActiveDrawer(tile.id)} style={{ borderRadius: 12, borderTop: `4px solid ${tile.color}`, height: '100%' }}>
              {tile.isProgress ? (
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>{tile.title}</Text><br />
                  <Progress type="circle" percent={Number(tile.value)} width={80} strokeColor={tile.color} /><br />
                  <Text strong style={{ fontSize: 10 }}>{tile.extra}</Text>
                </div>
              ) : (
                <div> 
                  <Statistic title={<Text type="secondary" style={{ fontSize: 11 }}>{tile.title}</Text>} value={tile.value} prefix={tile.prefix} valueStyle={{ color: tile.color }} />
                  <Text type="secondary" style={{ fontSize: 10 }}>{tile.extra}</Text>
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <Drawer title={`${activeDrawer?.toUpperCase()} Details`} width={950} open={!!activeDrawer} onClose={() => setActiveDrawer(null)} destroyOnClose>
        {renderDrawerContent()}
      </Drawer>
    </div>
  );
};