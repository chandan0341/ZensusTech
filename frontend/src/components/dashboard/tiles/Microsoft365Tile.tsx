import { Card, Typography, Divider, Tag } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import { TableComponent } from "@/components/TailAdminReports";
import { SummaryItem } from "@/types/dashboard.types";

interface Microsoft365TileProps {
  overallScore: number;
  summaryItems: SummaryItem[];
  adminRolesData: any[];
  licenseUsageData?: any[];
  onRowClick: (record: any, tableType: string) => void;
  handleCardClickForMicrosoftUserType: (userType: string) => void;
}

export const Microsoft365Tile = ({
  overallScore = 0,
  summaryItems = [], // Enforce default empty array
  adminRolesData = [], // Enforce default empty array
  licenseUsageData = [], // Enforce default empty array
  onRowClick,
  handleCardClickForMicrosoftUserType,
}: Microsoft365TileProps) => {
  return (
    <div>
      {/* Header Card */}
      <Card
        style={{
          borderRadius: '16px',
          border: '2px solid #722ed1',
          boxShadow: '0 4px 12px rgba(114,46,209,0.15)',
          overflow: 'hidden',
          marginBottom: '24px'
        }}
        bodyStyle={{ padding: '0' }}
      >
        <div style={{
          background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
          padding: '20px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TeamOutlined style={{ fontSize: '32px' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                Microsoft 365 Managed Services
              </h2>
              <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
                Exchange, SharePoint & Teams Administration
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div style={{ padding: '24px' }}>
        {/* Section 1: Executive Summary */}
        <div style={{ marginBottom: '24px' }}>
          <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
            Executive Summary (CXO View)
          </Typography.Title>
          <TableComponent
            title=""
            columns={[
              {
                key: "area",
                label: "Area",
                width: "40%",
                render: (value: string, record: any) => (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: "600", color: "#1a3353" }}>{value}</span>
                    {record.note && (
                      <span style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: '400' }}>
                        {record.note}
                      </span>
                    )}
                  </div>
                )
              },
              {
                key: "status",
                label: "Result / Status",
                width: "60%",
                render: (value: string, record: any) => {
                  if (value === "N/A" || record.color === 'grey') {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ backgroundColor: '#f0f2f5', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', color: '#8c8c8c', border: '1px solid #d9d9d9' }}>
                          0/0
                        </span>
                        <div style={{ backgroundColor: "#f5f5f5", color: "#8c8c8c", padding: "4px 10px", borderRadius: "4px", fontSize: "12px", fontStyle: "italic" }}>
                          N/A
                        </div>
                      </div>
                    );
                  }

                  const statusColor = record.color === 'red' ? '#ff4d4f' :
                    record.color === 'orange' ? '#faad14' :
                    record.color === 'green' ? '#52c41a' : '#1890ff';

                  const icon = record.color === 'red' ? "🛑" :
                    record.color === 'orange' ? "⚠️" :
                    record.color === 'green' ? "✅" : "📊";

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        backgroundColor: '#f0f2f5',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#595959',
                        border: '1px solid #d9d9d9'
                      }}>
                        {record.number}
                      </span>
                      <span style={{ color: statusColor, fontWeight: "700", fontSize: "14px" }}>
                        {icon} {value}
                      </span>
                    </div>
                  );
                },
              },
            ]}
            data={[
              ...(summaryItems || []).map((item: any) => ({
                ...item,
                number: item?.number || "0/0",
                status: item?.status || "N/A",
              })),
              {
                area: "Overall Security Score",
                status: `${overallScore}%`,
                number: `${overallScore}/100`,
                color: overallScore > 70 ? 'green' : overallScore > 40 ? 'orange' : 'red',
              }
            ]}
            onRowClick={(record: any) => onRowClick(record, 'executive-summary')}
          />
        </div>

        <Divider style={{ margin: '48px 0' }} />

        {/* Section 2: Admin Roles */}
        <div style={{ marginBottom: '24px' }}>
          <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
            Admin Roles & Privileged Access
          </Typography.Title>
          <TableComponent
            title=""
            data={adminRolesData || []}
            columns={[
              {
                key: "role",
                label: "Role",
                width: "40%",
                render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>
              },
              { key: "assignedUsers", label: "Assigned Users", width: "30%" },
              {
                key: "mfaEnabled",
                label: "MFA Status",
                width: "30%",
                render: (value: string) => {
                  const isIssue = value?.includes('❌');
                  return (
                    <span style={{
                      fontWeight: "bold",
                      color: isIssue ? "#cf1322" : "#389e0d",
                      background: isIssue ? "#fff1f0" : "#f6ffed",
                      border: `1px solid ${isIssue ? "#ffa39e" : "#b7eb8f"}`,
                      padding: "4px 10px",
                      borderRadius: "4px",
                      display: "inline-flex",
                      alignItems: "center"
                    }}>
                      {value === "✅" ? "✅ All Enabled" : value}
                    </span>
                  );
                },
              },
            ]}
            onRowClick={(record) => handleCardClickForMicrosoftUserType(record.role)}
          />
        </div>

        <Divider style={{ margin: '48px 0' }} />

        {/* Section 3: License Usage */}
        <div style={{ marginBottom: '24px' }}>
          <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
            License Usage & Cost Optimization
          </Typography.Title>
          <TableComponent
            title=""
            columns={[
              {
                key: "license",
                label: "License Type",
                width: "30%",
                render: (value) => (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: "700", color: "#1a3353", fontSize: "14px" }}>
                      {value?.replace(/_/g, ' ') || "N/A"}
                    </span>
                    <span style={{ fontSize: '11px', color: '#8c8c8c' }}>Microsoft O365</span>
                  </div>
                )
              },
              {
                key: "purchased",
                label: "Purchased",
                width: "14%",
                render: (value) => <Tag color="blue">{value}</Tag>
              },
              { key: "assigned", label: "Assigned", width: "14%" },
              {
                key: "unused",
                label: "Unused",
                width: "14%",
                render: (value) => (
                  <span style={{ fontWeight: "bold", color: value > 0 ? "#faad14" : "#d9d9d9" }}>
                    {value}
                  </span>
                )
              },
              {
                key: "inactive",
                label: "Inactive",
                width: "14%",
                render: (value) => (
                  value === "N/A" ? <Tag>N/A</Tag> : <Tag color={value > 0 ? "volcano" : "green"}>{value}</Tag>
                )
              },
              {
                key: "potentialSavings",
                label: "Potential Savings",
                width: "14%",
                render: (value) => <span style={{ color: "#52c41a", fontWeight: '800' }}>{value || "$0.00"}</span>
              },
            ]}
            data={licenseUsageData || []}
            onRowClick={(record) => onRowClick(record, 'license-usage')}
          />
        </div>

        <Divider style={{ margin: '48px 0' }} />
      </div>
    </div>
  );
};