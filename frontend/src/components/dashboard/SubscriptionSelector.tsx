import { Card, Form, Select, Row, Col } from "antd";
import { SubscriptionOption } from "@/types/dashboard.types";

interface SubscriptionSelectorProps {
  selectedTenant: string;
  selectedSubscription: string;
  azureSubscriptions: SubscriptionOption[];
  loading: boolean;
  onTenantChange: (tenantId: string) => void;
  onSubscriptionChange: (subscriptionId: string) => void;
  tenantId?: string;
}

export const SubscriptionSelector = ({
  selectedTenant,
  selectedSubscription,
  azureSubscriptions,
  loading,
  onTenantChange,
  onSubscriptionChange,
  tenantId,
}: SubscriptionSelectorProps) => {
  return (
    <Card style={{ marginBottom: "24px" }}>
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form layout="vertical">
            <Form.Item label="Tenant Organization">
              <Select
                value={selectedTenant}
                onChange={onTenantChange}
                placeholder="Select a tenant"
                options={[
                  { value: tenantId!, label: tenantId! }
                ]}
              />
            </Form.Item>
          </Form>
        </Col>
        <Col xs={24} sm={12}>
          <Form layout="vertical">
            <Form.Item label="Subscription">
              <Select
                loading={loading}
                value={selectedSubscription}
                onChange={onSubscriptionChange}
                disabled={azureSubscriptions.length === 0 || loading}
                placeholder={azureSubscriptions.length === 0 ? "No enabled subscriptions found" : "Select a subscription"}
                options={azureSubscriptions}
              />
            </Form.Item>
          </Form>
        </Col>
      </Row>
    </Card>
  );
};
