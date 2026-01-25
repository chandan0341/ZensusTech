import { Card, Row, Col, Badge, Tag, Typography } from "antd";
import { SubscriptionMetadata } from "@/types/dashboard.types";

interface SubscriptionMetadataBarProps {
  subMetadata: SubscriptionMetadata | null;
  loading: boolean;
}

export const SubscriptionMetadataBar = ({ subMetadata, loading }: SubscriptionMetadataBarProps) => {
  if (!subMetadata || loading) return null;

  return (
    <Card 
      size="small" 
      style={{ 
        marginBottom: "24px", 
        borderRadius: "8px", 
        background: "#ffffff",
        borderLeft: `4px solid ${subMetadata.state === 'Enabled' ? '#1890ff' : '#ff4d4f'}`,
        boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
      }}
    >
      <Row align="middle" gutter={24}>
        <Col>
          <div style={{ color: "#8c8c8c", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>Status</div>
          <Badge 
            status={subMetadata.state === "Enabled" ? "success" : "error"} 
            text={<span style={{ fontWeight: "600" }}>{subMetadata.state}</span>} 
          />
        </Col>

        <Col style={{ borderLeft: "1px solid #f0f0f0", height: "30px" }} />

        <Col>
          <div style={{ color: "#8c8c8c", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>Spending Limit</div>
          <Tag 
            color={subMetadata.subscriptionPolicies?.spendingLimit === "Off" ? "green" : "orange"} 
            style={{ borderRadius: "10px", fontWeight: "600", margin: 0 }}
          >
            {subMetadata.subscriptionPolicies?.spendingLimit || "Unknown"}
          </Tag>
        </Col>

        <Col style={{ borderLeft: "1px solid #f0f0f0", height: "30px" }} />

        <Col>
          <div style={{ color: "#8c8c8c", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>Auth Source</div>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#262626" }}>
            {subMetadata.authorizationSource}
          </span>
        </Col>

        <Col flex="auto" style={{ textAlign: "right" }}>
          <div style={{ color: "#8c8c8c", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>Subscription ID</div>
          <Typography.Text 
            copyable={{ text: subMetadata.subscriptionId }}
            style={{ 
              background: "#f5f5f5", 
              padding: "4px 8px", 
              borderRadius: "4px", 
              fontSize: "12px", 
              color: "#1890ff",
              fontFamily: "monospace" 
            }}
          >
            {subMetadata.subscriptionId}
          </Typography.Text>
        </Col>
      </Row>
    </Card>
  );
};
