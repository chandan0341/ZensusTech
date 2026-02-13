import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, Form, Input, Button, Space, Steps, Typography } from "antd"; 
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect, useRef } from "react";
import { useCredentials } from "@/hooks/useCredentials"; 
import { jwtDecode } from "jwt-decode"; 

const { Text, Title } = Typography;

// --- Technical Role to Human Readable Title Map ---
const PERMISSION_MAP: Record<string, string> = {
  "User.Read.All": "User Profiles",
  "Directory.Read.All": "Directory Data",
  "SecurityEvents.Read.All": "Security Events",
  "SecurityAlert.Read.All": "Security Alerts",
  "AuditLog.Read.All": "Audit Logs",
  "Group.Read.All": "Group Memberships",
  "Policy.Read.All": "Tenant Policies",
  "Application.Read.All": "Application Metadata",
  "Domain.Read.All": "Domain Info",
  "UserAuthenticationMethod.Read.All": "Auth Methods",
  "AdministrativeUnit.Read.All": "Admin Units",
  "SecurityActions.Read.All": "Security Actions",
  "IdentityProvider.Read.All": "Identity Providers",
  "AuditActivity.Read": "Audit Activities",
};

type StepStatus = 'wait' | 'process' | 'finish' | 'error';

interface ConnectionStep {
  title: string;
  description: string;
  status: StepStatus;
  key?: string; 
}

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
  const [isTesting, setIsTesting] = useState(false);
  const [isValidConnection, setIsValidConnection] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const scrollParentRef = useRef<HTMLDivElement>(null);

  const [steps, setSteps] = useState<ConnectionStep[]>([
    { title: 'API Authentication', description: 'Checking Secret', status: 'wait' },
  ]);

  const { control, handleSubmit, watch } = useForm<CredentialsFormData>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { clientId: "", clientSecret: "", tenantId: "" },
  });

  useEffect(() => {
    const sub = watch(() => { setIsValidConnection(false); setShowChecklist(false); });
    return () => sub.unsubscribe();
  }, [watch]);

  const handleConnect = async (data: CredentialsFormData, isTestOnly: boolean) => {
    setIsTesting(true);
    setShowChecklist(true);
    setSteps([
      { title: 'API Authentication', description: 'Checking Secret', status: 'wait' },
      { title: 'Permission Check', description: 'Checking permission', status: 'wait' },
    ]);

    try {
      const res = await fetch('/api/v1/connect', { 
        method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } 
      });
      
      if (!res.ok) {
        setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'error' as StepStatus } : s));
        return;
      }
      
      const result = await res.json();
      setSteps(prev => [{ ...prev[0], status: 'finish' as StepStatus }, { ...prev[1], status: 'process' as StepStatus }]);

      const graphToken: any = jwtDecode(result.graph_token);
      const activeRoles = graphToken.roles || [];

      const pursuitSteps: ConnectionStep[] = Object.keys(PERMISSION_MAP).map(roleKey => ({
        title: PERMISSION_MAP[roleKey],
        description: `Checking ${roleKey}`,
        status: 'wait',
        key: roleKey
      }));

      setSteps(prev => [...prev.slice(0, 2), ...pursuitSteps]);

      // Management check
      await new Promise(r => setTimeout(r, 400));
      //const hasMgmt = mgmtToken.roles?.some((r: string) => r.includes("Reader") || r.includes("Admin"));
      //setSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: (hasMgmt ? 'finish' : 'error') as StepStatus } : s));

      // Dynamic Graph checks
      for (let i = 2; i < (pursuitSteps.length + 2); i++) {
        const stepKey = pursuitSteps[i - 2].key;
        setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'process' as StepStatus } : s));
        
        await new Promise(r => setTimeout(r, 100));
        
        const hasRole = activeRoles.includes(stepKey);
        setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: (hasRole ? 'finish' : 'error') as StepStatus } : s));
        
        if (scrollParentRef.current) {
          scrollParentRef.current.scrollTop = scrollParentRef.current.scrollHeight;
        }
      }

      if (activeRoles.length > 0) {
        setIsValidConnection(true);
        setConnectionSuccess(data.tenantId); 
        localStorage.setItem('mgmt_token', result.mgmt_token);
        localStorage.setItem('graph_token', result.graph_token);
        
        if (!isTestOnly) navigate({ to: '/dashboard' });
      }

    } catch (e) {
      setSteps(prev => prev.map(s => s.status === 'process' ? { ...s, status: 'error' as StepStatus } : s));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f0f2f5", padding: "20px" }}>
      <Card
        title={<Title level={4} style={{ color: 'white', margin: 0 }}>Azure Deep Scan Connection</Title>}
        style={{ width: "100%", maxWidth: "500px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
        headStyle={{ background: "#1890ff" }}
      >
        <Form layout="vertical">
          <InputField name="tenantId" label="Tenant ID" control={control} placeholder="Enter Tenant ID" />
          <InputField name="clientId" label="Client ID" control={control} placeholder="Enter Client ID" />
          <InputField name="clientSecret" label="Client Secret" type="password" control={control} placeholder="Enter Client Secret" />

          {showChecklist && (
            <div style={{ 
              marginTop: 8, marginBottom: 24, padding: '16px', 
              background: '#fafafa', borderRadius: '10px', border: '1px solid #eee' 
            }}>
              <Text strong style={{ display: 'block', marginBottom: '12px', fontSize: '11px', color: '#999', letterSpacing: '1.2px' }}>
                VERIFYING PERMISSIONS
              </Text>
              
              <div ref={scrollParentRef} style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '8px', scrollBehavior: 'smooth' }}>
                <Steps direction="vertical" size="small" items={steps} />
              </div>
            </div>
          )}

          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Button block size="large" loading={isTesting} onClick={handleSubmit((d) => handleConnect(d, true))}>
              Test Connection
            </Button>
            <Button type="primary" block size="large" disabled={!isValidConnection} onClick={() => navigate({ to: '/dashboard' })}>
              Run Dashboard
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}

const InputField = ({ name, label, control, placeholder, type = "text" }: any) => (
  <Controller
    name={name}
    control={control}
    render={({ field, fieldState: { error } }) => (
      <Form.Item label={<Text strong style={{fontSize: '12px'}}>{label}</Text>} validateStatus={error ? "error" : ""} help={error?.message} style={{marginBottom: 10}}>
        {type === "password" ? <Input.Password placeholder={placeholder} {...field} /> : <Input placeholder={placeholder} {...field} />}
      </Form.Item>
    )}
  />
);