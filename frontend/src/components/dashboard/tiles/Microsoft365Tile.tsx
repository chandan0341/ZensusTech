import React from 'react';
import { Table, Typography, Tag, Space, Card, Row, Col } from 'antd';
import { WindowsOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// Define Props interface to resolve TS2322
interface MicrosoftO365TileProps {
  selectedSubscription?: string;
  // Adding placeholders for dynamic data if you decide to pass them from the route later
  executiveData?: any[];
  userGovernanceData?: any[];
}

export const MicrosoftO365Tile: React.FC<MicrosoftO365TileProps> = ({ 
  selectedSubscription 
}) => {
  const sectionStyle: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '32px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0'
  };

  const headerTextStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '24px',
    fontWeight: 700,
    color: '#262626',
    fontSize: '20px'
  };

  const tableProps = { size: "small" as const, pagination: false as const };

  return (
    <div style={{ padding: '32px', background: '#f5f7f9', minHeight: '100%' }}>
      
      {/* HEADER BANNER */}
      <Card
        style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #8e44ad 0%, #a29bfe 100%)', border: 'none', marginBottom: '40px' }}
        bodyStyle={{ padding: '24px' }}
      >
        <Space size="large" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space size="large">
            <div style={{ background: 'rgba(255,255,255,0.25)', padding: '12px', borderRadius: '10px' }}>
              <WindowsOutlined style={{ fontSize: '32px', color: 'white' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, color: 'white', fontSize: '24px', fontWeight: 800 }}>Microsoft 365 Managed Services</h2>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)' }}>Exchange, SharePoint & Teams Administration</p>
            </div>
          </Space>
          {/* Displaying Subscription Context if available */}
          {selectedSubscription && (
            <Tag color="purple" style={{ borderRadius: '4px', border: 'none', background: 'rgba(255,255,255,0.2)' }}>
              <Text style={{ color: 'white', fontWeight: 600 }}>{selectedSubscription}</Text>
            </Tag>
          )}
        </Space>
      </Card>

      {/* 1. EXECUTIVE SUMMARY */}
      <Title level={4} style={headerTextStyle}>Executive Summary (CXO View)</Title>
      <div style={sectionStyle}>
        <Table {...tableProps} dataSource={[
          { area: 'Identity Security', status: 'Needs Improvement', color: '#cf1322' },
          { area: 'Email Security', status: 'High Risk', color: '#cf1322' },
          { area: 'License Optimization', status: 'Savings Possible', color: '#cf1322' },
          { area: 'Data Protection', status: 'Good', color: '#389e0d' },
          { area: 'Compliance Readiness', status: 'Medium', color: '#d46b08' },
          { area: 'Overall Security Score', status: '67 / 100', color: '#cf1322' },
        ]} columns={[
          { title: 'Area', dataIndex: 'area' },
          { title: 'Status', dataIndex: 'status', align: 'right', render: (s, r) => <Text style={{color: r.color, fontWeight: 600}}>● {s}</Text> }
        ]} />
      </div>

      <Row gutter={24}>
        {/* 2. USER & IDENTITY GOVERNANCE */}
        <Col span={12}>
          <Title level={4} style={headerTextStyle}>User & Identity Governance Report</Title>
          <div style={sectionStyle}>
            <Table {...tableProps} dataSource={[
              { cat: 'Total Users', val: 48 }, { cat: 'Active Users', val: 42 }, { cat: 'Guest Users', val: 6 }, { cat: 'Inactive Users (>30 days)', val: 7 }, { cat: 'Privileged Users', val: 5 }
            ]} columns={[{ title: 'Category', dataIndex: 'cat' }, { title: 'Count', dataIndex: 'val', align: 'right' }]} />
          </div>
        </Col>

        {/* 3. ADMIN ROLES & PRIVILEGED ACCESS */}
        <Col span={12}>
          <Title level={4} style={headerTextStyle}>Admin Roles & Privileged Access</Title>
          <div style={sectionStyle}>
            <Table {...tableProps} dataSource={[
              { role: 'Global Admin', users: 3, mfa: '✘ 1' }, { role: 'Exchange Admin', users: 1, mfa: '✓' }, { role: 'Security Admin', users: 1, mfa: '✘' }
            ]} columns={[
              { title: 'Role', dataIndex: 'role' }, { title: 'Assigned Users', dataIndex: 'users' }, { title: 'MFA Enabled', dataIndex: 'mfa', render: (m) => <Text type={m.includes('✘') ? 'danger' : 'success'}>{m}</Text> }
            ]} />
          </div>
        </Col>
      </Row>

      {/* 4. EMAIL SECURITY */}
      <Title level={4} style={headerTextStyle}>Email Security & Threat Protection</Title>
      <div style={sectionStyle}>
        <Table {...tableProps} dataSource={[
          { m: 'Phishing Emails Blocked', c: 126 }, { m: 'Malware Attachments Blocked', c: 18 }, { m: 'Spam Emails Blocked', c: 1450 }, { m: 'User-reported Phishing', c: 7 }
        ]} columns={[{ title: 'Metric', dataIndex: 'm' }, { title: 'Count', dataIndex: 'c', align: 'right' }]} />
      </div>

      {/* 5. DOMAIN AUTHENTICATION */}
      <Title level={4} style={headerTextStyle}>Domain Email Authentication</Title>
      <div style={sectionStyle}>
        <Table {...tableProps} dataSource={[
          { d: 'abcmfg.com', spf: true, dkim: false, dmarc: false, risk: 'High' },
          { d: 'abcmfg.co.in', spf: true, dkim: true, dmarc: 'Monitor', risk: 'Medium' }
        ]} columns={[
          { title: 'Domain', dataIndex: 'd' },
          { title: 'SPF', dataIndex: 'spf', render: (v) => v ? <CheckCircleOutlined style={{color: '#52c41a'}}/> : <CloseCircleOutlined style={{color: '#f5222d'}}/> },
          { title: 'DKIM', dataIndex: 'dkim', render: (v) => v ? <CheckCircleOutlined style={{color: '#52c41a'}}/> : <CloseCircleOutlined style={{color: '#f5222d'}}/> },
          { title: 'DMARC', dataIndex: 'dmarc', render: (v) => typeof v === 'string' ? <Tag color="orange">{v}</Tag> : (v ? <CheckCircleOutlined /> : <CloseCircleOutlined />) },
          { title: 'Risk', dataIndex: 'risk', render: (r) => <Tag color={r === 'High' ? 'red' : 'orange'}>{r}</Tag> }
        ]} />
      </div>

      <Row gutter={24}>
        {/* 6. LICENSE OPTIMIZATION */}
        <Col span={12}>
          <Title level={4} style={headerTextStyle}>License Usage & Cost Optimization</Title>
          <div style={sectionStyle}>
            <Table {...tableProps} dataSource={[
              { t: 'Business Premium', p: 30, a: 26, u: 4 }, { t: 'E3', p: 15, a: 10, u: 5 }, { t: 'Exchange Online P1', p: 10, a: 8, u: 2 }
            ]} columns={[{ title: 'License Type', dataIndex: 't' }, { title: 'Purchased', dataIndex: 'p' }, { title: 'Assigned', dataIndex: 'a' }, { title: 'Unused', dataIndex: 'u', render: (u) => <Text type="danger">{u}</Text> }]} />
          </div>
        </Col>

        {/* 7. COLLABORATION GOVERNANCE */}
        <Col span={12}>
          <Title level={4} style={headerTextStyle}>Collaboration & Teams Governance</Title>
          <div style={sectionStyle}>
            <Table {...tableProps} dataSource={[
              { m: 'Teams', c: 42 }, { m: 'Inactive Teams (>90 days)', c: 9 }, { m: 'External Sharing Enabled', c: '14 Teams' }, { m: 'SharePoint Sites', c: 38 }
            ]} columns={[{ title: 'Metric', dataIndex: 'm' }, { title: 'Count', dataIndex: 'c', align: 'right' }]} />
          </div>
        </Col>
      </Row>

      {/* 8. DATA PROTECTION */}
      <Title level={4} style={headerTextStyle}>Data Protection & Backup Status</Title>
      <div style={sectionStyle}>
        <Table {...tableProps} dataSource={[
          { w: 'Exchange Online', s: 'Protected', d: '10-Jan-26' }, { w: 'SharePoint Online', s: 'Protected', d: '12-Jan-26' }, { w: 'OneDrive', s: 'Protected', d: '12-Jan-26' }, { w: 'Teams', s: 'Partial', d: 'Pending' }
        ]} columns={[
          { title: 'Workload', dataIndex: 'w' },
          { title: 'Backup Status', dataIndex: 's', render: (s) => <Tag color={s === 'Protected' ? 'success' : 'error'}>{s}</Tag> },
          { title: 'Last Restore Test', dataIndex: 'd' }
        ]} />
      </div>

      <Row gutter={24}>
        {/* 9. COMPLIANCE */}
        <Col span={12}>
          <Title level={4} style={headerTextStyle}>Compliance & Audit Readiness</Title>
          <div style={sectionStyle}>
            <Table {...tableProps} dataSource={[
              { a: 'Unified Audit Log', s: 'Enabled', c: 'success' }, { a: 'Retention Policies', s: 'Partial', c: 'warning' }, { a: 'DLP Policies', s: 'Not Configured', c: 'error' }, { a: 'Compliance Score', s: '62%', c: '' }
            ]} columns={[{ title: 'Area', dataIndex: 'a' }, { title: 'Status', dataIndex: 's', render: (s, r) => r.c ? <Tag color={r.c}>{s}</Tag> : s }]} />
          </div>
        </Col>

        {/* 10. INCIDENTS */}
        <Col span={12}>
          <Title level={4} style={headerTextStyle}>Incidents & Support Summary</Title>
          <div style={sectionStyle}>
            <Table {...tableProps} dataSource={[
              { c: 'Password Reset', t: 12 }, { c: 'Mail Delivery Issues', t: 4 }, { c: 'MFA Support', t: 6 }, { c: 'Teams Issues', t: 3 }, { c: 'Total Tickets', t: 25 }
            ]} columns={[{ title: 'Category', dataIndex: 'c' }, { title: 'Tickets', dataIndex: 't', align: 'right' }]} />
          </div>
        </Col>
      </Row>

      {/* 11. MSP ACTION PLAN */}
      <Title level={4} style={headerTextStyle}>MSP Action Plan (Next 30 Days)</Title>
      <div style={sectionStyle}>
        <Table {...tableProps} dataSource={[
          { p: 'P1', a: 'Enforce MFA on all admins', o: 'MSP' }, { p: 'P1', a: 'Configure DKIM & DMARC', o: 'MSP' }, { p: 'P2', a: 'License optimization execution', o: 'MSP' }, { p: 'P2', a: 'Teams lifecycle policy', o: 'MSP' }, { p: 'P3', a: 'Enable DLP policies', o: 'MSP' }
        ]} columns={[
          { title: 'Priority', dataIndex: 'p', render: (p) => <Tag color={p === 'P1' ? 'red' : 'orange'}>{p}</Tag> },
          { title: 'Action', dataIndex: 'a' },
          { title: 'Owner', dataIndex: 'o', align: 'right' }
        ]} />
      </div>
    </div>
  );
};