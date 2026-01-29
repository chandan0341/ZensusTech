import { Table, Typography, Tag, Space, Card } from 'antd';
import { CloudServerOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export const BackupDRTile = ({ selectedSubscription }: { selectedSubscription: string | null }) => {
  
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
            <CloudServerOutlined style={{ fontSize: '32px', color: 'white' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '24px', fontWeight: 800 }}>Backup & Disaster Recovery</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
              Subscription: {selectedSubscription ?? 'All Subscriptions'} | Business Continuity & RPO/RTO Status
            </p>
          </div>
        </Space>
      </Card>

      {/* 2. Detailed Backup Records (9 Fields) */}
      <Title level={4} style={headerTextStyle}>Backup & DR Status – Detailed Records</Title>
      <div style={sectionStyle}>
        <Table {...tableProps} 
          dataSource={[
            { key: 1, res: 'VM-Prod-DB-01', type: 'VM (Windows)', status: 'Failed', last: '19-Jan', ret: '30 days', dr: 'Yes', rpo: '15 min', rto: '1 hr', risk: 'High' },
            { key: 2, res: 'VM-Prod-App-01', type: 'VM (Linux)', status: 'Success', last: '20-Jan', ret: '30 days', dr: 'Yes', rpo: '30 min', rto: '2 hr', risk: 'Low' },
            { key: 3, res: 'VM-Prod-Web-01', type: 'VM (Windows)', status: 'Success', last: '20-Jan', ret: '14 days', dr: 'No', rpo: 'N/A', rto: 'N/A', risk: 'Medium' },
            { key: 4, res: 'SQL-Prod-DB-01', type: 'Azure SQL DB', status: 'Success', last: '20-Jan', ret: '35 days', dr: 'No', rpo: '5 min', rto: '30 min', risk: 'Medium' },
            { key: 5, res: 'FileShare-Finance', type: 'Azure File Share', status: 'Failed', last: '18-Jan', ret: '30 days', dr: 'No', rpo: 'N/A', rto: 'N/A', risk: 'High' },
            { key: 6, res: 'VM-DR-ERP-01', type: 'VM (Windows)', status: 'Success', last: '20-Jan', ret: '60 days', dr: 'Yes', rpo: '15 min', rto: '1 hr', risk: 'Low' },
            { key: 7, res: 'VM-Test-01', type: 'VM (Dev/Test)', status: 'Partial', last: '20-Jan', ret: '7 days', dr: 'No', rpo: 'N/A', rto: 'N/A', risk: 'Low' },
            { key: 8, res: 'Storage-Logs-01', type: 'Blob Storage', status: 'Success', last: '19-Jan', ret: '90 days', dr: 'No', rpo: 'N/A', rto: 'N/A', risk: 'Low' },
            { key: 9, res: 'VM-Prod-API-01', type: 'VM (Linux)', status: 'Failed', last: '19-Jan', ret: '30 days', dr: 'Yes', rpo: '30 min', rto: '2 hr', risk: 'High' },
            { key: 10, res: 'SQL-DR-Replica', type: 'Azure SQL Geo-Replica', status: 'Success', last: '20-Jan', ret: '30 days', dr: 'Yes', rpo: '5 min', rto: '15 min', risk: 'Low' },
          ]} 
          columns={[
            { title: '#', dataIndex: 'key', width: 40 },
            { title: 'Resource Name', dataIndex: 'res', width: 160, render: (t) => <span style={{fontWeight: 600}}>{t}</span> },
            { title: 'Resource Type', dataIndex: 'type', width: 140 },
            { title: 'Backup Status', dataIndex: 'status', width: 130, render: (s) => (
               <Space>
                 {s === 'Success' ? <CheckCircleOutlined style={{color: '#52c41a'}}/> : s === 'Failed' ? <CloseCircleOutlined style={{color: '#ff4d4f'}}/> : <WarningOutlined style={{color: '#faad14'}}/>}
                 <span style={{color: s === 'Success' ? '#52c41a' : s === 'Failed' ? '#ff4d4f' : '#faad14', fontWeight: 600}}>{s}</span>
               </Space>
            )},
            { title: 'Last Backup', dataIndex: 'last', width: 100 },
            { title: 'Retention', dataIndex: 'ret', width: 100 },
            { title: 'DR Enabled', dataIndex: 'dr', align: 'center', width: 100, render: (d) => (
                <Tag color={d === 'Yes' ? 'success' : 'default'} bordered={false}>{d.toUpperCase()}</Tag>
            )},
            { title: 'RPO / RTO', width: 120, render: (_, r) => <Text type="secondary" style={{ fontSize: '12px' }}>{r.rpo} / {r.rto}</Text> },
            { title: 'Risk', dataIndex: 'risk', align: 'right', width: 110, render: (r) => (
                <Tag color={r === 'High' ? '#fff1f0' : r === 'Medium' ? '#fff7e6' : '#f6ffed'} 
                     style={{ border: `1px solid ${r === 'High' ? '#ffa39e' : r === 'Medium' ? '#ffd591' : '#b7eb8f'}`, color: r === 'High' ? '#cf1322' : r === 'Medium' ? '#d46b08' : '#389e0d', fontWeight: 700 }}>
                  ● {r.toUpperCase()}
                </Tag>
            )}
          ]} 
        />
      </div>

      {/* 3. RESTORED: DR (Azure Site Recovery) Status */}
      <Title level={4} style={headerTextStyle}>DR (Azure Site Recovery) Status</Title>
      <div style={sectionStyle}>
        <Table {...tableProps} 
          dataSource={[
            { key: 'dr1', vm: 'VM-Prod-DB-01', health: 'Warning', sync: '19-Jan', ready: 'No', test: 'Not Tested' },
            { key: 'dr2', vm: 'VM-Prod-App-01', health: 'Healthy', sync: '20-Jan', ready: 'Yes', test: 'Passed' },
            { key: 'dr3', vm: 'VM-Prod-API-01', health: 'Critical', sync: '19-Jan', ready: 'No', test: 'Failed' },
          ]} 
          columns={[
            { title: 'VM Name', dataIndex: 'vm', render: (t) => <span style={{fontWeight: 700}}>{t}</span> },
            { title: 'Replication Health', dataIndex: 'health', render: (h) => (
                <Tag icon={h === 'Healthy' ? <CheckCircleOutlined /> : <WarningOutlined />} 
                     color={h === 'Healthy' ? 'success' : h === 'Warning' ? 'warning' : 'error'}>
                  {h.toUpperCase()}
                </Tag>
            )},
            { title: 'Last Sync', dataIndex: 'sync' },
            { title: 'Failover Ready', dataIndex: 'ready', align: 'center', render: (r) => (
                <Space>
                    {r === 'Yes' ? <CheckCircleOutlined style={{color: '#52c41a'}}/> : <CloseCircleOutlined style={{color: '#ff4d4f'}}/>}
                    <span style={{color: r === 'Yes' ? '#52c41a' : '#ff4d4f', fontWeight: 600}}>{r}</span>
                </Space>
            )},
            { title: 'Test Failover', dataIndex: 'test', render: (t) => (
                <Tag bordered={false} style={{fontWeight: 600, background: t === 'Passed' ? '#f6ffed' : '#fff1f0', color: t === 'Passed' ? '#389e0d' : '#cf1322'}}>
                    {t.toUpperCase()}
                </Tag>
            )}
          ]} 
        />
      </div>

      {/* 4. Restore & DR Test Summary */}
      <Title level={4} style={headerTextStyle}>Restore & DR Test Summary</Title>
      <div style={sectionStyle}>
        <Table {...tableProps} 
          dataSource={[
            { key: 't1', type: 'VM Restore Test', run: '15-Jan', status: 'Success' },
            { key: 't2', type: 'SQL Point-in-Time Restore', run: '10-Jan', status: 'Success' },
            { key: 't3', type: 'DR Test Failover', run: '12-Jan', status: 'Failed' },
            { key: 't4', type: 'File Share Restore', run: '08-Jan', status: 'Success' },
          ]} 
          columns={[
            { title: 'Test Type', dataIndex: 'type', render: (t) => <Text strong>{t}</Text> },
            { title: 'Last Run', dataIndex: 'run' },
            { title: 'Status', dataIndex: 'status', align: 'right', render: (s) => (
                <Tag color={s === 'Success' ? 'success' : 'error'} bordered={false} style={{fontWeight: 600}}>
                    {s.toUpperCase()}
                </Tag>
            )}
          ]} 
        />
      </div>
    </div>
  );
};