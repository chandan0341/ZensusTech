import { Table, Typography, Tag, Space, Card } from 'antd';
import { LockOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export const SecurityTile = ({ selectedSubscription }: { selectedSubscription: string | null }) => {
  const isOrg = selectedSubscription === 'Organization';

  // Section wrapper style to match screenshot card look
  const sectionStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '32px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
  };

  const headerTextStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '20px',
    fontWeight: 500
  };

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100%' }}>
      {/* 1. Header Banner */}
      <Card
        style={{ borderRadius: '12px', background: 'linear-gradient(to right, #e65100, #fb8c00)', border: 'none', marginBottom: '32px' }}
        bodyStyle={{ padding: '20px' }}
      >
        <Space size="middle">
          <LockOutlined style={{ fontSize: '28px', color: 'white' }} />
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '22px' }}>Security Dashboard</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)' }}>Subscription: {selectedSubscription ?? 'Default'}</p>
          </div>
        </Space>
      </Card>

      {/* 1. Virtual Machine Security Status */}
      <Title level={4} style={headerTextStyle}>Virtual Machine Security Status</Title>
      <div style={sectionStyle}>
        <Table size="small" pagination={false} dataSource={[
          { key: '1', vm: 'VM-Prod-01', os: 'Windows 2019', patch: 'Missing patches', def: 'Not Installed', enc: 'Disabled', risk: 'High' },
          { key: '2', vm: 'VM-Prod-02', os: 'Windows 2022', patch: 'Up to date', def: 'Installed', enc: 'Enabled', risk: 'Low' },
          { key: '3', vm: 'VM-Test-01', os: 'Windows 2016', patch: 'Missing patches', def: 'Not Installed', enc: 'Disabled', risk: 'High' },
          { key: '4', vm: 'VM-App-01', os: 'Ubuntu 20.04', patch: 'Partial', def: 'Installed', enc: 'Enabled', risk: 'Medium' },
        ]} columns={[
          { title: 'VM Name', dataIndex: 'vm' },
          { title: 'OS', dataIndex: 'os' },
          { title: 'Patch Status', dataIndex: 'patch', render: (p) => p.includes('Missing') ? <Text type="danger">❌ {p}</Text> : <Text type="success">✅ {p}</Text> },
          { title: 'Defender Agent', dataIndex: 'def', render: (d) => d === 'Installed' ? <Text type="success">✅ {d}</Text> : <Text type="danger">❌ {d}</Text> },
          { title: 'Encryption', dataIndex: 'enc', render: (e) => e === 'Enabled' ? <Text type="success">✅ {e}</Text> : <Text type="danger">❌ {e}</Text> },
          { title: 'Risk', dataIndex: 'risk', render: (r) => <Tag color={r === 'High' ? 'red' : r === 'Medium' ? 'orange' : 'green'}>{r}</Tag> }
        ]} />
      </div>

      {/* 2. Network Security Findings */}
      <Title level={4} style={headerTextStyle}>Network Security Findings</Title>
      <div style={sectionStyle}>
        <Table size="small" pagination={false} dataSource={[
          { key: 'n1', f: 'RDP open to Internet', c: 2, s: 'High' },
          { key: 'n2', f: 'SSH open to Internet', c: 1, s: 'High' },
          { key: 'n3', f: 'NSGs without flow logs', c: 3, s: 'Medium' },
          { key: 'n4', f: 'Firewall missing on subnet', c: 1, s: 'Medium' },
        ]} columns={[
          { title: 'Finding', dataIndex: 'f' },
          { title: 'Count', dataIndex: 'c' },
          { title: 'Severity', dataIndex: 's', render: (s) => <Tag color={s === 'High' ? 'red' : 'orange'}>{s}</Tag> }
        ]} />
      </div>

      {/* 3. Data & Storage Security */}
      <Title level={4} style={headerTextStyle}>Data & Storage Security</Title>
      <div style={sectionStyle}>
        <Table size="small" pagination={false} dataSource={[
          { key: 'd1', r: 'Storage-prod-01', i: 'Public blob access enabled', s: 'Medium' },
          { key: 'd2', r: 'SQL-DB-01', i: 'Auditing disabled', s: 'Medium' },
          { key: 'd3', r: 'SQL-DB-02', i: 'TDE not enabled', s: 'High' },
        ]} columns={[
          { title: 'Resource', dataIndex: 'r' },
          { title: 'Issue', dataIndex: 'i' },
          { title: 'Severity', dataIndex: 's', render: (s) => <Tag color={s === 'High' ? 'red' : 'orange'}>{s}</Tag> }
        ]} />
      </div>

      {/* 4. Identity & Access Security */}
      <Title level={4} style={headerTextStyle}>Identity & Access Security</Title>
      <div style={sectionStyle}>
        <Table size="small" pagination={false} showHeader={true} dataSource={[
          { key: 'i1', c: 'MFA enforced for Global Admins', s: '❌ No' },
          { key: 'i2', c: 'MFA enforced for Subscription Owners', s: '❌ No' },
          { key: 'i3', c: 'Privileged users count', s: isOrg ? '6' : '2' },
          { key: 'i4', c: 'Inactive users (>90 days)', s: '4' },
          { key: 'i5', c: 'Legacy authentication blocked', s: '❌ No' },
        ]} columns={[
          { title: 'Control', dataIndex: 'c' },
          { title: 'Status', dataIndex: 's', align: 'right', render: (s) => <Text type={s.includes('No') ? 'danger' : 'secondary'}>{s}</Text> }
        ]} />
      </div>

      {/* 5. Azure Security Posture */}
      <Title level={4} style={headerTextStyle}>Azure Security Posture</Title>
      <div style={sectionStyle}>
        <Table size="small" pagination={false} dataSource={[
          { key: 'p1', k: 'Secure Score', v: isOrg ? '62%' : '78%' },
          { key: 'p2', k: 'Total Recommendations', v: isOrg ? '24' : '8' },
          { key: 'p3', k: 'High Severity Issues', v: isOrg ? '6' : '1' },
          { key: 'p4', k: 'Medium Severity Issues', v: '11' },
          { key: 'p5', k: 'Low Severity Issues', v: '7' },
          { key: 'p6', k: 'Unhealthy Resources', v: '9' },
          { key: 'p7', k: 'Subscription Admins without MFA', v: '2' },
        ]} columns={[
          { title: 'KPI', dataIndex: 'k' },
          { title: 'Value', dataIndex: 'v', align: 'right' }
        ]} />
      </div>

      {/* 6. Secure Score Breakdown */}
      <Title level={4} style={headerTextStyle}>Secure Score Breakdown</Title>
      <div style={sectionStyle}>
        <Table size="small" pagination={false} dataSource={[
          { key: 'b1', cat: 'Identity & Access', score: 18, max: 30 },
          { key: 'b2', cat: 'Compute', score: 16, max: 25 },
          { key: 'b3', cat: 'Networking', score: 12, max: 20 },
          { key: 'b4', cat: 'Data & Storage', score: 10, max: 15 },
          { key: 'b5', cat: 'App & Containers', score: 6, max: 10 },
        ]} columns={[
          { title: 'Category', dataIndex: 'cat' },
          { title: 'Score', dataIndex: 'score', align: 'right' },
          { title: 'Max', dataIndex: 'max', align: 'right' }
        ]} />
      </div>

      {/* 7. Top Security Recommendations */}
      <Title level={4} style={headerTextStyle}>Top Security Recommendations</Title>
      <div style={sectionStyle}>
        <Table size="small" pagination={false} dataSource={[
          { key: 'r1', rec: 'Enable MFA for subscription owners', sev: 'High', aff: 'Subscription', stat: 'Unhealthy' },
          { key: 'r2', rec: 'System updates should be installed on VMs', sev: 'High', aff: '3 VMs', stat: 'Unhealthy' },
          { key: 'r3', rec: 'NSG allows inbound traffic on port 3389', sev: 'High', aff: '2 NSGs', stat: 'Unhealthy' },
          { key: 'r4', rec: 'Disk encryption should be enabled', sev: 'Medium', aff: '1 VM', stat: 'Unhealthy' },
          { key: 'r5', rec: 'Storage account public access enabled', sev: 'Medium', aff: '2 Storage Accounts', stat: 'Unhealthy' },
          { key: 'r6', rec: 'Endpoint protection missing', sev: 'Medium', aff: '1 VM', stat: 'Unhealthy' },
        ]} columns={[
          { title: '#', dataIndex: 'key', width: 50 },
          { title: 'Recommendation', dataIndex: 'rec' },
          { title: 'Severity', dataIndex: 'sev', render: (s) => <Tag color={s === 'High' ? 'red' : 'orange'}>{s}</Tag> },
          { title: 'Affected Resources', dataIndex: 'aff' },
          { title: 'Status', dataIndex: 'stat', render: (st) => <Tag color="warning">⚠️ {st}</Tag> }
        ]} />
      </div>
    </div>
  );
};