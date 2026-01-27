import { Card, Typography, Divider, Tag, Tooltip } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import { TableComponent } from "@/components/TailAdminReports";
import { SummaryItem, GovernanceItem } from "@/types/dashboard.types";

interface Microsoft365TileProps {
  overallScore: number;
  summaryItems: SummaryItem[];
  identityGovernanceData: GovernanceItem[];
  adminRolesData: any[]; // Added missing prop to interface
  licenseUsageData?: any[]; // Optional prop for license usage data
  onRowClick: (record: any, tableType: string) => void;
  handleCardClickForMicrosoftUserType: (userType: string) => void;
}

export const Microsoft365Tile = ({
  overallScore,
  summaryItems,
  identityGovernanceData,
  adminRolesData, // Destructured here
  licenseUsageData,
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
        // Professional N/A Handling
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
            {/* Numerical Badge (e.g., 0/1 or 1/1) */}
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
            
            {/* Status Text with Icon */}
            <span style={{ color: statusColor, fontWeight: "700", fontSize: "14px" }}>
              {icon} {value}
            </span>
          </div>
        );
      },
    },
  ]}
  data={[
  ...(summaryItems || []).map((item: any) => {
    // LOG THE ITEM: Open your browser console (F12) and check this!
    console.log("Summary Item from Backend:", item); 

    return {
      ...item,
      // Priority 1: Use the number from the backend
      // Priority 2: If area is License and no number, it means data hasn't arrived (show 0/0)
      number: item.number ? item.number : (item.area === "License Optimization" ? "0/0" : "0/0"),
      status: item.status || "N/A",
    };
  }),
  { 
    area: "Overall Security Score", 
    status: `${overallScore} %`, 
    number: `${overallScore}/100`,
    color: overallScore > 70 ? 'green' : overallScore > 40 ? 'orange' : 'red',
  }
]}
  onRowClick={(record: any) => onRowClick(record, 'executive-summary')}
/></div>

        <Divider style={{ margin: '48px 0' }} />

        {/* Section 3: Admin Roles */}
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
              { 
                key: "assignedUsers", 
                label: "Assigned Users", 
                width: "30%" 
              },
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
            onRowClick={(Record) => handleCardClickForMicrosoftUserType(Record.role)}
          />
        </div>
                <Divider style={{ margin: '48px 0' }} />
        {/* License Usage & Cost Optimization */}
<div style={{ marginBottom: '24px' }}>
  <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
    License Usage & Cost Optimization
  </Typography.Title>
  <TableComponent
    title=""
    columns={[
      { 
        key: "licenseType", 
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
        render: (value) => (
          <Tag color="blue" style={{ borderRadius: '6px', border: 'none', fontWeight: '600', padding: '2px 10px' }}>
            {value}
          </Tag>
        )
      },
      { 
        key: "assigned", 
        label: "Assigned", 
        width: "14%",
        render: (value) => <span style={{ color: "#595959", fontWeight: '500' }}>{value}</span>
      },
      { 
        key: "unused", 
        label: "Unused", 
        width: "14%",
        render: (value) => (
          <span style={{ 
            fontWeight: "bold", 
            color: value > 0 ? "#faad14" : "#d9d9d9",
            backgroundColor: value > 0 ? '#fffbe6' : 'transparent',
            padding: '2px 8px',
            borderRadius: '4px'
          }}>
            {value}
          </span>
        )
      },
      { 
        key: "inactive", 
        label: "Inactive", 
        width: "14%",
        render: (value) => (
          value === "N/A" ? 
          <Tooltip title="Requires Reports.Read.All Permission">
            <Tag color="default" style={{ opacity: 0.6, fontStyle: 'italic' }}>N/A</Tag> 
          </Tooltip> :
          <Tag color={value > 0 ? "volcano" : "green"} style={{ borderRadius: '12px' }}>
            {value > 0 ? `${value} Inactive` : 'Active'}
          </Tag>
        )
      },
      { 
        key: "potentialSavings", 
        label: "Potential Savings", 
        width: "14%",
        render: (value) => (
          <div style={{ 
            fontWeight: "800", 
            color: (value !== "-" && value !== "$0.00") ? "#52c41a" : "#bfbfbf",
            fontSize: "16px",
            fontFamily: 'monospace'
          }}>
            {value === "-" ? "$0.00" : value}
          </div>
        )
      },
    ]}
    // FIX 1: Provide an empty array fallback to prevent TS2322
    data={licenseUsageData || []} 
    // FIX 2: Use onRowClick (the prop name) instead of handleRowClick
    onRowClick={(record) => onRowClick(record, 'license-usage')}
  />
</div>

        {/* Section 2: Identity Governance */}
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
                    color = "#ff4d4f"; bgColor = "#fff1f0";
                  } else if (record.category === "Inactive Users (>30 days)" && numValue > 0) {
                    color = "#faad14"; bgColor = "#fffbe6";
                  } else if (record.category === "Active Users") {
                    color = "#52c41a"; bgColor = "#f6ffed";
                  }

                  return (
                    <div style={{ display: "inline-block", padding: '4px 12px', borderRadius: '6px', backgroundColor: bgColor, color: color, fontWeight: "800", border: `1px solid ${color}40`, minWidth: '50px', textAlign: 'center', fontFamily: 'monospace', fontSize: '14px' }}>
                      {value}
                    </div>
                  );
                },
              },
            ]}
            onRowClick={(record) => onRowClick(record, 'user-identity-governance')}
          />
        </div>


      </div>
    </div>
  );
};