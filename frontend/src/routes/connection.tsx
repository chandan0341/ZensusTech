import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, Form, Input, Button, Alert, message, Space } from "antd"; 
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useCredentials } from "@/hooks/useCredentials"; 

// --- Reusable Input Component ---
const InputField = ({ name, label, control, placeholder, type = "text" }: any) => (
  <Controller
    name={name}
    control={control}
    render={({ field, fieldState: { error } }) => (
      <Form.Item label={label} validateStatus={error ? "error" : ""} help={error?.message}>
        {type === "password" ? (
          <Input.Password placeholder={placeholder} {...field} />
        ) : (
          <Input placeholder={placeholder} {...field} />
        )}
      </Form.Item>
    )}
  />
);

const credentialsSchema = z.object({
  clientId: z.string().min(1, { message: "Client ID is required" }),
  clientSecret: z.string().min(1, { message: "Client Secret is required" }),
  tenantId: z.string().min(1, { message: "Tenant ID is required" }),
});

type CredentialsFormData = z.infer<typeof credentialsSchema>;

export const Route = createFileRoute("/connection")({
  component: ConnectionPage,
});

function ConnectionPage() {
  const navigate = useNavigate();
  const { setConnectionSuccess } = useCredentials(); 
  const [formError, setFormError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isValidConnection, setIsValidConnection] = useState(false);

  const { control, handleSubmit, watch } = useForm<CredentialsFormData>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { clientId: "", clientSecret: "", tenantId: "" },
  });

  // Resets "Run" button if inputs change
  useEffect(() => {
    const subscription = watch(() => setIsValidConnection(false));
    return () => subscription.unsubscribe();
  }, [watch]);

  const handleConnect = async (data: CredentialsFormData, isTestOnly: boolean) => {
    setIsTesting(true);
    setFormError(null);
    
    try {
      const response = await fetch('/api/v1/connect', { 
        method: 'POST', 
        body: JSON.stringify(data), 
        headers: { 'Content-Type': 'application/json' },
        // Removed credentials: 'include' as we are moving away from cookies
      });

      if (response.ok) {
        const result = await response.json();
        
        // --- TOKEN STORAGE ---
        // Save tokens to localStorage so your dashboard hooks can access them
        localStorage.setItem('mgmt_token', result.mgmt_token);
        localStorage.setItem('graph_token', result.graph_token);
        localStorage.setItem('tenant_id', result.tenant_id);

        setIsValidConnection(true);
        message.success("Connection verified successfully!");
        
        // Update global state context
        setConnectionSuccess(data.tenantId); 
        
        if (!isTestOnly) {
          navigate({ to: '/dashboard' }); 
        }
      } else {
        const err = await response.json();
        setFormError(err.detail || "Authentication failed. Check your credentials.");
      }
    } catch (error) {
      setFormError("Could not reach the server. Is your backend running?");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f0f2f5" }}>
      <Card
        title="ZensusTech Connection"
        style={{ width: "100%", maxWidth: "450px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
        headStyle={{ background: "#1890ff", color: "white", borderRadius: "12px 12px 0 0" }}
      >
        <p style={{ marginBottom: "24px", color: "#666" }}>
          Connect your Azure account. Your secrets are never saved to a database.
        </p>

        <Form layout="vertical">
          <InputField name="tenantId" label="Tenant ID" control={control} placeholder="Enter Tenant ID" />
          <InputField name="clientId" label="Client ID" control={control} placeholder="Enter Client ID" />
          <InputField name="clientSecret" label="Client Secret" type="password" control={control} placeholder="Enter Client Secret" />

          {formError && (
            <Alert message={formError} type="error" showIcon style={{ marginBottom: "16px" }} closable onClose={() => setFormError(null)} />
          )}

          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Button 
              block 
              size="large" 
              loading={isTesting} 
              onClick={handleSubmit((d) => handleConnect(d, true))}
            >
              Test Connection
            </Button>
            <Button 
              type="primary" 
              block 
              size="large" 
              disabled={!isValidConnection} 
              onClick={() => navigate({ to: '/dashboard' })}
            >
              Run the Dashboard
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}