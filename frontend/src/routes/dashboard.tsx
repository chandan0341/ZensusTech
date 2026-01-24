
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, Form, Select, Row, Col, Space, Spin, Alert, Typography, Modal, Button ,Badge,Tooltip, // Add this
  Tag} from "antd";
import { TeamOutlined,  LockOutlined, ClockCircleOutlined, GlobalOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { DashboardTiles } from "./DashboardTiles";
import {
  fetchUsers,
  fetchSSLCertificates,
  SSLCertificate,
} from "@/services/dashboardApi";
import {
  TableComponent
} from "@/components/TailAdminReports";
import { useCredentials } from "@/context/CredentialsContext";

interface User {
  user: string;
  principalType?: string;
  role: string;
  subscription: string;
  mfa: string;
  lastLogin: string;
  status: string;
  risk: "High" | "Medium" | "Low";
}

function Dashboard() {
  const { clientId, clientSecret, tenantId } = useCredentials();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [foreignGroupsCount, setForeignGroupsCount] = useState<number | null>(null);
  const [servicePrincipalsCount, setServicePrincipalsCount] =  useState<number | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<string>(tenantId || "tenant-1");
  const [selectedSubscription, setSelectedSubscription] = useState<string>("");
  const [azureSubscriptions, setAzureSubscriptions] = useState<Array<{ value: string; label: string }>>([]);
  
  // ADD THIS: Store the token so we don't have to fetch it every time the sub changes
  const [mgtToken, setMgtToken] = useState<string>("");
  const [subMetadata, setSubMetadata] = useState<{
  state: string;
  authorizationSource: string;
  subscriptionId: string;
  subscriptionPolicies: { spendingLimit: string };
} | null>(null);

  // --- 1. INITIAL FETCH: Token & Subscriptions ---
  useEffect(() => {
    const initializeAzureData = async () => {
     // 1. Validation Check
    if (!clientId || !clientSecret || !selectedTenant) {
      setLoading(false); // Ensure loading is off if we can't even start
      return;
    }

    setLoading(true);

      try {
        // Fetch Management Token
        const subTokenResp = await fetch("http://localhost:8000/api/v1/azure/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_id: selectedTenant,
            client_id: clientId,
            client_secret: clientSecret,
            scope: "https://management.azure.com/.default"
          })
        });

        const { access_token: managementToken } = await subTokenResp.json();
        setMgtToken(managementToken); // Store for reuse

        // Fetch Subscriptions
        const subsResp = await fetch("http://localhost:8000/api/v1/azure/subscriptions", {
          method: "GET",
          headers: { "Authorization": `Bearer ${managementToken}` }
        });
        const subsData = await subsResp.json();
        
        const dropdownSubs = (subsData.value || [])
          .filter((sub: any) => sub.state === "Enabled")
          .map((sub: any) => ({
            value: sub.subscriptionId,
            label: `${sub.subscriptionId} - ${sub.displayName}`
          }));

        setAzureSubscriptions(dropdownSubs);
        
        // Setting this will trigger the SECOND useEffect below
        // if (dropdownSubs.length > 0) {
        //   setSelectedSubscription(dropdownSubs[0].value);
        // }

      } catch (err: any) {
      console.error("Initialization Error:", err.message);
      setError("Failed to load subscriptions. Check credentials.");
    } finally {
      // This is crucial: This unlocks the dropdown so you can actually click it
      setLoading(false); 
    }
    };

    initializeAzureData();
  }, [clientId, clientSecret, selectedTenant]);


  // --- 2. DYNAMIC FETCH: Users (Triggers when selectedSubscription changes) ---
  useEffect(() => {
  // 1. Guard: We need at least the Tenant and MgtToken to do anything
  if (!selectedTenant || !mgtToken) return;

  const fetchData = async () => {
    setLoading(true);
    try {
      // FLOW A: A Subscription is selected
      if (selectedSubscription) {
        console.log("Fetching Subscription-specific users + Metadata");
        
        const usersPromise = fetch("http://localhost:8000/api/v1/azure/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription_id: selectedSubscription,
            tenant_id: selectedTenant,
            client_id: clientId,
            client_secret: clientSecret,
          })
        });

        const metadataPromise = fetch(`https://management.azure.com/subscriptions/${selectedSubscription}?api-version=2020-01-01`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${mgtToken}` }
        });

        // 1. Wait for the fetch responses
const [usersResp, metaResp] = await Promise.all([usersPromise, metadataPromise]);

// 2. Parse the JSON body (this is an async operation)
const data = await usersResp.json();

// 3. Access properties using dot notation (or bracket notation)
const usersData = data.users || [];
const foreignGroupsCount = data.foreignGroupsCount || undefined;
const servicePrincipalsCount = data.servicePrincipalsCount || undefined;
setForeignGroupsCount(foreignGroupsCount);
setServicePrincipalsCount(servicePrincipalsCount);


setUsers(usersData);
setSubMetadata(await metaResp.json());
      } 
      
      // FLOW B: Only Tenant is selected (No Subscription yet)
      else {
        console.log("Fetching all Tenant users (Initial View)");
        
        const response = await fetch("http://localhost:8000/api/v1/azure/tenant/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_id: selectedTenant,
            client_id: clientId,
            client_secret: clientSecret,
          })
        });

        const data = await response.json();
        setUsers(data);
        setSubMetadata(null); // Clear metadata since no sub is selected
      }

    } catch (err: any) {
      console.error("Fetch Error:", err.message);
      setUsers([]);
      setForeignGroupsCount(0);
      setServicePrincipalsCount(0);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [selectedTenant, selectedSubscription, mgtToken]);


  const [selectedTile, setSelectedTile] = useState<string>("azure-identity");
  const [sslCertificates, setSslCertificates] = useState<SSLCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCardData, setSelectedCardData] = useState<{
    title: string;
    columns: any[];
    data: any[];
  } | null>(null);
  const [sslError, setSslError] = useState<string | null>(null);

  // Check if credentials exist, if not redirect to login
  if (!clientId || !clientSecret) {
    // Use window.location for immediate redirect
    window.location.href = "/login";
    return null;
  }

  useEffect(() => {
    // Clean up query parameters if present
    const url = new URL(window.location.href);
    if (url.searchParams.has('from')) {
      url.searchParams.delete('from');
      window.history.replaceState({}, '', url.pathname + url.hash);
    }
  }, []);

  useEffect(() => {
    // Clear existing data when credentials or selected options change
    setUsers([]);
    setSslCertificates([]);
    setError(null);

    if (clientId && clientSecret && selectedTenant && selectedSubscription) {
      fetchData();
    }
  }, [clientId, clientSecret, selectedTenant, selectedSubscription]);

  const fetchData = async () => {
    if (!clientId || !clientSecret || !selectedTenant || !selectedSubscription) {
      return; // Should not happen due to useEffect dependency and validation
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch all data from backend in parallel
      const [userList] = await Promise.all([
        fetchUsers(clientId, clientSecret, selectedTenant, selectedSubscription)      ]);

      // Update state with fetched data
      setUsers(userList);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load governance data";
      console.error("Error fetching governance data:", err);
      setError(`Failed to fetch data from API: ${errorMessage}. Please check if the backend is running and accessible.`);
      setUsers([]);

    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchSSL = async () => {
      if (!clientId || !clientSecret || !selectedTenant || !selectedSubscription) return;
      setSslError(null);
      try {
        const data = await fetchSSLCertificates(clientId, clientSecret, selectedTenant, selectedSubscription);
        setSslCertificates(data);
      } catch (err) {
        setSslError("Failed to fetch SSL Certificate Expiry data");
        setSslCertificates([]);
      }
    };
    fetchSSL();
  }, [clientId, clientSecret, selectedTenant, selectedSubscription]);

  const handleTenantChange = (tenantId: string) => {
    setSelectedTenant(tenantId);
    setSelectedSubscription("");
    setAzureSubscriptions([]);
  };

  const handleSubscriptionChange = async (subscriptionId: string) => {
    setSelectedSubscription(subscriptionId);
  };
  const roleCounts = users.reduce<Record<string, number>>((result, user) => {
    const role = user.role;

    if (result[role]) {
      result[role] += 1;
    } else {
      result[role] = 1;
    }

    return result;
  }, {});

  const mfaEnabledCount = users.filter(user => user.mfa === "Enabled").length;
  const mfaDisabledCount = users.filter(user => user.mfa === "Disabled").length;

 function getModalDataByRole(role: string, users: User[]) {
  const filteredUsers = users.filter(u => u.role.toLowerCase() === role.toLowerCase());

  return {
    title: role,
    columns: [
      { key: 'user', label: 'User', width: '18%' },
      { key: 'principalType', label: 'Type', width: '12%' }, // New Column
      { key: 'role', label: 'Role', width: '12%' },
      { key: 'subscription', label: 'Subscription', width: '18%' },
      { key: 'mfa', label: 'MFA Status', width: '18%' },
      { key: 'status', label: 'Status', width: '12%' },
      { key: 'risk', label: 'Risk', width: '10%' }
    ],
    data: filteredUsers.map(u => {
      const riskColor = u.risk === 'High' ? '#dc2626' : u.risk === 'Medium' ? '#d97706' : '#16a34a';

      return {
        user: u.user,
         principalType: (
          <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
            {u.principalType || 'User'} 
          </span>
        ),
        role: u.role,
        subscription: u.subscription,
        mfa: (
          <span style={{ color: u.mfa === 'Enabled' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
            {u.mfa === 'Enabled' ? '✅ Enabled' : '❌ Disabled'}
          </span>
        ),
        status: (
          <span
            style={{
              backgroundColor: u.status === 'Active' ? '#dcfce7' : '#f1f5f9',
              color: u.status === 'Active' ? '#166534' : '#475569',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            {u.status}
          </span>
        ),
        risk: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                height: '8px',
                width: '8px',
                backgroundColor: riskColor,
                borderRadius: '50%',
                display: 'inline-block',
              }}
            ></span>
            <span style={{ color: riskColor, fontWeight: 500 }}>{u.risk}</span>
          </div>
        ),
      };
    }),
  };
}

function handleCardClickForUserType(roleKey: string) {
  if (!users || users.length === 0) return; // Safety check

  const modalData = getModalDataByRole(roleKey, users);

  if (modalData) {
    setSelectedCardData(modalData);
    setDetailModalVisible(true);
  }
}
function handleCardClickForMFADisabledRole(record: { role: string; count: number }, type: string) {
 if (type === 'mfa-disabled-roles') {
    // Filter users with this role and MFA disabled
    const usersForRole = users.filter(u => u.role === record.role && u.mfa === 'Disabled');

    // Open modal or set state
    setSelectedCardData({
      title: `MFA Disabled Users - ${record.role}`,
      columns: [
        { key: "user", label: "User" },
        { key: "principalType", label: "Type" }, // New Column
        { key: "role", label: "Role" },
        { key: "subscription", label: "Subscription" },
        { key: "mfa", label: "MFA Status" },
        { key: "status", label: "Status" },
        { key: "risk", label: "Risk" },
      ],
      data: usersForRole.map(u => {
      const riskColor = u.risk === 'High' ? '#dc2626' : u.risk === 'Medium' ? '#d97706' : '#16a34a';

      return {
        user: u.user,
           principalType: (
          <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
            {u.principalType || 'User'} 
          </span>
        ),
        role: u.role,
        subscription: u.subscription,
        mfa: (
          <span style={{ color: u.mfa === 'Enabled' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
            {u.mfa === 'Enabled' ? '✅ Enabled' : '❌ Disabled'}
          </span>
        ),
        status: (
          <span
            style={{
              backgroundColor: u.status === 'Active' ? '#dcfce7' : '#f1f5f9',
              color: u.status === 'Active' ? '#166534' : '#475569',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            {u.status}
          </span>
        ),
        risk: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                height: '8px',
                width: '8px',
                backgroundColor: riskColor,
                borderRadius: '50%',
                display: 'inline-block',
              }}
            ></span>
            <span style={{ color: riskColor, fontWeight: 500 }}>{u.risk}</span>
          </div>
        ),
      };
    }),
    });
    setDetailModalVisible(true);
  }
}
// Count MFA Disabled per role dynamically
const mfaDisabledByRole = Object.entries(
  users.reduce((acc, user) => {
    if (user.mfa === "Disabled") {
      acc[user.role] = (acc[user.role] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>)
).map(([role, count]) => ({ role, count }));

  const handleCardClick = (cardType: string, currentTile: string) => {
    let modalData = null;

    if (currentTile === 'azure-identity') {
      switch (cardType) {
        case 'total-users':
  modalData = {
    title: 'Total Users Details',
    // Widths redistributed to include Principal Type
    columns: [
      { key: 'user', label: 'User', width: '17%' },
      { key: 'principalType', label: 'Principal Type', width: '13%' }, // New Column
      { key: 'role', label: 'Role', width: '10%' },
      { key: 'subscription', label: 'Subscription', width: '18%' },
      { key: 'mfa', label: 'MFA Status', width: '17%' },
      { key: 'status', label: 'Status', width: '12%' },
      { key: 'risk', label: 'Risk', width: '11%' }
    ],
    data: users.map((u) => {
      const riskColor = u.risk === 'High' ? '#dc2626' : u.risk === 'Medium' ? '#d97706' : '#16a34a';
      
      return {
        user: u.user,
        // Added mapping for Principal Type
        principalType: u.principalType,
        role: u.role,
        subscription: u.subscription,
        mfa: (
          <span style={{ color: u.mfa === 'Enabled' ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
            {u.mfa === 'Enabled' ? '✅ Enabled' : '❌ Disabled'}
          </span>
        ),
        status: (
          <span style={{
            backgroundColor: u.status === 'Active' ? '#dcfce7' : '#f1f5f9',
            color: u.status === 'Active' ? '#166534' : '#475569',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {u.status}
          </span>
        ),
        risk: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              height: '8px', width: '8px',
              backgroundColor: riskColor,
              borderRadius: '50%', display: 'inline-block'
            }}></span>
            <span style={{ color: riskColor, fontWeight: '500' }}>{u.risk}</span>
          </div>
        ),
      };
    }),
  };
  break;
        case 'active-users':
          modalData = {
            title: 'Active Users Details',
            columns: [
              { key: 'user', label: 'User', width: '40%' },
              { key: 'role', label: 'Role', width: '30%' },
              { key: 'lastLogin', label: 'Last Login', width: '30%' },
            ],
            data: users.filter(user => user.status === 'Active').map((user) => ({
              user: user.user,
              role: user.role,
              lastLogin: user.lastLogin,
            })),
          };
          break;
        case 'inactive-users':
          modalData = {
            title: 'Inactive Users Details',
            columns: [
              { key: 'user', label: 'User', width: '40%' },
              { key: 'role', label: 'Role', width: '30%' },
              { key: 'lastLogin', label: 'Last Login', width: '30%' },
            ],
            data: users.filter(user => user.status === 'Inactive').map((user) => ({
              user: user.user,
              role: user.role,
              lastLogin: user.lastLogin,
            })),
          };
          break;
        case 'mfa-enabled':
          modalData = {
            title: 'MFA Enabled Users',
            columns: [
      { key: 'user', label: 'User', width: '20%' },
      { key: 'role', label: 'Role', width: '15%' },
      { key: 'subscription', label: 'Subscription', width: '20%' },
      { key: 'mfa', label: 'MFA Status', width: '22%' },
      { key: 'status', label: 'Status', width: '15%' },
      { key: 'risk', label: 'Risk', width: '08%' }
    ],
    data: users.filter(u => u.mfa === 'Enabled').map((u) => {
      // 1. Declare variables inside the function body
      const riskColor = u.risk === 'High' ? '#dc2626' : u.risk === 'Medium' ? '#d97706' : '#16a34a';
      
      // 2. Return the object
      return {
        user: u.user,
        role: u.role,
        subscription: u.subscription,
        mfa: (
          <span style={{ 
            color: u.mfa === 'Enabled' ? '#16a34a' : '#dc2626',
            fontWeight: '600'
          }}>
            {u.mfa === 'Enabled' ? '✅ Enabled' : '❌ Disabled'}
          </span>
        ),
        status: (
          <span style={{
            backgroundColor: u.status === 'Active' ? '#dcfce7' : '#f1f5f9',
            color: u.status === 'Active' ? '#166534' : '#475569',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {u.status}
          </span>
        ),
        risk: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              height: '8px',
              width: '8px',
              backgroundColor: riskColor,
              borderRadius: '50%',
              display: 'inline-block'
            }}></span>
            <span style={{ color: riskColor, fontWeight: '500' }}>
              {u.risk}
            </span>
          </div>
        ),
      };
    }),
  };
  break;
  case 'mfa-disabled':
          modalData = {
            title: 'MFA Disabled Users',
            columns: [
      { key: 'user', label: 'User', width: '20%' },
      { key: 'role', label: 'Role', width: '15%' },
      { key: 'subscription', label: 'Subscription', width: '20%' },
      { key: 'mfa', label: 'MFA Status', width: '22%' },
      { key: 'status', label: 'Status', width: '15%' },
      { key: 'risk', label: 'Risk', width: '08%' }
    ],
    data: users.filter(u => u.mfa === 'Disabled').map((u) => {
      // 1. Declare variables inside the function body
      const riskColor = u.risk === 'High' ? '#dc2626' : u.risk === 'Medium' ? '#d97706' : '#16a34a';
      
      // 2. Return the object
      return {
        user: u.user,
        role: u.role,
        subscription: u.subscription,
        mfa: (
          <span style={{ 
            color: u.mfa === 'Enabled' ? '#16a34a' : '#dc2626',
            fontWeight: '600'
          }}>
            {u.mfa === 'Enabled' ? '✅ Enabled' : '❌ Disabled'}
          </span>
        ),
        status: (
          <span style={{
            backgroundColor: u.status === 'Active' ? '#dcfce7' : '#f1f5f9',
            color: u.status === 'Active' ? '#166534' : '#475569',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {u.status}
          </span>
        ),
        risk: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              height: '8px',
              width: '8px',
              backgroundColor: riskColor,
              borderRadius: '50%',
              display: 'inline-block'
            }}></span>
            <span style={{ color: riskColor, fontWeight: '500' }}>
              {u.risk}
            </span>
          </div>
        ),
      };
    }),
  };
  break;
       
      }
    } else if (currentTile === 'microsoft-365') {
      switch (cardType) {
        case 'teams-uptime':
          modalData = {
            title: 'Teams Service Health Details',
            columns: [
              { key: 'service', label: 'Service', width: '30%' },
              { key: 'status', label: 'Status', width: '25%' },
              { key: 'uptime', label: 'Uptime %', width: '25%' },
              { key: 'lastIncident', label: 'Last Incident', width: '20%' },
            ],
            data: [
              { service: 'Teams Core', status: 'Healthy', uptime: '99.9%', lastIncident: '2024-01-15' },
              { service: 'Teams Calling', status: 'Healthy', uptime: '99.8%', lastIncident: '2024-01-12' },
              { service: 'Teams Meetings', status: 'Healthy', uptime: '99.7%', lastIncident: '2024-01-10' },
              { service: 'Teams Chat', status: 'Healthy', uptime: '99.9%', lastIncident: '2024-01-08' },
            ],
          };
          break;
        case 'active-users':
          modalData = {
            title: 'Microsoft 365 Active Users',
            columns: [
              { key: 'user', label: 'User', width: '40%' },
              { key: 'lastActivity', label: 'Last Activity', width: '30%' },
              { key: 'primaryService', label: 'Primary Service', width: '30%' },
            ],
            data: [
              { user: 'john.doe@company.com', lastActivity: '2 hours ago', primaryService: 'Teams' },
              { user: 'jane.smith@company.com', lastActivity: '1 hour ago', primaryService: 'Outlook' },
              { user: 'bob.wilson@company.com', lastActivity: '30 mins ago', primaryService: 'SharePoint' },
              { user: 'alice.brown@company.com', lastActivity: '4 hours ago', primaryService: 'Teams' },
            ],
          };
          break;
      }
    } else if (currentTile === 'domain-overview') {
      switch (cardType) {
        case 'active-domains':
          modalData = {
            title: 'Active Domains Details',
            columns: [
              { key: 'domain', label: 'Domain', width: '30%' },
              { key: 'registrar', label: 'Registrar', width: '25%' },
              { key: 'expiry', label: 'Expiry Date', width: '25%' },
              { key: 'status', label: 'Status', width: '20%' },
            ],
            data: [
              { domain: 'example.com', registrar: 'GoDaddy', expiry: '2024-12-15', status: 'Active' },
              { domain: 'company.net', registrar: 'Namecheap', expiry: '2025-03-20', status: 'Active' },
              { domain: 'brand.org', registrar: 'AWS Route 53', expiry: '2025-06-30', status: 'Active' },
              { domain: 'portal.io', registrar: 'Cloudflare', expiry: '2025-01-15', status: 'Active' },
            ],
          };
          break;
        case 'expiring-soon':
          modalData = {
            title: 'Domains Expiring Soon',
            columns: [
              { key: 'domain', label: 'Domain', width: '35%' },
              { key: 'registrar', label: 'Registrar', width: '25%' },
              { key: 'expiry', label: 'Expiry Date', width: '25%' },
              { key: 'daysLeft', label: 'Days Left', width: '15%' },
            ],
            data: [
              { domain: 'old-domain.com', registrar: 'GoDaddy', expiry: '2024-02-15', daysLeft: '3' },
              { domain: 'legacy.net', registrar: 'Namecheap', expiry: '2024-02-20', daysLeft: '8' },
            ],
          };
          break;
      }
    }

    if (modalData) {
      setSelectedCardData(modalData);
      setDetailModalVisible(true);
    }
  };

  const handleRowClick = (record: any, tableType: string) => {
    let modalData = null;

    switch (tableType) {
      case 'user-identity-governance':
        modalData = {
          title: `Details for ${record.category}`,
          columns: [
            { key: 'property', label: 'Property', width: '30%' },
            { key: 'value', label: 'Value', width: '70%' },
          ],
          data: [
            { property: 'Category', value: record.category },
            { property: 'Count', value: record.count },
            { property: 'Description', value: `${record.category} represents ${record.count} users in this category.` },
            { property: 'Last Updated', value: new Date().toLocaleDateString() },
          ],
        };
        break;

      case 'admin-roles':
        modalData = {
          title: `Admin Role Details: ${record.role}`,
          columns: [
            { key: 'property', label: 'Property', width: '30%' },
            { key: 'value', label: 'Value', width: '70%' },
          ],
          data: [
            { property: 'Role', value: record.role },
            { property: 'Assigned Users', value: record.assignedUsers },
            { property: 'MFA Status', value: record.mfaEnabled },
            { property: 'Risk Level', value: record.mfaEnabled.includes('❌') ? 'High' : 'Low' },
            { property: 'Last Audit', value: new Date().toLocaleDateString() },
          ],
        };
        break;

      case 'email-security':
        modalData = {
          title: `Email Security Details: ${record.metric}`,
          columns: [
            { key: 'property', label: 'Property', width: '30%' },
            { key: 'value', label: 'Value', width: '70%' },
          ],
          data: [
            { property: 'Metric', value: record.metric },
            { property: 'Count', value: record.count },
            { property: 'Time Period', value: 'Last 30 days' },
            { property: 'Trend', value: record.metric.includes('Blocked') ? 'Decreasing' : 'Stable' },
            { property: 'Last Updated', value: new Date().toLocaleDateString() },
          ],
        };
        break;

      case 'domain-authentication':
        modalData = {
          title: `Domain Details: ${record.domain}`,
          columns: [
            { key: 'property', label: 'Property', width: '30%' },
            { key: 'value', label: 'Value', width: '70%' },
          ],
          data: [
            { property: 'Domain', value: record.domain },
            { property: 'SPF Status', value: record.spf },
            { property: 'DKIM Status', value: record.dkim },
            { property: 'DMARC Status', value: record.dmarc },
            { property: 'Risk Level', value: record.risk },
            { property: 'Registrar', value: 'Auto-detected' },
            { property: 'Last Checked', value: new Date().toLocaleDateString() },
          ],
        };
        break;

      case 'license-usage':
        modalData = {
          title: `License Details: ${record.licenseType}`,
          columns: [
            { key: 'property', label: 'Property', width: '30%' },
            { key: 'value', label: 'Value', width: '70%' },
          ],
          data: [
            { property: 'License Type', value: record.licenseType },
            { property: 'Purchased', value: record.purchased },
            { property: 'Assigned', value: record.assigned },
            { property: 'Unused', value: record.unused },
            { property: 'Utilization %', value: `${Math.round((parseInt(record.assigned) / parseInt(record.purchased)) * 100)}%` },
            { property: 'Cost Savings Potential', value: record.unused > 0 ? `$${parseInt(record.unused) * 50}/month` : 'None' },
          ],
        };
        break;

      case 'teams-governance':
        modalData = {
          title: `Teams Governance: ${record.metric}`,
          columns: [
            { key: 'property', label: 'Property', width: '30%' },
            { key: 'value', label: 'Value', width: '70%' },
          ],
          data: [
            { property: 'Metric', value: record.metric },
            { property: 'Count', value: record.count },
            { property: 'Status', value: record.metric.includes('Inactive') ? 'Needs Attention' : 'Good' },
            { property: 'Last Reviewed', value: new Date().toLocaleDateString() },
          ],
        };
        break;

      case 'data-protection':
        modalData = {
          title: `Backup Details: ${record.workload}`,
          columns: [
            { key: 'property', label: 'Property', width: '30%' },
            { key: 'value', label: 'Value', width: '70%' },
          ],
          data: [
            { property: 'Workload', value: record.workload },
            { property: 'Backup Status', value: record.backupStatus },
            { property: 'Last Restore Test', value: record.lastRestoreTest },
            { property: 'Backup Frequency', value: 'Daily' },
            { property: 'Retention Period', value: '30 days' },
            { property: 'Next Backup', value: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString() },
          ],
        };
        break;

      case 'compliance-readiness':
        modalData = {
          title: `Compliance Details: ${record.area}`,
          columns: [
            { key: 'property', label: 'Property', width: '30%' },
            { key: 'value', label: 'Value', width: '70%' },
          ],
          data: [
            { property: 'Area', value: record.area },
            { property: 'Status', value: record.status },
            { property: 'Compliance Framework', value: record.area.includes('Audit') ? 'GDPR/SOC2' : 'General' },
            { property: 'Last Assessment', value: new Date().toLocaleDateString() },
            { property: 'Next Review', value: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString() },
          ],
        };
        break;

      case 'incidents-support':
        modalData = {
          title: `Support Details: ${record.category}`,
          columns: [
            { key: 'property', label: 'Property', width: '30%' },
            { key: 'value', label: 'Value', width: '70%' },
          ],
          data: [
            { property: 'Category', value: record.category },
            { property: 'Tickets', value: record.tickets },
            { property: 'Priority', value: record.category.includes('Reset') ? 'Medium' : 'High' },
            { property: 'Avg Resolution Time', value: record.category.includes('MFA') ? '15 mins' : '2 hours' },
            { property: 'Satisfaction Rate', value: '95%' },
          ],
        };
        break;

      case 'msp-action-plan':
        modalData = {
          title: `Action Plan Details: ${record.action}`,
          columns: [
            { key: 'property', label: 'Property', width: '30%' },
            { key: 'value', label: 'Value', width: '70%' },
          ],
          data: [
            { property: 'Priority', value: record.priority },
            { property: 'Action', value: record.action },
            { property: 'Owner', value: record.owner },
            { property: 'Timeline', value: 'Next 30 days' },
            { property: 'Estimated Effort', value: record.priority === 'P1' ? 'High' : 'Medium' },
            { property: 'Business Impact', value: record.priority === 'P1' ? 'Critical' : 'Important' },
          ],
        };
        break;

      case 'subscription-roles':
        modalData = {
          title: `Role Details: ${record.role}`,
          columns: [
            { key: 'property', label: 'Property', width: '30%' },
            { key: 'value', label: 'Value', width: '70%' },
          ],
          data: [
            { property: 'Role', value: record.role },
            { property: 'Assigned Users', value: record.count },
            { property: 'Subscription', value: 'Prod-ERP-Azure-UK' },
            { property: 'Permissions', value: record.role === 'Owner' ? 'Full Access' : record.role === 'Contributor' ? 'Read/Write' : 'Read Only' },
            { property: 'Risk Level', value: record.role === 'Owner' ? 'High' : 'Medium' },
          ],
        };
        break;

      case 'mfa-disabled-roles':
        modalData = {
          title: `MFA Disabled Users in ${record.role} Role`,
          columns: [
            { key: 'property', label: 'Property', width: '30%' },
            { key: 'value', label: 'Value', width: '70%' },
          ],
          data: [
            { property: 'Role', value: record.role },
            { property: 'Users without MFA', value: record.count },
            { property: 'Security Risk', value: 'High' },
            { property: 'Recommended Action', value: 'Enable MFA for all users in this role' },
            { property: 'Impact', value: 'Account compromise vulnerability' },
          ],
        };
        break;

      case 'executive-summary':
        modalData = {
          title: `Security Details: ${record.area}`,
          columns: [
            { key: 'property', label: 'Property', width: '30%' },
            { key: 'value', label: 'Value', width: '70%' },
          ],
          data: [
            { property: 'Security Area', value: record.area },
            { property: 'Current Status', value: record.status },
            {
              property: 'Risk Level',
              value: record.status === 'Needs Improvement' || record.status === 'High Risk' ? 'High' :
                     record.status === 'Savings Possible' ? 'Medium' :
                     record.status === 'Good' ? 'Low' :
                     record.status === 'Medium' ? 'Medium' : 'Unknown'
            },
            {
              property: 'Description',
              value: record.area === 'Identity Security' ? 'User authentication and access controls' :
                     record.area === 'Email Security' ? 'Email protection and anti-phishing measures' :
                     record.area === 'License Optimization' ? 'Microsoft 365 license usage efficiency' :
                     record.area === 'Data Protection' ? 'Data backup and security measures' :
                     record.area === 'Compliance Readiness' ? 'Regulatory compliance status' :
                     record.area === 'Overall Security Score' ? 'Comprehensive security assessment' : 'Security assessment'
            },
            {
              property: 'Recommended Actions',
              value: record.status === 'Needs Improvement' ? 'Implement security hardening measures' :
                     record.status === 'High Risk' ? 'Immediate security remediation required' :
                     record.status === 'Savings Possible' ? 'Review and optimize license allocation' :
                     record.status === 'Good' ? 'Maintain current security posture' :
                     record.status === 'Medium' ? 'Monitor and improve compliance' :
                     record.area === 'Overall Security Score' ? 'Address high-risk areas to improve score' : 'Review security measures'
            },
            { property: 'Last Assessment', value: new Date().toLocaleDateString() },
          ],
        };
        break;
    }

    if (modalData) {
      setSelectedCardData(modalData);
      setDetailModalVisible(true);
    }
  };

  return (
    <div style={{ padding: "24px", background: "#f5f5f5", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "10px 0" }}>
  {/* 1. The Logo - Scaled slightly for better impact */}
  <img 
    src="/zensustech-logo-2.png" 
    alt="ZensusTech Logo" 
    style={{ 
      height: "56px", 
      width: "56px",
      objectFit: "contain"
    }} 
  />

  {/* 2. The Text Stack */}
  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
    {/* Main Title - Darker and more authoritative */}
    <h1 style={{ 
      fontSize: "24px", 
      fontWeight: "800", 
      color: "#003a8c", // Deeper blue for better contrast
      margin: 0,
      lineHeight: "1.2",
      letterSpacing: "-0.02em"
    }}>
      ZensusTech <span style={{ color: "#1890ff", fontWeight: "400" }}>ZenAIOps™</span>
    </h1>
    
    {/* Tagline - Professional, clean, and smaller */}
    <p style={{ 
      fontSize: "13px", 
      fontWeight: "500", 
      color: "#595959", // Professional gray
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
      </div>

        {/* Selectors */}
        <Card style={{ marginBottom: "24px" }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form layout="vertical">
                <Form.Item label="Tenant Organization">
                  <Select
                    value={selectedTenant}
                    onChange={handleTenantChange}
                    placeholder="Select a tenant"
                    options={[
        { value: tenantId!, label: tenantId! } // single tenant from context
      ]}
                  />
                </Form.Item>
              </Form>
            </Col>
            <Col xs={24} sm={12}>
              <Form layout="vertical">
                <Form.Item label="Subscription">
                  <Select
  loading={loading} // Add this line
  value={selectedSubscription}
  onChange={handleSubscriptionChange}
  disabled={azureSubscriptions.length === 0 || loading} // Disable while loading
  placeholder={azureSubscriptions.length === 0 ? "No enabled subscriptions found" : "Select a subscription"}
  options={azureSubscriptions}
/>
                </Form.Item>
              </Form>
            </Col>
          </Row>
        </Card>
        {/* 2. Subscription Metadata Bar */}
{selectedSubscription && subMetadata && !loading && (
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
      {/* Dynamic Status Badge */}
      <Col>
        <div style={{ color: "#8c8c8c", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>Status</div>
        <Badge 
          status={subMetadata.state === "Enabled" ? "success" : "error"} 
          text={<span style={{ fontWeight: "600" }}>{subMetadata.state}</span>} 
        />
      </Col>

      <Col style={{ borderLeft: "1px solid #f0f0f0", height: "30px" }} />

      {/* Dynamic Spending Limit Tag */}
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

      {/* Dynamic Auth Source */}
      <Col>
        <div style={{ color: "#8c8c8c", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>Auth Source</div>
        <span style={{ fontSize: "13px", fontWeight: "600", color: "#262626" }}>
          {subMetadata.authorizationSource}
        </span>
      </Col>

      {/* Subscription ID with Typography Copyable */}
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
)}

        {/* Error Alert */}
        {error && (
          <Alert
            message="Warning"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: "24px" }}
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <Row justify="center" style={{ padding: "64px 0" }}>
            <Spin size="large" tip="Loading governance data..." />
          </Row>
        )}
     

        {/* Dashboard Content */}
        {!isLoading &&  users.length > 0 && (
          <Row gutter={24} style={{ marginTop: '24px' }}>
            {/* Tile Navigation Sidebar */}
            <Col xs={24} lg={6}>
              <DashboardTiles selectedTile={selectedTile} setSelectedTile={setSelectedTile} />
            </Col>

            {/* Main Content Area */}
            <Col xs={24} lg={18}>
              {/* Azure Identity Content */}
              {selectedTile === 'azure-identity' && (
                <div>
                  {/* Azure Identity Header */}
                  <Card
                    style={{
                      borderRadius: '16px',
                      border: '2px solid #1890ff',
                      boxShadow: '0 4px 12px rgba(24,144,255,0.15)',
                      overflow: 'hidden',
                      marginBottom: '24px'
                    }}
                    bodyStyle={{ padding: '0' }}
                  >
                    <div style={{
                      background: 'linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)',
                      padding: '20px',
                      color: 'white'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <LockOutlined style={{ fontSize: '32px' }} />
                        <div>
                          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                            Azure Identity
                          </h2>
                          <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
                            Identity & Access Governance Reports
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                  <div style={{ padding: '24px' }}>
                    <Space direction="vertical" size={24} style={{ width: "100%" }}>
          
          {/* NEW SECTION: Conditioned on selectedSubscription */}
          {selectedSubscription && (
            <div style={{ marginBottom: '24px' }}>
              <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
                Identity Type Distribution
              </Typography.Title>
              <Row gutter={[24, 24]} justify="center">
  {/* Foreign Groups Card */}
  <Col xs={24} sm={12} lg={8}>
    <Card
      hoverable
      loading={isLoading || foreignGroupsCount === undefined}
      style={{ 
        borderRadius: '12px', 
        borderTop: `4px solid ${foreignGroupsCount && foreignGroupsCount > 1 ? '#faad14' : '#52c41a'}`, 
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        height: '160px', // Forces consistent height
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}
      bodyStyle={{ padding: '0px' }} // Controlled by the flex container above
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px', fontWeight: '500' }}>
          Foreign Principal
        </div>
        <div style={{ 
          fontSize: '32px', // Slightly larger for better impact
          fontWeight: 'bold', 
          color: foreignGroupsCount && foreignGroupsCount > 1 ? '#faad14' : '#52c41a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {foreignGroupsCount ?? 0}
          {foreignGroupsCount && foreignGroupsCount > 1 && (
            <Tooltip title="Multiple assignments detected for the same identity.">
              <ExclamationCircleOutlined style={{ marginLeft: '8px', fontSize: '20px' }} />
            </Tooltip>
          )}
        </div>
      </div>
    </Card>
  </Col>

  {/* Service Principals Card */}
  <Col xs={24} sm={12} lg={8}>
    <Card
      hoverable
      loading={isLoading || servicePrincipalsCount === undefined}
      style={{ 
        borderRadius: '12px', 
        borderTop: `4px solid ${servicePrincipalsCount && servicePrincipalsCount > 1 ? '#faad14' : '#52c41a'}`, 
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        height: '160px', // Forces consistent height
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}
      bodyStyle={{ padding: '0px' }} // Controlled by the flex container above
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px', fontWeight: '500' }}>
          Service Principal
        </div>
        <div style={{ 
          fontSize: '32px', // Slightly larger for better impact
          fontWeight: 'bold', 
          color: servicePrincipalsCount && servicePrincipalsCount > 1 ? '#faad14' : '#52c41a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {servicePrincipalsCount ?? 0}
          {servicePrincipalsCount && servicePrincipalsCount > 1 && (
            <Tooltip title="Multiple assignments detected for the same identity.">
              <ExclamationCircleOutlined style={{ marginLeft: '8px', fontSize: '20px' }} />
            </Tooltip>
          )}
        </div>
      </div>
    </Card>
  </Col>
</Row>
            </div>
          )}</Space></div>
                  <div style={{ padding: '24px' }}>
                    <Space direction="vertical" size={24} style={{ width: "100%" }}>
                     {/* Executive Summary Cards */}
                                                      <div style={{ marginBottom: '24px' }}>
                  <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '32px' }}>
                    Executive Summary
                  </Typography.Title>

                  {/* --- Parent Row (Centered) --- */}
                  <Row justify="center" style={{ marginBottom: '32px' }}>
                    <Col xs={24} sm={12} lg={6}>
                      <Card
  hoverable
  loading={loading} // This automatically shows a placeholder skeleton
  style={{
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    cursor: loading ? 'not-allowed' : 'pointer', // Disable interaction while loading
    borderTop: '4px solid #1890ff'
  }}
  bodyStyle={{ padding: '24px', textAlign: 'center' }}
  onClick={() => !loading && handleCardClick('total-users', selectedTile)} // Prevent click while loading
>
  <div style={{ marginBottom: '8px' }}>
    <TeamOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
  </div>
  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#1890ff' }}>
    {users.length}
  </div>
  <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>
    Total Users
  </div>
</Card>
                    </Col>
                  </Row>

                  {/* --- Child Row (Slightly larger than before) --- */}
                  <Row gutter={[24, 24]} justify="center">
      {Object.entries(roleCounts).map(([role, count]) => (
        <Col xs={22} sm={10} lg={6} key={role}>
          <Card
  hoverable
  loading={loading} // Automatically shows the skeleton UI
  style={{
    borderRadius: '12px',
    borderTop: '4px solid #52c41a',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    cursor: loading ? 'not-allowed' : 'pointer'
  }}
  bodyStyle={{ textAlign: 'center', padding: '24px' }}
  onClick={() => !loading && handleCardClickForUserType(role.toLowerCase())}
>
  <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px', fontWeight: '500' }}>
    {role}
  </div>

  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#52c41a' }}>
    {count}
  </div>
</Card>
        </Col>
      ))}
</Row>

                </div>
                      

                      {/* Dashboard 4: MFA & Security Compliance */}
                      <div style={{ marginBottom: '24px' }}>
                        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
                          MFA & Security Compliance
                        </Typography.Title>

                        {/* MFA Coverage */}
                        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                          <Col xs={24} sm={12}>
                            <Card
                             loading={loading}
                              style={{
                                borderRadius: '12px',
                                border: '1px solid #e8e8e8',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                              }}
                              bodyStyle={{ padding: '20px', textAlign: 'center' }}
                              onClick={() => handleCardClick('mfa-enabled', selectedTile)}

                            >
                              <div style={{ marginBottom: '8px' }}>
                                <LockOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                              </div>
                              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#52c41a', marginBottom: '4px' }}>
                                {mfaEnabledCount} users
                              </div>
                              <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
                                MFA Coverage - Enabled
                              </div>
                            </Card>
                          </Col>
                          <Col xs={24} sm={12}>
                            <Card
                             loading={loading}
                              style={{
                                borderRadius: '12px',
                                border: '1px solid #e8e8e8',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                              }}
                              bodyStyle={{ padding: '20px', textAlign: 'center' }}
                              onClick={() => handleCardClick('mfa-disabled', selectedTile)}
                            >
                              <div style={{ marginBottom: '8px' }}>
                                <LockOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />
                              </div>
                              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ff4d4f', marginBottom: '4px' }}>
                                {mfaDisabledCount} users
                              </div>
                              <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
                                MFA Coverage - Disabled
                              </div>
                            </Card>
                          </Col>
                        </Row>

                        {/* MFA Disabled by Role Table */}
                        <TableComponent
                          title="MFA Disabled by Role"
                          columns={[
                            { key: "role", label: "Role" },
                            { key: "count", label: "Count" },
                          ]}
                          data={mfaDisabledByRole} // dynamic data
                          onRowClick={(record) => handleCardClickForMFADisabledRole(record, 'mfa-disabled-roles')}
                        />
                      </div>
                    </Space>
                  </div>
                </div>
              )}

              {/* Security Tile Content */}
              {selectedTile === 'security' && (
                <div>
                  <Card
                    style={{ borderRadius: '16px', border: '2px solid #fa541c', boxShadow: '0 4px 12px rgba(250,84,28,0.15)', overflow: 'hidden', marginBottom: '24px' }}
                    bodyStyle={{ padding: '0' }}
                  >
                    <div style={{ background: 'linear-gradient(135deg, #fa541c 0%, #faad14 100%)', padding: '20px', color: 'white' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <LockOutlined style={{ fontSize: '32px' }} />
                        <div>
                          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Security Dashboard</h2>
                          <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>Security Posture, VM, Network, Data & Identity</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                  <div style={{ padding: '24px' }}>
                    <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>Virtual Machine Security Status</Typography.Title>
                    <TableComponent
                      title=""
                      columns={[
                        { key: 'vm', label: 'VM Name' },
                        { key: 'os', label: 'OS' },
                        { key: 'patch', label: 'Patch Status' },
                        { key: 'defender', label: 'Defender Agent' },
                        { key: 'encryption', label: 'Encryption' },
                        { key: 'risk', label: 'Risk' },
                      ]}
                      data={[
                        { vm: 'VM-Prod-01', os: 'Windows 2019', patch: '❌ Missing patches', defender: '❌ Not Installed', encryption: '❌ Disabled', risk: '🔴 High' },
                        { vm: 'VM-Prod-02', os: 'Windows 2022', patch: '✅ Up to date', defender: '✅ Installed', encryption: '✅ Enabled', risk: '🟢 Low' },
                        { vm: 'VM-Test-01', os: 'Windows 2016', patch: '❌ Missing patches', defender: '❌ Not Installed', encryption: '❌ Disabled', risk: '🔴 High' },
                        { vm: 'VM-App-01', os: 'Ubuntu 20.04', patch: '⚠ Partial', defender: '✅ Installed', encryption: '✅ Enabled', risk: '🔴 Medium' },
                      ]}
                    />
                    <Typography.Title level={3} style={{ textAlign: 'center', margin: '32px 0 24px' }}>Network Security Findings</Typography.Title>
                    <TableComponent
                      title=""
                      columns={[
                        { key: 'finding', label: 'Finding' },
                        { key: 'count', label: 'Count' },
                        { key: 'severity', label: 'Severity' },
                      ]}
                      data={[
                        { finding: 'RDP open to Internet', count: 2, severity: '🔴 High' },
                        { finding: 'SSH open to Internet', count: 1, severity: '🔴 High' },
                        { finding: 'NSGs without flow logs', count: 3, severity: '🔴 Medium' },
                        { finding: 'Firewall missing on subnet', count: 1, severity: '🔴 Medium' },
                      ]}
                    />
                    <Typography.Title level={3} style={{ textAlign: 'center', margin: '32px 0 24px' }}>Data & Storage Security</Typography.Title>
                    <TableComponent
                      title=""
                      columns={[
                        { key: 'resource', label: 'Resource' },
                        { key: 'issue', label: 'Issue' },
                        { key: 'severity', label: 'Severity' },
                      ]}
                      data={[
                        { resource: 'Storage-prod-01', issue: 'Public blob access enabled', severity: '🔴 Medium' },
                        { resource: 'SQL-DB-01', issue: 'Auditing disabled', severity: '🔴 Medium' },
                        { resource: 'SQL-DB-02', issue: 'TDE not enabled', severity: '🔴 High' },
                      ]}
                    />
                    <Typography.Title level={3} style={{ textAlign: 'center', margin: '32px 0 24px' }}>Identity & Access Security</Typography.Title>
                    <TableComponent
                      title=""
                      columns={[
                        { key: 'control', label: 'Control' },
                        { key: 'status', label: 'Status' },
                      ]}
                      data={[
                        { control: 'MFA enforced for Global Admins', status: '❌ No' },
                        { control: 'MFA enforced for Subscription Owners', status: '❌ No' },
                        { control: 'Privileged users count', status: 6 },
                        { control: 'Inactive users (>90 days)', status: 4 },
                        { control: 'Legacy authentication blocked', status: '❌ No' },
                      ]}
                    />
                    <Typography.Title level={3} style={{ textAlign: 'center', margin: '32px 0 24px' }}>Azure Security Posture</Typography.Title>
                    <TableComponent
                      title=""
                      columns={[
                        { key: 'kpi', label: 'KPI' },
                        { key: 'value', label: 'Value' },
                      ]}
                      data={[
                        { kpi: 'Secure Score', value: '62%' },
                        { kpi: 'Total Recommendations', value: 24 },
                        { kpi: 'High Severity Issues', value: 6 },
                        { kpi: 'Medium Severity Issues', value: 11 },
                        { kpi: 'Low Severity Issues', value: 7 },
                        { kpi: 'Unhealthy Resources', value: 9 },
                        { kpi: 'Subscription Admins without MFA', value: 2 },
                      ]}
                    />
                    <Typography.Title level={3} style={{ textAlign: 'center', margin: '32px 0 24px' }}>Secure Score Breakdown</Typography.Title>
                    <TableComponent
                      title=""
                      columns={[
                        { key: 'category', label: 'Category' },
                        { key: 'score', label: 'Score' },
                        { key: 'max', label: 'Max' },
                      ]}
                      data={[
                        { category: 'Identity & Access', score: 18, max: 30 },
                        { category: 'Compute', score: 16, max: 25 },
                        { category: 'Networking', score: 12, max: 20 },
                        { category: 'Data & Storage', score: 10, max: 15 },
                        { category: 'App & Containers', score: 6, max: 10 },
                      ]}
                    />
                    <Typography.Title level={3} style={{ textAlign: 'center', margin: '32px 0 24px' }}>
  Top Security Recommendations
</Typography.Title>
<TableComponent
  title=""
  columns={[
    { key: 'num', label: '#', width: '5%' },
    { key: 'rec', label: 'Recommendation', width: '40%' },
    { key: 'severity', label: 'Severity', width: '15%' },
    { key: 'affected', label: 'Affected Resources', width: '20%' },
    { key: 'status', label: 'Status', width: '20%' },
  ]}
  data={[
    { num: 1, rec: 'Enable MFA for subscription owners', severity: 'High', affected: 'Subscription', status: 'Unhealthy' },
    { num: 2, rec: 'System updates should be installed on VMs', severity: 'High', affected: '3 VMs', status: 'Unhealthy' },
    { num: 3, rec: 'NSG allows inbound traffic on port 3389', severity: 'High', affected: '2 NSGs', status: 'Unhealthy' },
    { num: 4, rec: 'Disk encryption should be enabled', severity: 'Medium', affected: '1 VM', status: 'Unhealthy' },
    { num: 5, rec: 'Storage account public access enabled', severity: 'Medium', affected: '2 Storage Accounts', status: 'Unhealthy' },
    { num: 6, rec: 'Endpoint protection missing', severity: 'Medium', affected: '1 VM', status: 'Unhealthy' },
  ].map((item) => {
    // Determine Severity Color
    const sevColor = item.severity === 'High' ? '#dc2626' : '#d97706';
    
    return {
      ...item,
      severity: (
        <span style={{ 
          color: sevColor, 
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{ height: '8px', width: '8px', borderRadius: '50%', backgroundColor: sevColor }}></span>
          {item.severity}
        </span>
      ),
      status: (
        <span style={{
          backgroundColor: item.status === 'Unhealthy' ? '#fee2e2' : '#dcfce7',
          color: item.status === 'Unhealthy' ? '#dc2626' : '#166534',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 'bold',
          display: 'inline-block',
          border: `1px solid ${item.status === 'Unhealthy' ? '#f87171' : '#4ade80'}40`
        }}>
          {item.status === 'Unhealthy' ? '⚠️ Unhealthy' : '✅ Healthy'}
        </span>
      )
    };
  })}
/>
                  </div>
                </div>
              )}
              {/* Cost Management Tile Content */}
              {selectedTile === 'cost-management' && (
                <div>
                  {/* Cost Management Header */}
                  <Card
                    style={{
                      borderRadius: '16px',
                      border: '2px solid #faad14',
                      boxShadow: '0 4px 12px rgba(250,173,20,0.15)',
                      overflow: 'hidden',
                      marginBottom: '24px'
                    }}
                    bodyStyle={{ padding: '0' }}
                  >
                    <div style={{
                      background: 'linear-gradient(135deg, #faad14 0%, #ffd666 100%)',
                      padding: '20px',
                      color: 'black'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <LockOutlined style={{ fontSize: '32px', color: '#faad14' }} />
                        <div>
                          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                            Cost Management (FinOps)
                          </h2>
                          <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
                            Cloud Spend, Optimization & Savings
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div style={{ padding: '24px' }}>
                    {/* Cost KPIs */}
                    <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
                      Cost KPIs
                    </Typography.Title>
                    <TableComponent
                      title="Cost KPIs"
                      columns={[
                        { key: 'kpi', label: 'KPI' },
                        { key: 'value', label: 'Value' },
                      ]}
                      data={[
                        { kpi: 'Total Monthly Spend', value: '₹ 4,85,000' },
                        { kpi: 'MoM Cost Change', value: '12%' },
                        { kpi: 'Forecast Next Month', value: '₹ 5,20,000' },
                        { kpi: 'Potential Monthly Savings', value: '₹ 92,000' },
                        { kpi: 'Idle / Underutilized Resources', value: '9' },
                        { kpi: 'Budget Threshold Breached', value: '1 Subscription' },
                      ]}
                    />

                    {/* Cost by Subscription */}
                    <Typography.Title level={3} style={{ textAlign: 'center', margin: '32px 0 24px' }}>
                      Cost by Subscription
                    </Typography.Title>
                    <TableComponent
                      title="Cost by Subscription"
                      columns={[
                        { key: 'subscription', label: 'Subscription' },
                        { key: 'monthlyCost', label: 'Monthly Cost (₹)' },
                        { key: 'momChange', label: 'MoM Change' },
                        { key: 'budget', label: 'Budget' },
                        { key: 'status', label: 'Status' },
                      ]}
                      data={[
                        { subscription: 'Prod-Subscription', monthlyCost: '3,45,000', momChange: '15%', budget: '3,50,000', status: '🔴 Near Limit' },
                        { subscription: 'Dev-Test-Subscription', monthlyCost: '1,40,000', momChange: '5%', budget: '1,50,000', status: '🔴 Within Budget' },
                      ]}
                    />

                    {/* Cost Optimization Opportunities */}
                    <Typography.Title level={3} style={{ textAlign: 'center', margin: '32px 0 24px' }}>
                      Cost Optimization Opportunities
                    </Typography.Title>
                    <TableComponent
                      title="Cost Optimization Opportunities"
                      columns={[
                        { key: 'num', label: '#' },
                        { key: 'resource', label: 'Resource Name' },
                        { key: 'type', label: 'Resource Type' },
                        { key: 'monthlyCost', label: 'Monthly Cost (₹)' },
                        { key: 'issue', label: 'Issue Identified' },
                        { key: 'recommendation', label: 'Recommendation' },
                        { key: 'savings', label: 'Est. Savings (₹)' },
                      ]}
                      data={[
                        { num: 1, resource: 'VM-Prod-DB-01', type: 'Virtual Machine', monthlyCost: '68,000', issue: 'Low CPU usage (<10%)', recommendation: 'Resize to lower SKU', savings: '22,000' },
                        { num: 2, resource: 'VM-Test-App-02', type: 'Virtual Machine', monthlyCost: '42,000', issue: 'Running 24×7', recommendation: 'Schedule shutdown', savings: '18,000' },
                        { num: 3, resource: 'SQL-Prod-DB', type: 'Azure SQL DB', monthlyCost: '55,000', issue: 'Overprovisioned DTUs', recommendation: 'Reduce DTUs', savings: '15,000' },
                        { num: 4, resource: 'Storage-Logs-01', type: 'Storage Account', monthlyCost: '18,000', issue: 'Hot tier unused data', recommendation: 'Move to Cool tier', savings: '6,500' },
                        { num: 5, resource: 'LB-Dev-01', type: 'Load Balancer', monthlyCost: '9,000', issue: 'No backend pool', recommendation: 'Remove resource', savings: '9,000' },
                        { num: 6, resource: 'Disk-Orphan-03', type: 'Managed Disk', monthlyCost: '6,000', issue: 'Unattached disk', recommendation: 'Delete disk', savings: '6,000' },
                        { num: 7, resource: 'AppGW-Prod', type: 'Application Gateway', monthlyCost: '62,000', issue: 'WAF always on (low traffic)', recommendation: 'Resize/WAF tuning', savings: '10,500' },
                        { num: 8, resource: 'VM-Backup-Old', type: 'Recovery Services Vault', monthlyCost: '12,000', issue: 'Old backups retained', recommendation: 'Reduce retention', savings: '5,000' },
                      ]}
                    />

                    {/* Cost by Service */}
                    <Typography.Title level={3} style={{ textAlign: 'center', margin: '32px 0 24px' }}>
                      Cost by Service
                    </Typography.Title>
                    <TableComponent
                      title="Cost by Service"
                      columns={[
                        { key: 'service', label: 'Service' },
                        { key: 'monthlyCost', label: 'Monthly Cost (₹)' },
                        { key: 'percent', label: '% of Total' },
                      ]}
                      data={[
                        { service: 'Virtual Machines', monthlyCost: '2,10,000', percent: '43%' },
                        { service: 'Azure SQL', monthlyCost: '85,000', percent: '18%' },
                        { service: 'Networking', monthlyCost: '70,000', percent: '14%' },
                        { service: 'Storage', monthlyCost: '65,000', percent: '13%' },
                        { service: 'Backup & DR', monthlyCost: '55,000', percent: '12%' },
                      ]}
                    />
                   </div>
                </div>
              )} 
              
{selectedTile === 'backups-dr' && (
  <div>
    {/* Backup & DR Header */}
    <Card
      style={{
        borderRadius: '16px',
        border: '2px solid #1890ff',
        boxShadow: '0 4px 12px rgba(24,144,255,0.15)',
        overflow: 'hidden',
        marginBottom: '24px'
      }}
      bodyStyle={{ padding: '0' }}
    >
      <div style={{
        background: 'linear-gradient(135deg, #1890ff 0%, #69c0ff 100%)',
        padding: '20px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '32px' }}>☁️</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
              Backup & Disaster Recovery
            </h2>
            <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
              Business Continuity, RPO/RTO & Replication Status
            </p>
          </div>
        </div>
      </div>
    </Card>

    <div style={{ padding: '24px' }}>
      {/* 1. Backup & DR Status – Detailed Records */}
<Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
  Backup & DR Status – Detailed Records
</Typography.Title>
<TableComponent
  title=""
  columns={[
    { key: 'num', label: '#' },
    { key: 'resource', label: 'Resource Name' },
    { key: 'type', label: 'Resource Type' },
    { key: 'backup', label: 'Backup Status' },
    { key: 'lastBackup', label: 'Last Backup' },
    { key: 'retention', label: 'Retention' },
    { key: 'dr', label: 'DR Enabled' },
    { key: 'rpo', label: 'RPO' },
    { key: 'rto', label: 'RTO' },
    { key: 'risk', label: 'Risk' }
  ]}
  data={[
    { num: 1, resource: 'VM-Prod-DB-01', type: 'VM (Windows)', backup: 'Failed', lastBackup: '19-Jan', retention: '30 days', dr: 'Yes', rpo: '15 min', rto: '1 hr', risk: 'High' },
    { num: 2, resource: 'VM-Prod-App-01', type: 'VM (Linux)', backup: 'Success', lastBackup: '20-Jan', retention: '30 days', dr: 'Yes', rpo: '30 min', rto: '2 hr', risk: 'Low' },
    { num: 3, resource: 'VM-Prod-Web-01', type: 'VM (Windows)', backup: 'Success', lastBackup: '20-Jan', retention: '14 days', dr: 'No', rpo: 'N/A', rto: 'N/A', risk: 'Medium' },
    { num: 4, resource: 'SQL-Prod-DB-01', type: 'Azure SQL DB', backup: 'Success', lastBackup: '20-Jan', retention: '35 days', dr: 'No', rpo: '5 min', rto: '30 min', risk: 'Medium' },
    { num: 5, resource: 'FileShare-Finance', type: 'Azure File Share', backup: 'Failed', lastBackup: '18-Jan', retention: '30 days', dr: 'No', rpo: 'N/A', rto: 'N/A', risk: 'High' },
    { num: 6, resource: 'VM-DR-ERP-01', type: 'VM (Windows)', backup: 'Success', lastBackup: '20-Jan', retention: '60 days', dr: 'Yes', rpo: '15 min', rto: '1 hr', risk: 'Low' },
    { num: 7, resource: 'VM-Test-01', type: 'VM (Dev/Test)', backup: 'Partial', lastBackup: '20-Jan', retention: '7 days', dr: 'No', rpo: 'N/A', rto: 'N/A', risk: 'Low' },
    { num: 8, resource: 'Storage-Logs-01', type: 'Blob Storage', backup: 'Success', lastBackup: '19-Jan', retention: '90 days', dr: 'No', rpo: 'N/A', rto: 'N/A', risk: 'Low' },
    { num: 9, resource: 'VM-Prod-API-01', type: 'VM (Linux)', backup: 'Failed', lastBackup: '19-Jan', retention: '30 days', dr: 'Yes', rpo: '30 min', rto: '2 hr', risk: 'High' },
    { num: 10, resource: 'SQL-DR-Replica', type: 'Azure SQL Geo-Replica', backup: 'Success', lastBackup: '20-Jan', retention: '30 days', dr: 'Yes', rpo: '5 min', rto: '15 min', risk: 'Low' },
  ].map(item => ({
    ...item,
    backup: (
      <span style={{ color: item.backup === 'Success' ? '#16a34a' : item.backup === 'Failed' ? '#dc2626' : '#d97706', fontWeight: '600' }}>
        {item.backup === 'Success' ? '✅ Success' : item.backup === 'Failed' ? '❌ Failed' : '⚠️ Partial'}
      </span>
    ),
    dr: (
      <span style={{ color: item.dr === 'Yes' ? '#16a34a' : '#64748b', fontWeight: '600' }}>
        {item.dr === 'Yes' ? '✅ Yes' : '❌ No'}
      </span>
    ),
    risk: (
      <span style={{ color: item.risk === 'High' ? '#dc2626' : item.risk === 'Medium' ? '#d97706' : '#16a34a', fontWeight: 'bold' }}>
        {item.risk === 'High' ? '🔴 High' : item.risk === 'Medium' ? '🟠 Medium' : '🟢 Low'}
      </span>
    )
  }))}
/>

      {/* 2. DR (Azure Site Recovery) Status */}
      <Typography.Title level={3} style={{ textAlign: 'center', margin: '48px 0 24px' }}>
        DR (Azure Site Recovery) Status
      </Typography.Title>
      <TableComponent
        title=""
        columns={[
          { key: 'vm', label: 'VM Name' },
          { key: 'health', label: 'Replication Health' },
          { key: 'sync', label: 'Last Sync' },
          { key: 'ready', label: 'Failover Ready' },
          { key: 'test', label: 'Test Failover' }
        ]}
        data={[
          { vm: 'VM-Prod-DB-01', health: 'Warning', sync: '19-Jan', ready: 'No', test: 'Not Tested' },
          { vm: 'VM-Prod-App-01', health: 'Healthy', sync: '20-Jan', ready: 'Yes', test: 'Passed' },
          { vm: 'VM-Prod-API-01', health: 'Critical', sync: '19-Jan', ready: 'No', test: 'Failed' },
        ].map(item => ({
          ...item,
          health: (
            <span style={{ color: item.health === 'Healthy' ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
              {item.health === 'Healthy' ? '✅' : item.health === 'Warning' ? '⚠️' : '❌'} {item.health}
            </span>
          ),
          ready: (
            <span style={{ color: item.ready === 'Yes' ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
              {item.ready === 'Yes' ? '✅ Yes' : '❌ No'}
            </span>
          ),
          test: (
            <span style={{
              backgroundColor: item.test === 'Passed' ? '#dcfce7' : '#f1f5f9',
              color: item.test === 'Passed' ? '#166534' : '#475569',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {item.test}
            </span>
          )
        }))}
      />

      {/* 3. Restore & DR Test Summary */}
      <Typography.Title level={3} style={{ textAlign: 'center', margin: '48px 0 24px' }}>
        Restore & DR Test Summary
      </Typography.Title>
      <TableComponent
        title=""
        columns={[
          { key: 'type', label: 'Test Type' },
          { key: 'run', label: 'Last Run' },
          { key: 'status', label: 'Status' }
        ]}
        data={[
          { type: 'VM Restore Test', run: '15-Jan', status: 'Success' },
          { type: 'SQL Point-in-Time Restore', run: '10-Jan', status: 'Success' },
          { type: 'DR Test Failover', run: '12-Jan', status: 'Failed' },
          { type: 'File Share Restore', run: '08-Jan', status: 'Success' },
        ].map(item => ({
          ...item,
          status: (
            <span style={{ color: item.status === 'Success' ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
              {item.status === 'Success' ? '✅ Success' : '❌ Failed'}
            </span>
          )
        }))}
      />
    </div>
  </div>
)}
              {/* Patch Management Tile Content */}
              {selectedTile === 'patch-management' && (
                <div>
                  <Card
                    style={{
                      borderRadius: '16px',
                      border: '2px solid #1890ff',
                      boxShadow: '0 4px 12px rgba(24,144,255,0.15)',
                      overflow: 'hidden',
                      marginBottom: '24px'
                    }}
                    bodyStyle={{ padding: '0' }}
                  >
                    <div style={{
                      background: 'linear-gradient(135deg, #1890ff 0%, #e6f7ff 100%)',
                      padding: '20px',
                      color: 'black'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <LockOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                        <div>
                          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                            Azure OS & Patch Management
                          </h2>
                          <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
                            Patch Compliance, OS Support, Risks
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                  <div style={{ padding: '24px' }}>
                    {/* KPI Table */}
                    <Typography.Title level={3} style={{ textAlign: 'center', margin: '32px 0 24px' }}>
                      Patch Management KPIs
                    </Typography.Title>
                    <TableComponent
                      title="Patch Management KPIs"
                      columns={[
                        { key: 'kpi', label: 'KPI' },
                        { key: 'value', label: 'Value' },
                      ]}
                      data={[
                        { kpi: 'Total VMs', value: 5 },
                        { kpi: 'Patch Compliance', value: '60%' },
                        { kpi: 'VMs Missing Critical Patches', value: 2 },
                        { kpi: 'Reboot Pending', value: 2 },
                        { kpi: 'Unsupported OS', value: 1 },
                        { kpi: 'Patch Failures (Last 7 Days)', value: 1 },
                      ]}
                    />

                    {/* OS & Patch Status – Detailed Records */}
                    <Typography.Title level={3} style={{ textAlign: 'center', margin: '32px 0 24px' }}>
                      OS & Patch Status – Detailed Records
                    </Typography.Title>
                    <TableComponent
                      title="OS & Patch Status – Detailed Records"
                      columns={[
                        { key: 'num', label: '#' },
                        { key: 'vmName', label: 'VM Name' },
                        { key: 'osVersion', label: 'OS Version' },
                        { key: 'patchStatus', label: 'Patch Status' },
                        { key: 'missingPatches', label: 'Missing Patches' },
                        { key: 'rebootPending', label: 'Reboot Pending' },
                        { key: 'lastPatchDate', label: 'Last Patch Date' },
                        { key: 'osSupportStatus', label: 'OS Support Status' },
                        { key: 'risk', label: 'Risk' },
                      ]}
                      data={[
                        { num: 1, vmName: 'VM-Prod-DB-01', osVersion: 'Windows Server 2016', patchStatus: '❌ Non-Compliant', missingPatches: '6 (3 Critical)', rebootPending: '✅ Yes', lastPatchDate: '10-Jan-26', osSupportStatus: '❌ Out of Support', risk: '🔴 High' },
                        { num: 2, vmName: 'VM-Prod-App-01', osVersion: 'Windows Server 2022', patchStatus: '✅ Compliant', missingPatches: '0', rebootPending: '❌ No', lastPatchDate: '18-Jan-26', osSupportStatus: '✅ Supported', risk: '🟢 Low' },
                        { num: 3, vmName: 'VM-Prod-Web-01', osVersion: 'Windows Server 2019', patchStatus: '⚠ Partial', missingPatches: '2 (1 Critical)', rebootPending: '❌ No', lastPatchDate: '15-Jan-26', osSupportStatus: '✅ Supported', risk: '🟠 Medium' },
                        { num: 4, vmName: 'VM-Test-01', osVersion: 'Ubuntu 20.04 LTS', patchStatus: '❌ Non-Compliant', missingPatches: '4 (2 Security)', rebootPending: '❌ No', lastPatchDate: '05-Jan-26', osSupportStatus: '⚠ Near EOS', risk: '🟠 Medium' },
                        { num: 5, vmName: 'VM-Dev-01', osVersion: 'Windows Server 2012 R2', patchStatus: '❌ Non-Compliant', missingPatches: '9 (5 Critical)', rebootPending: '✅ Yes', lastPatchDate: '02-Jan-26', osSupportStatus: '❌ Out of Support', risk: '🔴 High' },
                      ]}
                    />

                    {/* Key Risks Identified */}
                    <Typography.Title level={3} style={{ textAlign: 'center', margin: '32px 0 24px' }}>
                      Key Risks Identified
                    </Typography.Title>
                    <TableComponent
                      title="Key Risks Identified"
                      columns={[
                        { key: 'risk', label: 'Risk' },
                        { key: 'affectedVMs', label: 'Affected VMs' },
                      ]}
                      data={[
                        { risk: 'Unsupported OS', affectedVMs: 'VM-Prod-DB-01, VM-Dev-01' },
                        { risk: 'Critical patches missing', affectedVMs: 'VM-Prod-DB-01, VM-Dev-01' },
                        { risk: 'Reboot pending', affectedVMs: 'VM-Prod-DB-01, VM-Dev-01' },
                      ]}
                    />
                  </div>
                </div>
              )}
               {/* Domain Overview Tile Content */}
              {selectedTile === 'domain-overview' && (
                <div>
                  {/* Domain Overview Header */}
                  <Card
                    style={{
                      borderRadius: '16px',
                      border: '2px solid #52c41a',
                      boxShadow: '0 4px 12px rgba(82,196,26,0.15)',
                      overflow: 'hidden',
                      marginBottom: '24px'
                    }}
                    bodyStyle={{ padding: '0' }}
                  >
                    <div style={{
                      background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                      padding: '20px',
                      color: 'white'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <GlobalOutlined style={{ fontSize: '32px' }} />
                        <div>
                          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                            Domain Overview Dashboard
                          </h2>
                          <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
                            Domain Health & Security Monitoring
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div style={{ padding: '24px' }}>
                    <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
                      Domain Health Summary
                    </Typography.Title>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12} lg={6}>
                        <Card
                          style={{
                            borderRadius: '12px',
                            border: '1px solid #e8e8e8',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}
                          bodyStyle={{ padding: '20px', textAlign: 'center' }}
                        >
                          <div style={{ marginBottom: '8px' }}>
                            <GlobalOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                          </div>
                          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#52c41a', marginBottom: '4px' }}>
                            5
                          </div>
                          <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
                            Active Domains
                          </div>
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} lg={6}>
                        <Card
                          style={{
                            borderRadius: '12px',
                            border: '1px solid #e8e8e8',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}
                          bodyStyle={{ padding: '20px', textAlign: 'center' }}
                        >
                          <div style={{ marginBottom: '8px' }}>
                            <ClockCircleOutlined style={{ fontSize: '24px', color: '#faad14' }} />
                          </div>
                          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#faad14', marginBottom: '4px' }}>
                            2
                          </div>
                          <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
                            Expiring Soon
                          </div>
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} lg={6}>
                        <Card
                          style={{
                            borderRadius: '12px',
                            border: '1px solid #e8e8e8',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}
                          bodyStyle={{ padding: '20px', textAlign: 'center' }}
                        >
                          <div style={{ marginBottom: '8px' }}>
                            <LockOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                          </div>
                          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1890ff', marginBottom: '4px' }}>
                            4
                          </div>
                          <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
                            SSL Secured
                          </div>
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} lg={6}>
                        <Card
                          style={{
                            borderRadius: '12px',
                            border: '1px solid #e8e8e8',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}
                          bodyStyle={{ padding: '20px', textAlign: 'center' }}
                        >
                          <div style={{ marginBottom: '8px' }}>
                            <TeamOutlined style={{ fontSize: '24px', color: '#722ed1' }} />
                          </div>
                          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#722ed1', marginBottom: '4px' }}>
                            12
                          </div>
                          <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
                            DNS Records
                          </div>
                        </Card>
                      </Col>
                    </Row>

                  </div>

                  {/* MSP Action Plan */}
                  <div style={{ marginBottom: '24px' }}>
                    <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
                      MSP Action Plan
                    </Typography.Title>
                    <TableComponent
                      title=""
                      columns={[
                        { key: "priority", label: "Priority", width: "15%" },
                        { key: "action", label: "Action", width: "60%" },
                        {
                          key: "owner",
                          label: "Owner",
                          width: "25%",
                          render: (value) => (
                            <span style={{
                              fontWeight: "500",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-start"
                            }}>
                              {value}
                            </span>
                          ),
                        },
                      ]}
                      data={[
                        { priority: "P1", action: "Renew abcmfg.com", owner: "MSP" },
                        { priority: "P1", action: "Enable DMARC & DKIM", owner: "MSP" },
                        { priority: "P2", action: "Enable MFA on registrar", owner: "Customer" },
                        { priority: "P2", action: "SSL auto-renew setup", owner: "MSP" },
                      ]}
                    />
                  </div>
                    {/* SSL Certificate Expiry Report */}
<div style={{ marginBottom: '24px' }}>
  <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
    SSL Certificate Expiry Report
  </Typography.Title>
  <TableComponent
    title=""
    columns={[
      { key: 'num', label: '#', width: '5%' },
      { key: 'domain', label: 'Domain / Endpoint', width: '30%' },
      { key: 'expiryDate', label: 'Expiry Date', width: '20%' },
      { key: 'daysToExpiry', label: 'Days to Expiry', width: '15%' },
      { key: 'status', label: 'Status', width: '30%' },
    ]}
    data={sslCertificates.map((cert, idx) => {
      // 1. Ensure numeric evaluation
      const days = Number(cert.daysToExpiry);

      // 2. Define styles based on your logic
      let statusLabel = '🟢 Expiring in >30 days';
      let statusColor = '#16a34a'; // Green
      let bgColor = '#dcfce7';

      if (days <= 7) {
        statusLabel = '🔴 Expiring in ≤7 days';
        statusColor = '#dc2626'; // Red
        bgColor = '#fee2e2';
      } else if (days <= 30) {
        statusLabel = '🟠 Expiring in ≤30 days';
        statusColor = '#d97706'; // Amber
        bgColor = '#fef3c7';
      }

      // 3. Return object formatted for TableComponent
      return {
        num: idx + 1,
        domain: cert.domain,
        expiryDate: cert.expiryDate,
        daysToExpiry: <strong>{days} days</strong>,
        status: (
          <span style={{
            backgroundColor: bgColor,
            color: statusColor,
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'inline-block',
            border: `1px solid ${statusColor}40`,
            minWidth: '160px',
            textAlign: 'center'
          }}>
            {statusLabel}
          </span>
        ),
      };
    })}
  />
  {sslError && <Alert type="error" message={sslError} showIcon style={{ marginTop: 12 }} />}
</div>
                </div>
              )}

              {/* Microsoft 365 Managed Services Content */}
              {selectedTile === 'microsoft-365' && (
                <div>
                  {/* Microsoft 365 Header */}
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

                    {/* Executive Summary (CXO View) */}
                    <div style={{ marginBottom: '24px' }}>
                      <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
                        Executive Summary (CXO View)
                      </Typography.Title>
                      <TableComponent
                        title=""
                        columns={[
                          { key: "area", label: "Area", width: "60%" },
                          {
                            key: "status",
                            label: "Status",
                            width: "40%",
                            render: (value) => {
                              const statusColors: Record<string, string> = {
                                "Needs Improvement": "#ff4d4f",
                                "High Risk": "#ff4d4f",
                                "Savings Possible": "#ff4d4f",
                                "Good": "#52c41a",
                                "Medium": "#faad14"
                              };
                              return (
                                <span style={{
                                  color: statusColors[value] || "#666",
                                  fontWeight: "500",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px"
                                }}>
                                  🔴 {value}
                                </span>
                              );
                            },
                          },
                        ]}
                        data={[
                          { area: "Identity Security", status: "Needs Improvement" },
                          { area: "Email Security", status: "High Risk" },
                          { area: "License Optimization", status: "Savings Possible" },
                          { area: "Data Protection", status: "Good" },
                          { area: "Compliance Readiness", status: "Medium" },
                          { area: "Overall Security Score", status: "67 / 100" },
                        ]}
                        onRowClick={(record) => handleRowClick(record, 'executive-summary')}
                      />
                    </div>

                    {/* User & Identity Governance Report */}
                    <div style={{ marginBottom: '24px' }}>
                      <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
                        User & Identity Governance Report
                      </Typography.Title>
                      <TableComponent
                        title=""
                        columns={[
                          { key: "category", label: "Category", width: "60%" },
                          {
                            key: "count",
                            label: "Count",
                            width: "40%",
                            render: (value) => (
                              <span style={{
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start"
                              }}>
                                {value}
                              </span>
                            ),
                          },
                        ]}
                        data={[
                          { category: "Total Users", count: "48" },
                          { category: "Active Users", count: "42" },
                          { category: "Guest Users", count: "6" },
                          { category: "Inactive Users (>30 days)", count: "7" },
                          { category: "Privileged Users", count: "5" },
                        ]}
                        onRowClick={(record) => handleRowClick(record, 'user-identity-governance')}
                      />
                    </div>

                    {/* Admin Roles & Privileged Access */}
                    <div style={{ marginBottom: '24px' }}>
                      <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
                        Admin Roles & Privileged Access
                      </Typography.Title>
                      <TableComponent
                        title=""
                        columns={[
                          { key: "role", label: "Role", width: "40%" },
                          { key: "assignedUsers", label: "Assigned Users", width: "30%" },
                          {
                            key: "mfaEnabled",
                            label: "MFA Enabled",
                            width: "30%",
                            render: (value) => (
                              <span style={{
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start"
                              }}>
                                {value}
                              </span>
                            ),
                          },
                        ]}
                        data={[
                          { role: "Global Admin", assignedUsers: "3", mfaEnabled: "❌ 1" },
                          { role: "Exchange Admin", assignedUsers: "1", mfaEnabled: "✅" },
                          { role: "Security Admin", assignedUsers: "1", mfaEnabled: "❌" },
                        ]}
                        onRowClick={(record) => handleRowClick(record, 'admin-roles')}
                      />
                    </div>

                    {/* Email Security & Threat Protection */}
                    <div style={{ marginBottom: '24px' }}>
                      <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
                        Email Security & Threat Protection
                      </Typography.Title>
                      <TableComponent
                        title=""
                        columns={[
                          { key: "metric", label: "Metric", width: "70%" },
                          {
                            key: "count",
                            label: "Count",
                            width: "30%",
                            render: (value) => (
                              <span style={{
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start"
                              }}>
                                {value}
                              </span>
                            ),
                          },
                        ]}
                        data={[
                          { metric: "Phishing Emails Blocked", count: "126" },
                          { metric: "Malware Attachments Blocked", count: "18" },
                          { metric: "Spam Emails Blocked", count: "1,450" },
                          { metric: "User-reported Phishing", count: "7" },
                        ]}
                        onRowClick={(record) => handleRowClick(record, 'email-security')}
                      />
                    </div>

                    {/* Domain Email Authentication */}
                    <div style={{ marginBottom: '24px' }}>
                      <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
                        Domain Email Authentication
                      </Typography.Title>
                      <TableComponent
                        title=""
                        columns={[
                          { key: "domain", label: "Domain", width: "25%" },
                          {
                            key: "spf",
                            label: "SPF",
                            width: "15%",
                            render: (value) => (
                              <span style={{
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start"
                              }}>
                                {value}
                              </span>
                            ),
                          },
                          {
                            key: "dkim",
                            label: "DKIM",
                            width: "15%",
                            render: (value) => (
                              <span style={{
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start"
                              }}>
                                {value}
                              </span>
                            ),
                          },
                          {
                            key: "dmarc",
                            label: "DMARC",
                            width: "20%",
                            render: (value) => (
                              <span style={{
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start"
                              }}>
                                {value}
                              </span>
                            ),
                          },
                          {
                            key: "risk",
                            label: "Risk",
                            width: "25%",
                            render: (value) => (
                              <span style={{
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start",
                                gap: "8px"
                              }}>
                                {value}
                              </span>
                            ),
                          },
                        ]}
                        data={[
                          { domain: "abcmfg.com", spf: "✅", dkim: "❌", dmarc: "❌", risk: "🔴 High" },
                          { domain: "abcmfg.co.in", spf: "✅", dkim: "✅", dmarc: "🔴 Monitor", risk: "🔴 Medium" },
                        ]}
                        onRowClick={(record) => handleRowClick(record, 'domain-authentication')}
                      />
                    </div>

                    {/* License Usage & Cost Optimization */}
                    <div style={{ marginBottom: '24px' }}>
                      <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
                        License Usage & Cost Optimization
                      </Typography.Title>
                      <TableComponent
                        title=""
                        columns={[
                          { key: "licenseType", label: "License Type", width: "40%" },
                          {
                            key: "purchased",
                            label: "Purchased",
                            width: "20%",
                            render: (value) => (
                              <span style={{
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start"
                              }}>
                                {value}
                              </span>
                            ),
                          },
                          {
                            key: "assigned",
                            label: "Assigned",
                            width: "20%",
                            render: (value) => (
                              <span style={{
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start"
                              }}>
                                {value}
                              </span>
                            ),
                          },
                          {
                            key: "unused",
                            label: "Unused",
                            width: "20%",
                            render: (value) => (
                              <span style={{
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start"
                              }}>
                                {value}
                              </span>
                            ),
                          },
                        ]}
                        data={[
                          { licenseType: "Business Premium", purchased: "30", assigned: "26", unused: "4" },
                          { licenseType: "E3", purchased: "15", assigned: "10", unused: "5" },
                          { licenseType: "Exchange Online P1", purchased: "10", assigned: "8", unused: "2" },
                        ]}
                        onRowClick={(record) => handleRowClick(record, 'license-usage')}
                      />
                    </div>

                    {/* Collaboration & Teams Governance */}
                    <div style={{ marginBottom: '24px' }}>
                      <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
                        Collaboration & Teams Governance
                      </Typography.Title>
                      <TableComponent
                        title=""
                        columns={[
                          { key: "metric", label: "Metric", width: "70%" },
                          {
                            key: "count",
                            label: "Count",
                            width: "30%",
                            render: (value) => (
                              <span style={{
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start"
                              }}>
                                {value}
                              </span>
                            ),
                          },
                        ]}
                        data={[
                          { metric: "Teams", count: "42" },
                          { metric: "Inactive Teams (>90 days)", count: "9" },
                          { metric: "External Sharing Enabled", count: "14 Teams" },
                          { metric: "SharePoint Sites", count: "38" },
                        ]}
                        onRowClick={(record) => handleRowClick(record, 'teams-governance')}
                      />
                    </div>

                    {/* Data Protection & Backup Status */}
                    <div style={{ marginBottom: '24px' }}>
                      <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
                        Data Protection & Backup Status
                      </Typography.Title>
                      <TableComponent
                        title=""
                        columns={[
                          { key: "workload", label: "Workload", width: "30%" },
                          {
                            key: "backupStatus",
                            label: "Backup Status",
                            width: "35%",
                            render: (value) => (
                              <span style={{
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start"
                              }}>
                                {value}
                              </span>
                            ),
                          },
                          {
                            key: "lastRestoreTest",
                            label: "Last Restore Test",
                            width: "35%",
                            render: (value) => (
                              <span style={{
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start"
                              }}>
                                {value}
                              </span>
                            ),
                          },
                        ]}
                        data={[
                          { workload: "Exchange Online", backupStatus: "✅ Protected", lastRestoreTest: "10-Jan-26" },
                          { workload: "SharePoint Online", backupStatus: "✅ Protected", lastRestoreTest: "12-Jan-26" },
                          { workload: "OneDrive", backupStatus: "✅ Protected", lastRestoreTest: "12-Jan-26" },
                          { workload: "Teams", backupStatus: "🔴 Partial", lastRestoreTest: "Pending" },
                        ]}
                        onRowClick={(record) => handleRowClick(record, 'data-protection')}
                      />
                    </div>

                    {/* Compliance & Audit Readiness */}
                    <div style={{ marginBottom: '24px' }}>
                      <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
                        Compliance & Audit Readiness
                      </Typography.Title>
                      <TableComponent
                        title=""
                        columns={[
                          { key: "area", label: "Area", width: "70%" },
                          {
                            key: "status",
                            label: "Status",
                            width: "30%",
                            render: (value) => (
                              <span style={{
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start",
                                gap: "8px"
                              }}>
                                {value}
                              </span>
                            ),
                          },
                        ]}
                        data={[
                          { area: "Unified Audit Log", status: "✅ Enabled" },
                          { area: "Retention Policies", status: "🔴 Partial" },
                          { area: "DLP Policies", status: "❌ Not Configured" },
                          { area: "Compliance Score", status: "62%" },
                        ]}
                        onRowClick={(record) => handleRowClick(record, 'compliance-readiness')}
                      />
                    </div>

                    {/* Incidents & Support Summary */}
                    <div style={{ marginBottom: '24px' }}>
                      <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
                        Incidents & Support Summary
                      </Typography.Title>
                      <TableComponent
                        title=""
                        columns={[
                          { key: "category", label: "Category", width: "70%" },
                          {
                            key: "tickets",
                            label: "Tickets",
                            width: "30%",
                            render: (value) => (
                              <span style={{
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start"
                              }}>
                                {value}
                              </span>
                            ),
                          },
                        ]}
                        data={[
                          { category: "Password Reset", tickets: "12" },
                          { category: "Mail Delivery Issues", tickets: "4" },
                          { category: "MFA Support", tickets: "6" },
                          { category: "Teams Issues", tickets: "3" },
                          { category: "Total Tickets", tickets: "25" },
                        ]}
                        onRowClick={(record) => handleRowClick(record, 'incidents-support')}
                      />
                    </div>

                    {/* MSP Action Plan (Next 30 Days) */}
                    <div style={{ marginBottom: '24px' }}>
                      <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
                        MSP Action Plan (Next 30 Days)
                      </Typography.Title>
                      <TableComponent
                        title=""
                        columns={[
                          { key: "priority", label: "Priority", width: "15%" },
                          { key: "action", label: "Action", width: "60%" },
                          {
                            key: "owner",
                            label: "Owner",
                            width: "25%",
                            render: (value) => (
                              <span style={{
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start"
                              }}>
                                {value}
                              </span>
                            ),
                          },
                        ]}
                        data={[
                          { priority: "P1", action: "Enforce MFA on all admins", owner: "MSP" },
                          { priority: "P1", action: "Configure DKIM & DMARC", owner: "MSP" },
                          { priority: "P2", action: "License optimization execution", owner: "MSP" },
                          { priority: "P2", action: "Teams lifecycle policy", owner: "MSP" },
                          { priority: "P3", action: "Enable DLP policies", owner: "MSP" },
                        ]}
                        onRowClick={(record) => handleRowClick(record, 'msp-action-plan')}
                      />
                    </div>
                  </div>
                </div>
              )}
            </Col>
          </Row>
        )}

        {/* Detail Modal */}
        <Modal
          title={selectedCardData?.title || ''}
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={null}
          width={800}
          style={{ top: 20 }}
        >
          {selectedCardData && (
            <TableComponent
              title=""
              columns={selectedCardData.columns}
              data={selectedCardData.data}
            />
          )}
        </Modal>
      </div>
  );
}



export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      {
        title: "Dashboard - ZensusTech",
      },
    ],
  }),
});