import { Table, Typography, Tag, Space, Card } from 'antd';
import { 
  SafetyCertificateOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  SyncOutlined, 
  WarningOutlined 
} from '@ant-design/icons';

const { Title, Text } = Typography;

export const PatchManagementTile = ({ selectedSubscription }: { selectedSubscription: string | null }) => {
  
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

  const tableProps = {
    size: "small" as const,
    pagination: false as const,
    bordered: false,
  };

  return (
    <div style={{ padding: '32px', background: '#f5f7f9', minHeight: '100%' }}>
      
      {/* 1. BLUE HEADER BANNER */}
      <Card
        style={{ 
          borderRadius: '12px', 
          background: 'linear-gradient(135deg, #1890ff 0%, #0050b3 100%)', 
          border: 'none', 
          marginBottom: '40px',
          boxShadow: '0 8px 16px rgba(24, 144, 255, 0.25)'
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <Space size="large">
          <div style={{ background: 'rgba(255,255,255,0.25)', padding: '12px', borderRadius: '10px' }}>
            <SafetyCertificateOutlined style={{ fontSize: '32px', color: 'white' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '24px', fontWeight: 800 }}>Azure OS & Patch Management</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
              Subscription: {selectedSubscription ?? 'All Subscriptions'} | Patch Compliance, OS Support, Risks
            </p>
          </div>
        </Space>
      </Card>

      {/* 2. PATCH MANAGEMENT KPIs */}
      <Title level={4} style={headerTextStyle}>Patch Management KPIs</Title>
      <div style={sectionStyle}>
        <Table {...tableProps} 
          dataSource={[
            { key: '1', kpi: 'Total VMs', value: '5' },
            { key: '2', kpi: 'Patch Compliance', value: '60%' },
            { key: '3', kpi: 'VMs Missing Critical Patches', value: '2' },
            { key: '4', kpi: 'Reboot Pending', value: '2' },
            { key: '5', kpi: 'Unsupported OS', value: '1' },
            { key: '6', kpi: 'Patch Failures (Last 7 Days)', value: '1' },
          ]} 
          columns={[
            { title: 'KPI', dataIndex: 'kpi', render: (t) => <Text strong>{t}</Text> },
            { title: 'Value', dataIndex: 'value', align: 'right', render: (v) => <Text style={{ color: '#1890ff', fontWeight: 700 }}>{v}</Text> }
          ]} 
        />
      </div>

      {/* 3. OS & PATCH STATUS - DETAILED RECORDS (8 Fields) */}
      <Title level={4} style={headerTextStyle}>OS & Patch Status – Detailed Records</Title>
      <div style={sectionStyle}>
        <Table {...tableProps} 
          dataSource={[
            { key: 1, vm: 'VM-Prod-DB-01', os: 'Windows Server 2016', status: 'Non-Compliant', missing: '6 (3 Critical)', reboot: 'Yes', date: '10-Jan-26', support: 'Out of Support', risk: 'High' },
            { key: 2, vm: 'VM-Prod-App-01', os: 'Windows Server 2022', status: 'Compliant', missing: '0', reboot: 'No', date: '18-Jan-26', support: 'Supported', risk: 'Low' },
            { key: 3, vm: 'VM-Prod-Web-01', os: 'Windows Server 2019', status: 'Partial', missing: '2 (1 Critical)', reboot: 'No', date: '15-Jan-26', support: 'Supported', risk: 'Medium' },
            { key: 4, vm: 'VM-Test-01', os: 'Ubuntu 20.04 LTS', status: 'Non-Compliant', missing: '4 (2 Security)', reboot: 'No', date: '05-Jan-26', support: 'Near EOS', risk: 'Medium' },
            { key: 5, vm: 'VM-Dev-01', os: 'Windows Server 2012 R2', status: 'Non-Compliant', missing: '9 (5 Critical)', reboot: 'Yes', date: '02-Jan-26', support: 'Out of Support', risk: 'High' },
          ]} 
          columns={[
            { title: '#', dataIndex: 'key', width: 40 },
            { title: 'VM Name', dataIndex: 'vm', width: 150, render: (t) => <span style={{fontWeight: 600}}>{t}</span> },
            { title: 'OS Version', dataIndex: 'os', width: 160 },
            { title: 'Patch Status', dataIndex: 'status', width: 140, render: (s) => (
               <Space>
                 {s === 'Compliant' ? <CheckCircleOutlined style={{color: '#52c41a'}}/> : s === 'Non-Compliant' ? <CloseCircleOutlined style={{color: '#ff4d4f'}}/> : <WarningOutlined style={{color: '#faad14'}}/>}
                 <span style={{color: s === 'Compliant' ? '#52c41a' : s === 'Non-Compliant' ? '#ff4d4f' : '#faad14', fontWeight: 600}}>{s}</span>
               </Space>
            )},
            { title: 'Missing Patches', dataIndex: 'missing', width: 120 },
            { title: 'Reboot Pending', dataIndex: 'reboot', align: 'center', width: 120, render: (r) => (
                <Tag icon={r === 'Yes' ? <SyncOutlined spin /> : null} color={r === 'Yes' ? 'processing' : 'default'}>{r.toUpperCase()}</Tag>
            )},
            { title: 'Last Patch Date', dataIndex: 'date', width: 110 },
            { title: 'OS Support', dataIndex: 'support', render: (s) => (
                <span style={{ color: s === 'Out of Support' ? '#cf1322' : s === 'Near EOS' ? '#d46b08' : '#389e0d', fontWeight: 600 }}>
                    {s === 'Out of Support' ? '❌ ' : s === 'Near EOS' ? '⚠️ ' : '✅ '}{s}
                </span>
            )},
            { title: 'Risk', dataIndex: 'risk', align: 'right', width: 110, render: (r) => (
                <Tag color={r === 'High' ? '#fff1f0' : r === 'Medium' ? '#fff7e6' : '#f6ffed'} 
                     style={{ border: `1px solid ${r === 'High' ? '#ffa39e' : r === 'Medium' ? '#ffd591' : '#b7eb8f'}`, color: r === 'High' ? '#cf1322' : r === 'Medium' ? '#d46b08' : '#389e0d', fontWeight: 700 }}>
                  ● {r.toUpperCase()}
                </Tag>
            )}
          ]} 
        />
      </div>

      {/* 4. KEY RISKS IDENTIFIED */}
      <Title level={4} style={headerTextStyle}>Key Risks Identified</Title>
      <div style={sectionStyle}>
        <Table {...tableProps} 
          dataSource={[
            { key: 'r1', risk: 'Unsupported OS', affected: 'VM-Prod-DB-01, VM-Dev-01' },
            { key: 'r2', risk: 'Critical patches missing', affected: 'VM-Prod-DB-01, VM-Dev-01' },
            { key: 'r3', risk: 'Reboot pending', affected: 'VM-Prod-DB-01, VM-Dev-01' },
          ]} 
          columns={[
            { title: 'Risk', dataIndex: 'risk', render: (t) => <Text type="danger" strong>{t}</Text> },
            { title: 'Affected VMs', dataIndex: 'affected' }
          ]} 
        />
      </div>
    </div>
  );
};