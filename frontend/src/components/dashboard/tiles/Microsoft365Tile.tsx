import { Card, Typography } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import { TableComponent } from "@/components/TailAdminReports";
import { SummaryItem, GovernanceItem } from "@/types/dashboard.types";

interface Microsoft365TileProps {
  overallScore: number;
  summaryItems: SummaryItem[];
  identityGovernanceData: GovernanceItem[];
  onRowClick: (record: any, tableType: string) => void;
}

export const Microsoft365Tile = ({
  overallScore,
  summaryItems,
  identityGovernanceData,
  onRowClick,
}: Microsoft365TileProps) => {
  return (
    <div>
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
                width: "60%",
                render: (value: string) => <span style={{ fontWeight: "600", color: "#1a3353" }}>{value}</span>
              },
              {
                key: "status",
                label: "Status",
                width: "40%",
                render: (value: string) => {
                  const statusMap: Record<string, { color: string; icon: string }> = {
                    "Needs Improvement": { color: "#ff4d4f", icon: "🔴" },
                    "High Risk": { color: "#ff4d4f", icon: "🔴" },
                    "Savings Possible": { color: "#ff4d4f", icon: "🔴" },
                    "Good": { color: "#52c41a", icon: "🟢" },
                    "Optimized": { color: "#52c41a", icon: "🟢" },
                    "Medium": { color: "#faad14", icon: "🟡" },
                  };

                  const isScore = value.includes('/');
                  const config = statusMap[value] || { 
                    color: isScore ? (parseInt(value) > 70 ? "#52c41a" : "#ff4d4f") : "#1890ff", 
                    icon: isScore ? "📊" : "ℹ️" 
                  };

                  return (
                    <span style={{
                      color: config.color,
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "14px"
                    }}>
                      {config.icon} {value}
                    </span>
                  );
                },
              },
            ]}
            data={[
              ...summaryItems,
              { 
                area: "Overall Security Score", 
                status: `${overallScore} / 100`, 
                color: overallScore > 70 ? "success" : "error" 
              }
            ]}
            onRowClick={(record: any) => onRowClick(record, 'executive-summary')}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
            User & Identity Governance Report
          </Typography.Title>
          <TableComponent
            title=""
            data={identityGovernanceData} 
            columns={[
              { 
                key: "category", 
                label: "Category", 
                width: "60%",
                render: (text: string) => {
                  const iconMap: Record<string, string> = {
                    "Total Users": "📊",
                    "Active Users": "👤",
                    "Guest Users": "🌐",
                    "Inactive Users (>30 days)": "⏳",
                    "Privileged Users": "🛡️"
                  };
                  return (
                    <span style={{ fontWeight: "600", color: "#1a3353", display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{iconMap[text] || "🔹"}</span>
                      {text}
                    </span>
                  );
                }
              },
              {
                key: "count",
                label: "Count",
                width: "40%",
                render: (value: any, record: any) => {
                  const numValue = parseInt(value) || 0;
                  let color = "#1890ff";
                  let bgColor = "#e6f7ff";

                  if (record.category === "Privileged Users" && numValue > 5) {
                    color = "#ff4d4f";
                    bgColor = "#fff1f0";
                  } else if (record.category === "Inactive Users (>30 days)" && numValue > 0) {
                    color = "#faad14";
                    bgColor = "#fffbe6";
                  } else if (record.category === "Active Users") {
                    color = "#52c41a";
                    bgColor = "#f6ffed";
                  }

                  return (
                    <div style={{
                      display: "inline-block",
                      padding: '4px 12px',
                      borderRadius: '6px',
                      backgroundColor: bgColor,
                      color: color,
                      fontWeight: "800",
                      border: `1px solid ${color}40`,
                      minWidth: '50px',
                      textAlign: 'center',
                      fontFamily: 'monospace',
                      fontSize: '14px'
                    }}>
                      {value}
                    </div>
                  );
                },
              },
            ]}
            onRowClick={(record) => onRowClick(record, 'user-identity-governance')}
          />
        </div>

        {/* Add more sections as needed - License Usage, Admin Roles, etc. */}
      </div>
    </div>
  );
};
