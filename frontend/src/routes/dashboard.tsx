import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, Form, Select, Row, Col, Space, Spin, Alert, Typography, Modal } from "antd";
import { TeamOutlined, UserOutlined, LockOutlined, ClockCircleOutlined, GlobalOutlined } from "@ant-design/icons";
import {
  fetchDashboardStats,
  fetchUsers,
  fetchRoleCounts,
  fetchInactivityAnalysis,
  fetchExternalUsers,
} from "@/services/dashboardApi";
import {
  TableComponent
} from "@/components/TailAdminReports";
import { useCredentials } from "@/context/CredentialsContext";

interface AzureStats {
  totalUsers: number;
  inactiveUsers: number;
  mfaDisabled: number;
  owners: number;
  guestUsers: number;
  highRiskFindings: number;
}

interface User {
  user: string;
  role: string;
  subscription: string;
  mfa: string;
  lastLogin: string;
  status: string;
  risk: "High" | "Medium" | "Low";
}

const mockTenants = [
  { id: "tenant-1", name: "Default Organization" },
  { id: "tenant-2", name: "Secondary Organization" },
];

const mockSubscriptions = [
  { id: "sub-1", name: "Production" },
  { id: "sub-2", name: "Development" },
  { id: "sub-3", name: "Testing" },
];

