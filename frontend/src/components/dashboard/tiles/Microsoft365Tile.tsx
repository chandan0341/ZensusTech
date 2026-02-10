import { useState } from "react";
import { Card, Typography, Tag, Row, Col,  Progress, Drawer, Space } from "antd";
import { 
  TeamOutlined, 
  SafetyCertificateOutlined, 
  GlobalOutlined, 
  RocketOutlined, 
  SafetyOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined
} from "@ant-design/icons";
import { TableComponent } from "@/components/TailAdminReports";
import { SummaryItem } from "@/types/dashboard.types";

interface Microsoft365TileProps {
  overallScore: number;
  summaryItems: SummaryItem[];
  adminRolesData: any[];
  licenseUsageData?: any[];
  m365Score?: any; 
  m365ActionPlan?: any[];
  m365Metadata?: any;
  onRowClick: (record: any, tableType: string) => void;
  handleCardClickForMicrosoftUserType: (userType: string) => void;
}

export const Microsoft365Tile = ({
  overallScore = 0,
  summaryItems = [],
  adminRolesData = [],
  licenseUsageData = [],
  m365Score,
  m365ActionPlan = [],
  m365Metadata,
  onRowClick,
  handleCardClickForMicrosoftUserType,
}: Microsoft365TileProps) => {

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedAction, setSelectedAction] = useState<any>(null);

  const activeThreats: string[] = [...new Set((m365ActionPlan || []).flatMap((a: any) => a.threats || []))].slice(0, 6);
  
  const industryAvg = m365Score?.averageComparativeScores?.[0]?.averageScore || 53.4;
  const clientPct = Math.round((m365Score?.currentScore / m365Score?.maxScore) * 100) || overallScore;

  const handleExecutiveRowClick = (record: any) => {
    const actionDetails = m365ActionPlan.find(a => 
        a.title === record.area || a.title.toLowerCase().includes(record.area.toLowerCase())
    );
    
    if (actionDetails) {
      setSelectedAction(actionDetails);
      setDrawerVisible(true);
    }
    onRowClick(record, 'executive-summary');
  };

  const handleThreatClick = (threatName: string) => {
    // Dynamically find the remediation in the JSON linked to this specific threat
    const relevantAction = m365ActionPlan.find(action => 
      action.threats?.some((t: string) => t.toLowerCase() === threatName.toLowerCase())
    );
    
    if (relevantAction) {
      setSelectedAction(relevantAction);
      setDrawerVisible(true);
    }
  };

  return (
    <div style={{ background: '#f8f9fa', paddingBottom: '32px' }}>
      <Drawer
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: '#722ed1' }} />
            <span style={{ fontWeight: 700 }}>Security Remediation Engine</span>
          </Space>
        }
        placement="right"
        width={600}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        bodyStyle={{ padding: 0 }}
      >
        {selectedAction && (
          <div>
            <div style={{ background: 'linear-gradient(135deg, #120338 0%, #320b82 100%)', padding: '40px 24px', color: 'white' }}>
              <Space direction="vertical" size={12}>
                <Tag color="purple"><RocketOutlined /> {selectedAction.service || 'M365 Security'}</Tag>
                <Typography.Title level={2} style={{ color: 'white', margin: 0 }}>{selectedAction.title}</Typography.Title>
                <Typography.Text style={{ color: 'rgba(255,255,255,0.7)' }}>{selectedAction.description}</Typography.Text>
              </Space>
            </div>
            <div style={{ padding: '24px' }}>
               <Typography.Title level={5}><ThunderboltOutlined /> Technical Remediation</Typography.Title>
               <div 
                style={{ background: '#f0f2f5', padding: '20px', borderRadius: '12px', border: '1px solid #e8e8e8', lineHeight: '1.8' }}
                dangerouslySetInnerHTML={{ __html: selectedAction.remediation }} 
              />
               <div style={{ marginTop: '20px', padding: '15px', background: '#f6ffed', borderRadius: '8px' }}>
                <Typography.Text strong style={{ color: '#389e0d' }}><CheckCircleOutlined /> Expected Result: {selectedAction.remediationImpact}</Typography.Text>
               </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* HEADER SECTION */}
      <div style={{ background: 'linear-gradient(90deg, #722ed1 0%, #2f54eb 100%)', padding: '32px 48px', marginBottom: '24px', borderRadius: '0 0 20px 20px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size={20}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '12px' }}>
                <TeamOutlined style={{ fontSize: '32px', color: 'white' }} />
              </div>
              <div>
                <h1 style={{ color: 'white', margin: 0, fontSize: '28px', fontWeight: 700 }}>Microsoft 365 Managed Services</h1>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>Security Infrastructure & License Optimization</p>
              </div>
            </Space>
          </Col>
          <Col>
            <Tag color="white" style={{ borderRadius: '20px', color: '#722ed1', fontWeight: 600, padding: '4px 16px' }}>
              Data Sync: Active
            </Tag>
          </Col>
        </Row>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
        <Row gutter={24} style={{ marginBottom: '32px' }}>
          {/* BENCHMARK CARD (Styles from image_122037.png) */}
          <Col span={8}>
            <Card 
              hoverable 
              onClick={() => onRowClick({ area: 'Security Posture' }, 'benchmark')}
              style={{ borderRadius: '12px', background: '#f9f5ff', border: 'none', height: '100%' }}
            >
              <Space><GlobalOutlined style={{ color: '#8c8c8c' }} /> <Typography.Text type="secondary">Industry Benchmark</Typography.Text></Space>
              <div style={{ margin: '16px 0' }}>
                <span style={{ fontSize: '36px', fontWeight: 700, color: '#cf1322' }}>
                  {Math.round(clientPct)} / {industryAvg}% avg
                </span>
              </div>
              <Typography.Text type="secondary">Compared to global Microsoft 365 tenants.</Typography.Text>
              <Progress percent={clientPct} strokeColor="#52c41a" trailColor="#e8e8e8" showInfo={false} style={{ marginTop: '20px' }} />
            </Card>
          </Col>

          {/* THREAT CARD (Styles from image_1233f5.png) */}
          <Col span={16}>
            <Card style={{ borderRadius: '12px', background: '#fffef0', border: 'none', height: '100%' }}>
              <Space><CheckCircleOutlined style={{ color: '#000' }} /> <strong>Active Threat Defense</strong></Space>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }}>
                {activeThreats.map((threat: string) => (
                  <Tag 
                    key={threat} 
                    onClick={() => handleThreatClick(threat)}
                    style={{ 
                      cursor: 'pointer',
                      background: '#fff7e6', 
                      border: '1px solid #ffd591', 
                      color: '#d46b08', 
                      padding: '6px 14px', 
                      borderRadius: '8px', 
                      fontWeight: 500 
                    }}
                  >
                    {threat}
                  </Tag>
                ))}
              </div>
              <Typography.Text type="secondary" style={{ display: 'block', marginTop: '20px', fontSize: '12px' }}>
                Security controls tuned for account protection and data privacy based on your {m365Score?.currentScore} score.
              </Typography.Text>
            </Card>
          </Col>
        </Row>

        {/* CXO VIEW TABLE (Matches image_122037.png bottom) */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Typography.Title level={3}><RocketOutlined /> Executive Summary (CXO View)</Typography.Title>
        </div>
        
        <Card style={{ borderRadius: '16px', marginBottom: '32px' }}>
          <TableComponent
            title=""
            columns={[
              { 
                key: "area", 
                label: "Area",
                render: (v) => (
                    <div>
                        <div style={{ fontWeight: 600, color: '#264653' }}>{v}</div>
                        <div style={{ fontSize: '11px', color: '#8c8c8c' }}>Last updated: {new Date(m365Metadata?.updated_at).toLocaleDateString()}</div>
                    </div>
                )
              },
              { 
                key: "status", 
                label: "Result / Status", 
                render: (v) => (
                    <Space size={12}>
                        <Tag style={{ borderRadius: '12px', background: '#f0f2f5' }}>{m365Score?.currentScore}/{m365Score?.maxScore}</Tag>
                        <span style={{ color: '#faad14', fontWeight: 700 }}>⚠️ {v} Secure</span>
                    </Space>
                )
              }
            ]}
            data={summaryItems}
            onRowClick={handleExecutiveRowClick}
          />
        </Card>

        <Card title={<span><SafetyOutlined /> Admin Roles & Privileged Access</span>} style={{ borderRadius: '16px', marginBottom: '32px' }}>
          <TableComponent
            title=""
            columns={[
              { key: "role", label: "Role Name", render: (t) => <strong>{t}</strong> },
              { key: "assignedUsers", label: "User Count" },
              { key: "mfaEnabled", label: "MFA Check", render: (v) => <Tag color={v.includes('✅') ? 'green' : 'volcano'}>{v}</Tag> }
            ]}
            data={adminRolesData || []}
            onRowClick={(record) => handleCardClickForMicrosoftUserType(record.role)}
          />
        </Card>

        <Card title="License Optimization & Cost Management" style={{ borderRadius: '16px' }}>
          <TableComponent
            title=""
            columns={[
              { key: "license", label: "License Type" },
              { key: "purchased", label: "Purchased" },
              { key: "potentialSavings", label: "Potential Savings", render: (v) => <span style={{ color: '#52c41a', fontWeight: 800 }}>{v}</span> }
            ]}
            data={licenseUsageData || []}
            onRowClick={(record) => onRowClick(record, 'license-usage')}
          />
        </Card>
      </div>
    </div>
  );
};