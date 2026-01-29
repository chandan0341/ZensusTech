import { Table, Typography, Tag, Space, Card } from 'antd';
import { DollarOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export const CostManagementTile = ({ selectedSubscription }: { selectedSubscription: string | null }) => {
  
  // Matches the Security Dashboard section pattern
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

  const tableProps = {
    size: "middle" as const,
    pagination: false as const,
    bordered: false,
  };

  return (
    <div style={{ padding: '32px', background: '#f5f7f9', minHeight: '100%' }}>
      
      {/* 1. Header Banner - Matching the Security Dashboard Orange Pattern */}
      <Card
        style={{ 
          borderRadius: '12px', 
          background: 'linear-gradient(135deg, #e67e22 0%, #f39c12 100%)', 
          border: 'none', 
          marginBottom: '40px',
          boxShadow: '0 8px 16px rgba(230, 126, 34, 0.25)'
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <Space size="large">
          <div style={{ background: 'rgba(255,255,255,0.25)', padding: '12px', borderRadius: '10px' }}>
            <DollarOutlined style={{ fontSize: '32px', color: 'white' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: 800 }}>Cost Management (FinOps)</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
              Subscription: {selectedSubscription ?? 'Default'} | Cloud Spend & Savings
            </p>
          </div>
        </Space>
      </Card>

      {/* 2. Cost KPIs - Matching 'Azure Security Posture' Pattern */}
      <Title level={4} style={headerTextStyle}>Cost KPIs</Title>
      <div style={sectionStyle}>
        <Table {...tableProps} 
          dataSource={[
            { key: '1', kpi: 'Total Monthly Spend', value: '₹ 4,85,000' },
            { key: '2', kpi: 'MoM Cost Change', value: '12%' },
            { key: '3', kpi: 'Forecast Next Month', value: '₹ 5,20,000' },
            { key: '4', kpi: 'Potential Monthly Savings', value: '₹ 92,000' },
            { key: '5', kpi: 'Idle / Underutilized Resources', value: '9' },
            { key: '6', kpi: 'Budget Threshold Breached', value: '1 Subscription' },
          ]} 
          columns={[
            { title: 'KPI', dataIndex: 'kpi', render: (t) => <span style={{fontWeight: 500}}>{t}</span> },
            { title: 'Value', dataIndex: 'value', align: 'right', render: (v) => <span style={{fontWeight: 700}}>{v}</span> }
          ]} 
        />
      </div>

      {/* 3. Cost by Subscription - Matching 'VM Security Status' Pattern */}
      <Title level={4} style={headerTextStyle}>Cost by Subscription</Title>
      <div style={sectionStyle}>
        <Table {...tableProps} 
          dataSource={[
            { key: 's1', sub: 'Prod-Subscription', cost: '3,45,000', mom: '15%', status: 'Near Limit' },
            { key: 's2', sub: 'Dev-Test-Subscription', cost: '1,40,000', mom: '5%', status: 'Within Budget' },
          ]} 
          columns={[
            { title: 'Subscription', dataIndex: 'sub', render: (t) => <span style={{fontWeight: 700}}>{t}</span> },
            { title: 'Monthly Cost (₹)', dataIndex: 'cost', align: 'right' },
            { title: 'MoM Change', dataIndex: 'mom', align: 'center', render: (m) => <Text type="danger" style={{fontWeight: 600}}>{m} ↑</Text> },
            { title: 'Status', dataIndex: 'status', render: (s) => (
              <Tag color={s.includes('Near') ? '#fff1f0' : '#f6ffed'} 
                   style={{ border: `1px solid ${s.includes('Near') ? '#ffa39e' : '#b7eb8f'}`, color: s.includes('Near') ? '#cf1322' : '#389e0d', fontWeight: 600 }}>
                {s.toUpperCase()}
              </Tag>
            )}
          ]} 
        />
      </div>

      {/* 4. Optimization Opportunities - Matching 'Top Recommendations' Pattern */}
      <Title level={4} style={headerTextStyle}>Cost Optimization Opportunities</Title>
      <div style={sectionStyle}>
        <Table {...tableProps} 
          dataSource={[
            { key: 1, res: 'VM-Prod-DB-01', type: 'Virtual Machine', issue: 'Low CPU usage (<10%)', rec: 'Resize to lower SKU', save: '22,000' },
            { key: 2, res: 'VM-Test-App-02', type: 'Virtual Machine', issue: 'Running 24×7', rec: 'Schedule shutdown', save: '18,000' },
            { key: 3, res: 'SQL-Prod-DB', type: 'Azure SQL DB', issue: 'Overprovisioned DTUs', rec: 'Reduce DTUs', save: '15,000' },
            { key: 4, res: 'Storage-Logs-01', type: 'Storage Account', issue: 'Hot tier unused data', rec: 'Move to Cool tier', save: '6,500' },
          ]} 
          columns={[
            { title: '#', dataIndex: 'key', width: 60 },
            { title: 'Resource Name', dataIndex: 'res', render: (t) => <span style={{fontWeight: 600}}>{t}</span> },
            { title: 'Type', dataIndex: 'type' },
            { title: 'Issue Identified', dataIndex: 'issue', render: (i) => <Text style={{color: '#d46b08'}}>{i}</Text> },
            { title: 'Recommendation', dataIndex: 'rec' },
            { title: 'Est. Savings (₹)', dataIndex: 'save', align: 'right', render: (s) => <span style={{fontWeight: 700, color: '#389e0d'}}>₹ {s}</span> }
          ]} 
        />
      </div>

      {/* 5. Cost by Service - Matching 'Secure Score Breakdown' Pattern */}
      <Title level={4} style={headerTextStyle}>Cost by Service</Title>
      <div style={sectionStyle}>
        <Table {...tableProps} 
          dataSource={[
            { key: 'v1', svc: 'Virtual Machines', cost: '2,10,000', pct: '43%' },
            { key: 'v2', svc: 'Azure SQL', cost: '85,000', pct: '18%' },
            { key: 'v3', svc: 'Networking', cost: '70,000', pct: '14%' },
            { key: 'v4', svc: 'Storage', cost: '65,000', pct: '13%' },
            { key: 'v5', svc: 'Backup & DR', cost: '55,000', pct: '12%' },
          ]} 
          columns={[
            { title: 'Service', dataIndex: 'svc', render: (t) => <span style={{fontWeight: 600}}>{t}</span> },
            { title: 'Monthly Cost (₹)', dataIndex: 'cost', align: 'right' },
            { title: '% of Total', dataIndex: 'pct', align: 'right', render: (p) => <Tag color="blue" style={{fontWeight: 600}}>{p}</Tag> }
          ]} 
        />
      </div>
    </div>
  );
};