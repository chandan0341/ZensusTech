import { Button } from "antd";

export const DashboardHeader = () => {
  return (
    <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "10px 0" }}>
        <img 
          src="/zensustech-logo-2.png" 
          alt="ZensusTech Logo" 
          style={{ 
            height: "56px", 
            width: "56px",
            objectFit: "contain"
          }} 
        />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h1 style={{ 
            fontSize: "24px", 
            fontWeight: "800", 
            color: "#003a8c",
            margin: 0,
            lineHeight: "1.2",
            letterSpacing: "-0.02em"
          }}>
            ZensusTech <span style={{ color: "#1890ff", fontWeight: "400" }}>ZenAIOps™</span>
          </h1>
          <p style={{ 
            fontSize: "13px", 
            fontWeight: "500", 
            color: "#595959",
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            AI-Powered Azure Managed Services Dashboard
          </p>
        </div>
      </div>
      <Button type="primary" danger onClick={() => { window.location.href = "/login"; }}>
        Log Out
      </Button>
    </div>
  );
};
