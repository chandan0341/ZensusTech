import { Table, Typography, Tag, Space, Card } from 'antd';
import { DollarOutlined, ArrowUpOutlined } from '@ant-design/icons';

const { Title } = Typography;

export const CostManagementTile = ({ selectedSubscription }: { selectedSubscription: string | null }) => {
  
  // Section style consistent with Security Findings cards
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
    size: "small" as const, // High-density layout
    pagination: false as const,
    bordered: false,
  };

  return (
    <div style={{ padding: '32px', background: '#f5f7f9', minHeight: '100%' }}>
      
      {/* 1. Header Banner - Updated to match Security Dashboard Gradient/Font weight */}
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
            <h2 style={{ margin: 0, color: 'white', fontSize: '24px', fontWeight: 800 }}>Cost Management (FinOps)</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
              Viewing: {selectedSubscription ?? 'Default'} | Monthly Spend Analysis
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
          ]} 
          columns={[
            { title: 'KPI', dataIndex: 'kpi', render: (t) => <span style={{fontWeight: 500}}>{t}</span> },
            { title: 'Value', dataIndex: 'value', align: 'right', render: (v) => <span style={{fontWeight: 700}}>{v}</span> }
          ]} 
        />
      </div>

      {/* 3. Cost by Subscription - Matching 'VM Security Status' Tag/Bullet Pattern */}
      <Title level={4} style={headerTextStyle}>Cost by Subscription</Title>
      <div style={sectionStyle}>
        <Table {...tableProps} 
          dataSource={[
            { key: 's1', sub: 'Prod-Subscription', cost: '3,45,000', mom: '15%', status: 'Near Limit' },
            { key: 's2', sub: 'Dev-Test-Subscription', cost: '1,40,000', mom: '5%', status: 'Within Budget' },
          ]} 
          columns={[
            { title: 'Subscription', dataIndex: 'sub', render: (t) => <span style={{fontWeight: 600}}>{t}</span> },
            { title: 'Monthly Cost (₹)', dataIndex: 'cost', align: 'right', render: (v) => <span>{v}</span> },
            { title: 'MoM Change', dataIndex: 'mom', align: 'center', render: (m) => <span style={{color: '#cf1322', fontWeight: 600}}>{m} <ArrowUpOutlined style={{fontSize: '12px'}}/></span> },
            { title: 'Status', dataIndex: 'status', align: 'right', render: (s) => (
                <Tag color={s === 'Near Limit' ? '#fff1f0' : '#f6ffed'} 
                     style={{ 
                        border: `1px solid ${s === 'Near Limit' ? '#ffa39e' : '#b7eb8f'}`, 
                        color: s === 'Near Limit' ? '#cf1322' : '#389e0d', 
                        fontWeight: 700 
                     }}>
                  ● {s.toUpperCase()}
                </Tag>
            )}
          ]} 
        />
      </div>

      {/* 4. Optimization Opportunities - Matching 'Top Recommendations' Font/Color Pattern */}
      <Title level={4} style={headerTextStyle}>Cost Optimization Opportunities</Title>
      <div style={sectionStyle}>
        <Table {...tableProps} 
          dataSource={[
            { key: 1, res: 'VM-Prod-DB-01', type: 'Virtual Machine', issue: 'Low CPU usage', save: '22,000' },
            { key: 2, res: 'SQL-Prod-DB', type: 'Azure SQL DB', issue: 'Overprovisioned', save: '15,000' },
            { key: 3, res: 'Disk-Orphan-03', type: 'Managed Disk', issue: 'Unattached', save: '6,000' },
          ]} 
          columns={[
            { title: 'Resource Name', dataIndex: 'res', render: (t) => <span style={{fontWeight: 600}}>{t}</span> },
            { title: 'Type', dataIndex: 'type' },
            { title: 'Issue Identified', dataIndex: 'issue', render: (i) => (
                <Tag color="#fff7e6" style={{ border: '1px solid #ffd591', color: '#d46b08', fontWeight: 600 }}>{i}</Tag>
            )},
            { title: 'Est. Savings (₹)', dataIndex: 'save', align: 'right', render: (s) => <span style={{fontWeight: 700, color: '#389e0d'}}>₹{s}</span> }
          ]} 
        />
      </div>
    </div>
  );
};