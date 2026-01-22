import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, Form, Input, Button, Alert } from "antd";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCredentials } from "@/context/CredentialsContext";
import { useState } from "react";

// Reusable Input Component
const InputField = ({ name, label, control, placeholder }: { 
  name: string; 
  label: string; 
  control: any; // Replace 'any' with the appropriate type from react-hook-form
  placeholder: string; 
}) => (
  <Controller
    name={name}
    control={control}
    render={({ field, fieldState: { error: fieldError } }) => (
      <Form.Item
        label={label}
        validateStatus={fieldError ? "error" : ""}
        help={fieldError?.message}
      >
        <Input
          placeholder={placeholder}
          {...field}
        />
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

  const { control, handleSubmit } = useForm<CredentialsFormData>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      clientId: "",
      clientSecret: "",
      tenantId: "",
    },
  });

  const onSubmit = (data: CredentialsFormData) => {
    setCredentials(data.clientId, data.clientSecret);
    navigate({
      to: "/dashboard",
      search: { from: "connection" }
    });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f5f5f5" }}>
      <Card
        title="ZensusTech Connection"
        style={{ width: "100%", maxWidth: "450px" }}
        headStyle={{ background: "#1890ff", color: "white", borderRadius: "8px 8px 0 0" }}
      >
        <p style={{ marginBottom: "24px", color: "#666" }}>Connect your Azure account to access governance insights</p>
        {formError && (
          <Alert
            message="Validation Error"
            description={formError}
            type="error"
            showIcon
            style={{ marginBottom: "16px" }}
            closable
            onClose={() => setFormError(null)}
          />
        )}
        <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
          <InputField name="tenantId" label="Tenant ID" control={control} placeholder="Enter your Tenant ID" />
          <InputField name="clientId" label="Client ID" control={control} placeholder="Enter your Client ID" />
          <InputField name="clientSecret" label="Client Secret" control={control} placeholder="Enter your Client Secret" />
          <Form.Item>
            <Button type="primary" block size="large" htmlType="submit">
              Run the Dashboard
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