function Dashboard() {
  const { clientId, clientSecret } = useCredentials();
  const [selectedTenant, setSelectedTenant] = useState<string>("tenant-1");
  const [selectedSubscription, setSelectedSubscription] = useState<string>("sub-1");
  const [selectedTile, setSelectedTile] = useState<string>("azure-identity");
  const [azureStats, setAzureStats] = useState<AzureStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [ukRoleCounts, setUkRoleCounts] = useState<Array<{ role: string; count: number }>>([]);
  const [usRoleCounts, setUsRoleCounts] = useState<Array<{ role: string; count: number }>>([]);
  const [inactivityData, setInactivityData] = useState<Array<{ period: string; count: number }>>([]);
  const [externalUsers, setExternalUsers] = useState<Array<{ user: string; domain: string; role: string; lastLogin: string; risk: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCardData, setSelectedCardData] = useState<{
    title: string;
    columns: any[];
    data: any[];
  } | null>(null);

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
    setAzureStats(null);
    setUsers([]);
    setUkRoleCounts([]);
    setUsRoleCounts([]);
    setInactivityData([]);
    setExternalUsers([]);
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
      const [stats, userList, ukRoles, usRoles, inactivity, external] = await Promise.all([
        fetchDashboardStats(clientId, clientSecret, selectedTenant, selectedSubscription),
        fetchUsers(clientId, clientSecret, selectedTenant, selectedSubscription),
        fetchRoleCounts(clientId, clientSecret, selectedTenant, "Prod-ERP-Azure-UK"),
        fetchRoleCounts(clientId, clientSecret, selectedTenant, "NonProd-Apps-India"),
        fetchInactivityAnalysis(clientId, clientSecret, selectedTenant, selectedSubscription),
        fetchExternalUsers(clientId, clientSecret, selectedTenant, selectedSubscription),
      ]);

      // Update state with fetched data
      setAzureStats(stats);
      setUsers(userList);
      setUkRoleCounts(ukRoles);
      setUsRoleCounts(usRoles);
      setInactivityData(inactivity);
      setExternalUsers(external);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load governance data";
      console.error("Error fetching governance data:", err);
      setError(`Failed to fetch data from API: ${errorMessage}. Please check if the backend is running and accessible.`);
      setAzureStats(null);
      setUsers([]);
      setUkRoleCounts([]);
      setUsRoleCounts([]);
      setInactivityData([]);
      setExternalUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTenantChange = (tenantId: string) => {
    setSelectedTenant(tenantId);
    setSelectedSubscription("sub-1");
  };

  const handleSubscriptionChange = async (subscriptionId: string) => {
    setSelectedSubscription(subscriptionId);
  };

  const handleCardClick = (cardType: string, currentTile: string) => {
    let modalData = null;

    if (currentTile === 'azure-identity') {
      switch (cardType) {
        case 'total-users':
  modalData = {
    title: 'Total Users Details',
    columns: [
      { key: 'user', label: 'User', width: '20%' },
      { key: 'role', label: 'Role', width: '15%' },
      { key: 'subscription', label: 'Subscription', width: '20%' },
      { key: 'mfa', label: 'MFA Status', width: '22%' },
      { key: 'status', label: 'Status', width: '15%' },
      { key: 'risk', label: 'Risk', width: '08%' }
    ],
    data: users.map((u) => {
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
        case 'owners':
          modalData = {
            title: 'Owner',
            columns: [
      { key: 'user', label: 'User', width: '20%' },
      { key: 'role', label: 'Role', width: '15%' },
      { key: 'subscription', label: 'Subscription', width: '20%' },
      { key: 'mfa', label: 'MFA Status', width: '22%' },
      { key: 'status', label: 'Status', width: '15%' },
      { key: 'risk', label: 'Risk', width: '08%' }
    ],
    data: users.filter(u => u.role === 'Owner').map((u) => {
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
        case 'contributors':
          modalData = {
            title: 'Contributor',
            columns: [
      { key: 'user', label: 'User', width: '20%' },
      { key: 'role', label: 'Role', width: '15%' },
      { key: 'subscription', label: 'Subscription', width: '20%' },
      { key: 'mfa', label: 'MFA Status', width: '22%' },
      { key: 'status', label: 'Status', width: '15%' },
      { key: 'risk', label: 'Risk', width: '08%' }
    ],
    data: users.filter(u => u.role === 'Contributor').map((u) => {
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
        case 'readers':
          modalData = {
            title: 'Reader',
            columns: [
      { key: 'user', label: 'User', width: '20%' },
      { key: 'role', label: 'Role', width: '15%' },
      { key: 'subscription', label: 'Subscription', width: '20%' },
      { key: 'mfa', label: 'MFA Status', width: '22%' },
      { key: 'status', label: 'Status', width: '15%' },
      { key: 'risk', label: 'Risk', width: '08%' }
    ],
    data: users.filter(u => u.role === 'Reader').map((u) => {
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
        case 'inactivity-<30':
          modalData = {
            title: 'Active Users (< 30 days)',
            columns: [
              { key: 'property', label: 'Property', width: '30%' },
              { key: 'value', label: 'Value', width: '70%' },
            ],
            data: [
              { property: 'Inactivity Period', value: '< 30 days' },
              { property: 'User Count', value: inactivityData.find(item => item.period === "< 30 days")?.count || 0 },
              { property: 'Status', value: 'Active' },
              { property: 'Risk Level', value: 'Low' },
              { property: 'Recommendation', value: 'Monitor regularly' },
              { property: 'Last Activity', value: 'Within last month' },
            ],
          };
          break;
        case 'inactivity-30-60':
          modalData = {
            title: 'Moderately Inactive Users (30-60 days)',
            columns: [
              { key: 'property', label: 'Property', width: '30%' },
              { key: 'value', label: 'Value', width: '70%' },
            ],
            data: [
              { property: 'Inactivity Period', value: '30-60 days' },
              { property: 'User Count', value: inactivityData.find(item => item.period === "30–60 days")?.count || 0 },
              { property: 'Status', value: 'Moderately Inactive' },
              { property: 'Risk Level', value: 'Medium' },
              { property: 'Recommendation', value: 'Send reminder notifications' },
              { property: 'Last Activity', value: '1-2 months ago' },
            ],
          };
          break;
        case 'inactivity-60-90':
          modalData = {
            title: 'Highly Inactive Users (60-90 days)',
            columns: [
              { key: 'property', label: 'Property', width: '30%' },
              { key: 'value', label: 'Value', width: '70%' },
            ],
            data: [
              { property: 'Inactivity Period', value: '60-90 days' },
              { property: 'User Count', value: inactivityData.find(item => item.period === "60–90 days")?.count || 0 },
              { property: 'Status', value: 'Highly Inactive' },
              { property: 'Risk Level', value: 'High' },
              { property: 'Recommendation', value: 'Immediate action required' },
              { property: 'Last Activity', value: '2-3 months ago' },
            ],
          };
          break;
        case 'inactivity->90':
          modalData = {
            title: 'Critically Inactive Users (> 90 days)',
            columns: [
              { key: 'property', label: 'Property', width: '30%' },
              { key: 'value', label: 'Value', width: '70%' },
            ],
            data: [
              { property: 'Inactivity Period', value: '> 90 days' },
              { property: 'User Count', value: inactivityData.find(item => item.period === "> 90 days")?.count || 0 },
              { property: 'Status', value: 'Critically Inactive' },
              { property: 'Risk Level', value: 'Critical' },
              { property: 'Recommendation', value: 'Security review required' },
              { property: 'Last Activity', value: 'Over 3 months ago' },
            ],
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
        <div style={{ marginBottom: "32px", display: "flex", justifyContent: "flex-start", alignItems: "center", gap: "12px" }}>
  <img 
    src="/zensustech-logo.png" 
    alt="ZensusTech Logo" 
    style={{ 
      height: "48px", 
      width: "48px",
      objectFit: "contain"
    }} 
  />
        <span style={{ 
          fontSize: "28px", 
          fontWeight: "bold", 
          color: "#1890ff",
          margin: 0
        }}>
          ZensusTech
        </span>
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
                    options={mockTenants.map((t) => ({ label: t.name, value: t.id }))}
                  />
                </Form.Item>
              </Form>
            </Col>
            <Col xs={24} sm={12}>
              <Form layout="vertical">
                <Form.Item label="Subscription">
                  <Select
                    value={selectedSubscription}
                    onChange={handleSubscriptionChange}
                    disabled={!selectedTenant}
                    placeholder={selectedTenant ? "Select a subscription" : "Select a tenant first"}
                    options={mockSubscriptions.map((s) => ({ label: s.name, value: s.id }))}
                  />
                </Form.Item>
              </Form>
            </Col>
          </Row>
        </Card>

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
        {!isLoading && azureStats && (
          <Row gutter={24} style={{ marginTop: '24px' }}>
            {/* Tile Navigation Sidebar */}
            <Col xs={24} lg={6}>
              <Card
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  height: 'fit-content'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <Typography.Title level={4} style={{ margin: 0, textAlign: 'center' }}>
                    Dashboard Tiles
                  </Typography.Title>
                </div>

                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {/* Azure Identity Tile */}
                  <Card
                    style={{
                      borderRadius: '8px',
                      border: selectedTile === 'azure-identity' ? '2px solid #1890ff' : '1px solid #e8e8e8',
                      background: selectedTile === 'azure-identity' ? '#f0f8ff' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    bodyStyle={{ padding: '12px' }}
                    onClick={() => setSelectedTile('azure-identity')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <LockOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1890ff' }}>
                          Azure Identity
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Access Governance
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Domain Overview Tile */}
                  <Card
                    style={{
                      borderRadius: '8px',
                      border: selectedTile === 'domain-overview' ? '2px solid #52c41a' : '1px solid #e8e8e8',
                      background: selectedTile === 'domain-overview' ? '#f6ffed' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    bodyStyle={{ padding: '12px' }}
                    onClick={() => setSelectedTile('domain-overview')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <GlobalOutlined style={{ fontSize: '20px', color: '#52c41a' }} />
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#52c41a' }}>
                          Domain Overview
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Health & Security
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Microsoft 365 Managed Services Tile */}
                  <Card
                    style={{
                      borderRadius: '8px',
                      border: selectedTile === 'microsoft-365' ? '2px solid #722ed1' : '1px solid #e8e8e8',
                      background: selectedTile === 'microsoft-365' ? '#f9f0ff' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    bodyStyle={{ padding: '12px' }}
                    onClick={() => setSelectedTile('microsoft-365')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TeamOutlined style={{ fontSize: '20px', color: '#722ed1' }} />
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#722ed1' }}>
                          Microsoft 365
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Managed Services
                        </div>
                      </div>
                    </div>
                  </Card>
                </Space>
              </Card>
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
                      {/* Stat Cards - Removed */}

                      {/* Charts Section - Disabled */}
                      {/* <Row gutter={16}>
                        <Col xs={24} lg={12}>
                          <LineChartComponent
                            title="User Activity Trend"
                            data={userActivityData}
                            height={380}
                          />
                        </Col>
                        <Col xs={24} lg={12}>
                          <PieChartComponent
                            title="Risk Distribution"
                            data={[
                              { name: "High Risk", value: riskDistribution.high, color: "#ff4d4f" },
                              { name: "Medium Risk", value: riskDistribution.medium, color: "#faad14" },
                              { name: "Low Risk", value: riskDistribution.low, color: "#52c41a" },
                            ]}
                            height={380}
                          />
                        </Col>
                      </Row> */}

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
                        style={{
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          cursor: 'pointer',
                          borderTop: '4px solid #1890ff' // Adding a blue top border to distinguish the parent
                        }}
                        bodyStyle={{ padding: '24px', textAlign: 'center' }}
                        onClick={() => handleCardClick('total-users', selectedTile)}
                      >
                        <div style={{ marginBottom: '8px' }}>
                          <TeamOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                        </div>
                        <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#1890ff' }}>
                          {azureStats?.totalUsers || 47}
                        </div>
                        <div style={{ fontSize: '16px', color: '#666', fontWeight: '600' }}>
                          Total Users
                        </div>
                      </Card>
                    </Col>
                  </Row>

                  {/* --- Child Row (Slightly larger than before) --- */}
                  <Row gutter={[24, 24]} justify="center">
                    {/* Child: Owner */}
                    <Col xs={22} sm={10} lg={6}> 
                      <Card
                        hoverable
                        style={{ 
                          borderRadius: '12px', 
                          borderTop: '4px solid #52c41a',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }}
                        bodyStyle={{ textAlign: 'center', padding: '24px' }} // Increased padding
                         onClick={() => handleCardClick('owners', selectedTile)}
                      >
                        <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px', fontWeight: '500' }}>
                          Owner
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#52c41a' }}>17</div>
                      </Card>
                    </Col>

                    {/* Child: Contributor */}
                    <Col xs={22} sm={10} lg={6}>
                      <Card
                        hoverable
                        style={{ 
                          borderRadius: '12px', 
                          borderTop: '4px solid #52c41a',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }}
                        bodyStyle={{ textAlign: 'center', padding: '24px' }} // Increased padding
                        onClick={() => handleCardClick('contributors', selectedTile)}
                      >
                        <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px', fontWeight: '500' }}>
                          Contributor
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#52c41a' }}>9</div>
                      </Card>
                    </Col>
                    {/* Child: Reader */}
                    <Col xs={22} sm={10} lg={6}>
                      <Card
                        hoverable
                        style={{ 
                          borderRadius: '12px', 
                          borderTop: '4px solid #52c41a',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }}
                        bodyStyle={{ textAlign: 'center', padding: '24px' }} // Increased padding
                        onClick={() => handleCardClick('readers', selectedTile)}
                      >
                        <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px', fontWeight: '500' }}>
                          Reader
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#52c41a' }}>21</div>
                      </Card>
                    </Col>
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
                                31 users
                              </div>
                              <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
                                MFA Coverage - Enabled
                              </div>
                            </Card>
                          </Col>
                          <Col xs={24} sm={12}>
                            <Card
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
                                16 users
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
                          data={[
                            { role: "Owner", count: "3" },
                            { role: "Contributor", count: "9" },
                            { role: "Reader", count: "4" },
                          ]}
                          onRowClick={(record) => handleRowClick(record, 'mfa-disabled-roles')}
                        />
                      </div>
                      {/* Subscription Tables */}
                      <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
                        Subscription-Wise Access Matrix
                      </Typography.Title>
                      <Row gutter={16}>
                        <Col span={12}>
                          <TableComponent
                            title="Subscription:Prod-ERP-Azure-UK"
                            columns={[
                              { key: "role", label: "Role" },
                              { key: "count", label: "Count" },
                            ]}
                            data={ukRoleCounts}
                            onRowClick={(record) => handleRowClick(record, 'subscription-roles')}
                          />
                        </Col>
                        <Col span={12}>
                          <TableComponent
                            title="Subscription:NonProd-Apps-India"
                            columns={[
                              { key: "role", label: "Role" },
                              { key: "count", label: "Count" },
                            ]}
                            data={usRoleCounts}
                            onRowClick={(record) => handleRowClick(record, 'subscription-roles')}
                          />
                        </Col>
                      </Row>

                      {/* Inactivity Analysis */}
                      <div style={{ marginBottom: '24px' }}>
                        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
                          Inactivity Analysis
                        </Typography.Title>

                        {/* Inactivity Period Summary Cards */}
                        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                          <Col xs={24} sm={6}>
                            <Card
                              style={{
                                borderRadius: '12px',
                                border: '1px solid #e8e8e8',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                cursor: 'pointer'
                              }}
                              bodyStyle={{ padding: '20px', textAlign: 'center' }}
                              onClick={() => handleCardClick('inactivity-<30', selectedTile)}
                            >
                              <div style={{ marginBottom: '8px' }}>
                                <UserOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                              </div>
                              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#52c41a', marginBottom: '4px' }}>
                                {inactivityData.find(item => item.period === "< 30 days")?.count || 0}
                              </div>
                              <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
                                &lt; 30 days
                              </div>
                            </Card>
                          </Col>
                          <Col xs={24} sm={6}>
                            <Card
                              style={{
                                borderRadius: '12px',
                                border: '1px solid #e8e8e8',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                cursor: 'pointer'
                              }}
                              bodyStyle={{ padding: '20px', textAlign: 'center' }}
                              onClick={() => handleCardClick('inactivity-30-60', selectedTile)}
                            >
                              <div style={{ marginBottom: '8px' }}>
                                <UserOutlined style={{ fontSize: '24px', color: '#faad14' }} />
                              </div>
                              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#faad14', marginBottom: '4px' }}>
                                {inactivityData.find(item => item.period === "30–60 days")?.count || 0}
                              </div>
                              <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
                                30–60 days
                              </div>
                            </Card>
                          </Col>
                          <Col xs={24} sm={6}>
                            <Card
                              style={{
                                borderRadius: '12px',
                                border: '1px solid #e8e8e8',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                cursor: 'pointer'
                              }}
                              bodyStyle={{ padding: '20px', textAlign: 'center' }}
                              onClick={() => handleCardClick('inactivity-60-90', selectedTile)}
                            >
                              <div style={{ marginBottom: '8px' }}>
                                <UserOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />
                              </div>
                              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ff4d4f', marginBottom: '4px' }}>
                                {inactivityData.find(item => item.period === "60–90 days")?.count || 0}
                              </div>
                              <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
                                60–90 days
                              </div>
                            </Card>
                          </Col>
                          <Col xs={24} sm={6}>
                            <Card
                              style={{
                                borderRadius: '12px',
                                border: '1px solid #e8e8e8',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                cursor: 'pointer'
                              }}
                              bodyStyle={{ padding: '20px', textAlign: 'center' }}
                              onClick={() => handleCardClick('inactivity->90', selectedTile)}
                            >
                              <div style={{ marginBottom: '8px' }}>
                                <UserOutlined style={{ fontSize: '24px', color: '#722ed1' }} />
                              </div>
                              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#722ed1', marginBottom: '4px' }}>
                                {inactivityData.find(item => item.period === "> 90 days")?.count || 0}
                              </div>
                              <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
                                &gt; 90 days
                              </div>
                            </Card>
                          </Col>
                        </Row>
                      </div>

                      {/* Guest & External Users */}
                      <div style={{ marginBottom: '24px' }}>
                        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>
                          Guest & External Users
                        </Typography.Title>

                        <TableComponent
                          title=""
                          columns={[
                            { key: "user", label: "User" },
                            {
                              key: "domain",
                              label: "Domain",
                              render: (value) => (
                                <span style={{
                                  color: value === "External" ? "#faad14" : "#1890ff",
                                  fontWeight: "500"
                                }}>
                                  <UserOutlined style={{ marginRight: "6px" }} />
                                  {value}
                                </span>
                              ),
                            },
                            {
                              key: "role",
                              label: "Role",
                              render: (value) => {
                                const colors: Record<string, string> = {
                                  "Reader": "#52c41a",
                                  "Contributor": "#1890ff",
                                  "Owner": "#722ed1"
                                };
                                return (
                                  <span style={{
                                    color: colors[value as string] || "#666",
                                    fontWeight: "500"
                                  }}>
                                    {value}
                                  </span>
                                );
                              },
                            },
                            {
                              key: "lastLogin",
                              label: "Last Login",
                              render: (value) => {
                                const days = parseInt(value.split(' ')[0]);
                                let color = "#52c41a"; // Green for recent

                                if (days > 90) color = "#722ed1"; // Purple for very old
                                else if (days > 60) color = "#ff4d4f"; // Red for old
                                else if (days > 30) color = "#faad14"; // Amber for moderate

                                return (
                                  <span style={{
                                    color: color,
                                    fontWeight: "500",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px"
                                  }}>
                                    <ClockCircleOutlined />
                                    {value}
                                  </span>
                                );
                              },
                            },
                            {
                              key: "risk",
                              label: "Risk",
                              render: (value) => {
                                const colors: Record<string, string> = {
                                  "Critical": "#ff4d4f",
                                  "High": "#faad14",
                                  "Medium": "#faad14",
                                  "Low": "#52c41a"
                                };

                                return (
                                  <span style={{
                                    backgroundColor: colors[value as string] || "#666",
                                    color: "white",
                                    padding: "4px 8px",
                                    borderRadius: "12px",
                                    fontSize: "12px",
                                    fontWeight: "500",
                                    display: "inline-block"
                                  }}>
                                    {value}
                                  </span>
                                );
                              },
                            },
                          ]}
                          data={externalUsers}
                        />
                      </div>
                    </Space>
                  </div>
                </div>
              )}

              {/* Domain Overview Content */}
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