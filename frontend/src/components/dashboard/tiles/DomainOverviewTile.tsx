import { Card, Row, Col, Typography, Alert, Divider } from "antd"; // Added Divider
import { TeamOutlined, LockOutlined, ClockCircleOutlined, GlobalOutlined } from "@ant-design/icons";
import { TableComponent } from "@/components/TailAdminReports";

interface DomainOverviewTileProps {
  sslCertificates: any[];
  sslError: string | null;
}

export const DomainOverviewTile = ({ sslCertificates, sslError }: DomainOverviewTileProps) => {
  return (
    <div>
      <Card
        style={{
          borderRadius: '16px',
          border: '2px solid #52c41a',
          boxShadow: '0 4px 12px rgba(82,196,26,0.15)',
          overflow: 'hidden',
          marginBottom: '24px'
        }}
        bodyStyle={{ padding: '0' }}
      >
        <div style={{
          background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
          padding: '20px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <GlobalOutlined style={{ fontSize: '32px' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                Domain Overview Dashboard
              </h2>
              <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
                Domain Health & Security Monitoring
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div style={{ padding: '24px' }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
          Domain Health Summary
        </Typography.Title>
        
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                borderRadius: '12px',
                border: '1px solid #e8e8e8',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              bodyStyle={{ padding: '20px', textAlign: 'center' }}
            >
              <div style={{ marginBottom: '8px' }}>
                <GlobalOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#52c41a', marginBottom: '4px' }}>
                5
              </div>
              <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
                Active Domains
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                borderRadius: '12px',
                border: '1px solid #e8e8e8',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              bodyStyle={{ padding: '20px', textAlign: 'center' }}
            >
              <div style={{ marginBottom: '8px' }}>
                <ClockCircleOutlined style={{ fontSize: '24px', color: '#faad14' }} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#faad14', marginBottom: '4px' }}>
                2
              </div>
              <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
                Expiring Soon
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                borderRadius: '12px',
                border: '1px solid #e8e8e8',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              bodyStyle={{ padding: '20px', textAlign: 'center' }}
            >
              <div style={{ marginBottom: '8px' }}>
                <LockOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1890ff', marginBottom: '4px' }}>
                4
              </div>
              <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
                SSL Secured
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                borderRadius: '12px',
                border: '1px solid #e8e8e8',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              bodyStyle={{ padding: '20px', textAlign: 'center' }}
            >
              <div style={{ marginBottom: '8px' }}>
                <TeamOutlined style={{ fontSize: '24px', color: '#722ed1' }} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#722ed1', marginBottom: '4px' }}>
                12
              </div>
              <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
                DNS Records
              </div>
            </Card>
          </Col>
        </Row>

        {/* --- ADDED SPACING SECTION START --- */}
        <Divider style={{ margin: '64px 0 40px 0', borderTopColor: '#f0f0f0' }} />
        
        <div style={{ marginBottom: '24px' }}>
          <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '32px' }}>
            SSL Certificate Expiry Report
          </Typography.Title>
        {/* --- ADDED SPACING SECTION END --- */}

          <TableComponent
            title=""
            columns={[
              { key: 'num', label: '#', width: '5%' },
              { key: 'domain', label: 'Domain / Endpoint', width: '30%' },
              { key: 'expiryDate', label: 'Expiry Date', width: '20%' },
              { key: 'daysToExpiry', label: 'Days to Expiry', width: '15%' },
              { key: 'status', label: 'Status', width: '30%' },
            ]}
            data={sslCertificates.map((cert, idx) => {
              const days = Number(cert.daysToExpiry);
              let statusLabel = '🟢 Expiring in >30 days';
              let statusColor = '#16a34a';
              let bgColor = '#dcfce7';

              if (days <= 7) {
                statusLabel = '🔴 Expiring in ≤7 days';
                statusColor = '#dc2626';
                bgColor = '#fee2e2';
              } else if (days <= 30) {
                statusLabel = '🟠 Expiring in ≤30 days';
                statusColor = '#d97706';
                bgColor = '#fef3c7';
              }

              return {
                num: idx + 1,
                domain: cert.domain,
                expiryDate: cert.expiryDate,
                daysToExpiry: <strong>{days} days</strong>,
                status: (
                  <span style={{
                    backgroundColor: bgColor,
                    color: statusColor,
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    display: 'inline-block',
                    border: `1px solid ${statusColor}40`,
                    minWidth: '160px',
                    textAlign: 'center'
                  }}>
                    {statusLabel}
                  </span>
                ),
              };
            })}
          />
          {sslError && <Alert type="error" message={sslError} showIcon style={{ marginTop: 12 }} />}
        </div>
      </div>
    </div>
  );
};