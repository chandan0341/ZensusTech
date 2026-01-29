import { Table, Typography, Tag, Space, Card, Row, Col, Alert } from 'antd';
import { GlobalOutlined, ClockCircleOutlined, LockOutlined, TeamOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface SSLCertificate {
  key: string | number;
  domain: string;
  expiryDate: string;
  daysToExpiry: number;
}

export const DomainOverviewTile = ({ 
  sslCertificates = [], 
  sslError = null 
}: { 
  sslCertificates?: SSLCertificate[], 
  sslError?: string | null 
}) => {
  
  const sectionStyle: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '40px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0'
  };

  const headerTextStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '24px',
    fontWeight: 700,
    color: '#262626',
    fontSize: '22px'
  };

  // Mock data matching image_e3e47c.png
  const displayCertificates = sslCertificates.length > 0 ? sslCertificates : [
    { key: '1', domain: 'example.com', expiryDate: '2026-02-20', daysToExpiry: 30 },
    { key: '2', domain: 'company.net', expiryDate: '2026-01-25', daysToExpiry: 4 },
    { key: '3', domain: 'brand.org', expiryDate: '2026-03-30', daysToExpiry: 69 },
    { key: '4', domain: 'portal.io', expiryDate: '2026-01-29', daysToExpiry: 8 },
    { key: '5', domain: 'safe-site.com', expiryDate: '2026-04-15', daysToExpiry: 85 },
  ];

  return (
    <div style={{ padding: '32px', background: '#f5f7f9', minHeight: '100%' }}>
      
      {/* 1. Header Banner */}
      <Card
        style={{ 
          borderRadius: '12px', 
          background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)', 
          border: 'none', 
          marginBottom: '40px',
          boxShadow: '0 8px 16px rgba(82, 196, 26, 0.25)'
        }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <Space size="large">
          <GlobalOutlined style={{ fontSize: '32px', color: 'white' }} />
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '24px', fontWeight: 800 }}>Domain Overview Dashboard</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
              Domain Health & Security Monitoring
            </p>
          </div>
        </Space>
      </Card>

      {sslError && <Alert message={sslError} type="error" showIcon style={{ marginBottom: 24 }} />}

      {/* 2. KPI Cards */}
      <Title level={4} style={headerTextStyle}>Domain Health Summary</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: '40px' }}>
        {[
          { label: 'Active Domains', val: '5', icon: <GlobalOutlined />, color: '#52c41a' },
          { label: 'Expiring Soon', val: '2', icon: <ClockCircleOutlined />, color: '#faad14' },
          { label: 'SSL Secured', val: '4', icon: <LockOutlined />, color: '#1890ff' },
          { label: 'DNS Records', val: '12', icon: <TeamOutlined />, color: '#722ed1' }
        ].map((kpi, i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <Card style={{ borderRadius: '12px', textAlign: 'center', border: '1px solid #f0f0f0' }}>
               <div style={{ fontSize: '24px', color: kpi.color, marginBottom: '8px' }}>{kpi.icon}</div>
               <div style={{ fontSize: '28px', fontWeight: 800, color: kpi.color }}>{kpi.val}</div>
               <div style={{ color: '#8c8c8c', fontWeight: 600 }}>{kpi.label}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 3. MSP Action Plan */}
      <Title level={4} style={headerTextStyle}>MSP Action Plan</Title>
      <div style={sectionStyle}>
        <Table 
          size="small"
          pagination={false}
          dataSource={[
            { key: 1, priority: "P1", action: "Renew abcmfg.com", owner: "MSP" },
            { key: 2, priority: "P1", action: "Enable DMARC & DKIM", owner: "MSP" },
            { key: 3, priority: "P2", action: "Enable MFA on registrar", owner: "Customer" },
            { key: 4, priority: "P2", action: "SSL auto-renew setup", owner: "MSP" },
          ]} 
          columns={[
            { title: 'Priority', dataIndex: 'priority', width: 120 },
            { title: 'Action', dataIndex: 'action' },
            { title: 'Owner', dataIndex: 'owner', align: 'right' }
          ]} 
        />
      </div>

      {/* 4. SSL Expiry Report */}
      <Title level={4} style={headerTextStyle}>SSL Certificate Expiry Report</Title>
      <div style={sectionStyle}>
        <Table 
          size="small"
          pagination={false}
          dataSource={displayCertificates} 
          columns={[
            { title: '#', dataIndex: 'key', width: 50 },
            { title: 'Domain / Endpoint', dataIndex: 'domain', render: (t) => <Text strong>{t}</Text> },
            { title: 'Expiry Date', dataIndex: 'expiryDate' },
            { title: 'Days to Expiry', dataIndex: 'daysToExpiry', render: (d) => <Text strong>{d} days</Text> },
            { title: 'Status', dataIndex: 'status', align: 'right', render: (_, record) => {
                const days = record.daysToExpiry;
                let config = { label: 'Expiring in >30 days', color: '#f6ffed', border: '#b7eb8f', text: '#389e0d' };
                
                if (days <= 7) config = { label: 'Expiring in ≤7 days', color: '#fff1f0', border: '#ffa39e', text: '#cf1322' };
                else if (days <= 30) config = { label: 'Expiring in ≤30 days', color: '#fff7e6', border: '#ffd591', text: '#d46b08' };

                return (
                  <Tag color={config.color} style={{ border: `1px solid ${config.border}`, color: config.text, fontWeight: 700, borderRadius: '20px' }}>
                    ● {config.label}
                  </Tag>
                );
            }}
          ]} 
        />
      </div>
    </div>
  );
};