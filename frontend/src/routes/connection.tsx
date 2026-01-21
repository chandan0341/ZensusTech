import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, Form, Input, Button, Alert, message } from "antd";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCredentials } from "@/context/CredentialsContext";
import { useState, useEffect } from "react";

// Reusable Input Component
const InputField = ({
  name,
  label,
  control,
  placeholder,
}: {
  name: string;
  label: string;
  control: any; // react-hook-form Control type
  placeholder: string;
}) => (
  <Controller
    name={name}
    control={control}
    render={({ field, fieldState: { error } }) => (
      <Form.Item
        label={label}
        validateStatus={error ? "error" : ""}
        help={error?.message}
      >
        <Input placeholder={placeholder} {...field} />
      </Form.Item>
    )}
  />
);

// Zod schema for validation
const credentialsSchema = z.object({
  clientId: z.string().min(1, { message: "Client ID is required" }),
  clientSecret: z.string().min(1, { message: "Client Secret is required" }),
  tenantId: z.string().min(1, { message: "Tenant ID is required" }),
});

type CredentialsFormData = z.infer<typeof credentialsSchema>;

export const Route = createFileRoute("/connection")({
  component: ConnectionPage,
  head: () => ({
    meta: [
      {
        title: "Enter Connection Details - ZensusTech",
      },
    ],
  }),
});

function ConnectionPage() {
  const navigate = useNavigate();
  const { setCredentials } = useCredentials();
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, watch } = useForm<CredentialsFormData>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      clientId: "",
      clientSecret: "",
      tenantId: "",
    },
  });

  const [isTesting, setIsTesting] = useState(false);
  const [isValidConnection, setIsValidConnection] = useState(false);

  // Reset Run button if any input changes after testing
  useEffect(() => {
    const subscription = watch(() => {
      setIsValidConnection(false);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // Function to test connection by calling token API
  const testConnection = async (data: CredentialsFormData) => {
    setIsTesting(true);
    setFormError(null);

    try {
  const payload = {
  tenant_id: data.tenantId,      // from form input
  client_id: data.clientId,      // from form input
  client_secret: data.clientSecret, // from form input
  scope: "https://management.azure.com/.default", // required by Azure API
};


      const response = await fetch("http://localhost:8000/api/v1/azure/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsValidConnection(true); // enable Run button
        message.success("Connection successful! You can now run the dashboard.");
      } else {
        const errorData = await response.json();
        setFormError(errorData.message || "Connection failed");
        setIsValidConnection(false);
      }
    } catch (err) {
      console.error(err);
      setFormError("Connection failed. Please check your credentials.");
      setIsValidConnection(false);
    } finally {
      setIsTesting(false);
    }
  };

  // Function called when Run Dashboard is clicked
  const onSubmit = (data: CredentialsFormData) => {
    setCredentials(data.clientId, data.clientSecret, data.tenantId);
    navigate({
      to: "/dashboard",
      search: { from: "connection" },
    });
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#f5f5f5",
      }}
    >
      <Card
        title="ZensusTech Connection"
        style={{ width: "100%", maxWidth: "450px" }}
        headStyle={{
          background: "#1890ff",
          color: "white",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <p style={{ marginBottom: "24px", color: "#666" }}>
          Connect your Azure account to access governance insights
        </p>

        <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
          <InputField
            name="tenantId"
            label="Tenant ID"
            control={control}
            placeholder="Enter your Tenant ID"
          />
          <InputField
            name="clientId"
            label="Client ID"
            control={control}
            placeholder="Enter your Client ID"
          />
          <InputField
            name="clientSecret"
            label="Client Secret"
            control={control}
            placeholder="Enter your Client Secret"
          />

          {formError && (
            <Alert
              message="Error"
              description={formError}
              type="error"
              showIcon
              style={{ marginBottom: "16px" }}
              closable
              onClose={() => setFormError(null)}
            />
          )}

          <Form.Item>
            <Button
              type="default"
              block
              size="large"
              loading={isTesting}
              onClick={handleSubmit(testConnection)}
            >
              Test Connection
            </Button>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              block
              size="large"
              htmlType="submit"
              disabled={!isValidConnection}
            >
              Run the Dashboard
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
