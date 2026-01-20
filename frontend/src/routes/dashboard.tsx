            
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, Form, Select, Row, Col, Space, Spin, Alert, Typography, Modal } from "antd";
import { TeamOutlined, UserOutlined, LockOutlined, ClockCircleOutlined, GlobalOutlined } from "@ant-design/icons";
import { DashboardTiles } from "./DashboardTiles";
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
                    <Typography.Title level={3} style={{ textAlign: 'center', margin: '32px 0 24px' }}>Top Security Recommendations</Typography.Title>
                    <TableComponent
                      title=""
                      columns={[
                        { key: 'num', label: '#' },
                        { key: 'rec', label: 'Recommendation' },
                        { key: 'severity', label: 'Severity' },
                        { key: 'affected', label: 'Affected Resources' },
                        { key: 'status', label: 'Status' },
                      ]}
                      data={[
                        { num: 1, rec: 'Enable MFA for subscription owners', severity: 'High', affected: 'Subscription', status: 'Unhealthy' },
                        { num: 2, rec: 'System updates should be installed on VMs', severity: 'High', affected: '3 VMs', status: 'Unhealthy' },
                        { num: 3, rec: 'NSG allows inbound traffic on port 3389', severity: 'High', affected: '2 NSGs', status: 'Unhealthy' },
                        { num: 4, rec: 'Disk encryption should be enabled', severity: 'Medium', affected: '1 VM', status: 'Unhealthy' },
                        { num: 5, rec: 'Storage account public access enabled', severity: 'Medium', affected: '2 Storage Accounts', status: 'Unhealthy' },
                        { num: 6, rec: 'Endpoint protection missing', severity: 'Medium', affected: '1 VM', status: 'Unhealthy' },
                      ]}
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
                          { key: 'certName', label: 'Certificate Name', width: '15%' },
                          { key: 'domain', label: 'Domain / Endpoint', width: '20%' },
                          { key: 'issuer', label: 'Issuer', width: '12%' },
                          { key: 'expiry', label: 'Expiry Date', width: '15%' },
                          { key: 'days', label: 'Days to Expiry', width: '15%' },
                          { key: 'status', label: 'Status', width: '18%' },
                        ]}
                        data={[
                          { num: 1, certName: 'Prod-Web-SSL', domain: 'www.company.com', issuer: 'DigiCert', expiry: '27-Jan-26', days: '7 days', status: '🔴 Expiring in ≤7 days' },
                          { num: 2, certName: 'API-Gateway-SSL', domain: 'api.company.com', issuer: 'Let’s Encrypt', expiry: '05-Feb-26', days: '16 days', status: '🔴 Expiring in ≤30 days' },
                          { num: 3, certName: 'ERP-App-SSL', domain: 'erp.company.in', issuer: 'GlobalSign', expiry: '25-Feb-26', days: '36 days', status: '🔴 Expiring in >30 days' },
                          { num: 4, certName: 'VPN-SSL', domain: 'vpn.company.com', issuer: 'DigiCert', expiry: '30-Apr-26', days: '100 days', status: '🔴 Expiring in >90 days' },
                          { num: 5, certName: 'Internal-Portal-SSL', domain: 'intranet.company.local', issuer: 'Self-Signed', expiry: '15-Mar-26', days: '54 days', status: '🔴 Expiring in >30 days' },
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