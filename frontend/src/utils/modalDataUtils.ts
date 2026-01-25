import { User, ModalData } from "@/types/dashboard.types";
import { formatUserForDisplay } from "./dashboardUtils";

/**
 * Get modal data for a specific role
 */
export const getModalDataByRole = (role: string, users: User[]): ModalData => {
  const filteredUsers = users.filter(u => u.role.toLowerCase() === role.toLowerCase());

  return {
    title: role,
    columns: [
      { key: 'user', label: 'User', width: '18%' },
      { key: 'principalType', label: 'Type', width: '12%' },
      { key: 'role', label: 'Role', width: '12%' },
      { key: 'subscription', label: 'Subscription', width: '18%' },
      { key: 'mfa', label: 'MFA Status', width: '18%' },
      { key: 'status', label: 'Status', width: '12%' },
      { key: 'risk', label: 'Risk', width: '10%' }
    ],
    data: filteredUsers.map(u => formatUserForDisplay(u)),
  };
};

/**
 * Get modal data for MFA disabled users by role
 */
export const getMFADisabledModalData = (role: string, users: User[]): ModalData => {
  const usersForRole = users.filter(u => u.role === role && u.mfa === 'Disabled');

  return {
    title: `MFA Disabled Users - ${role}`,
    columns: [
      { key: "user", label: "User" },
      { key: "principalType", label: "Type" },
      { key: "role", label: "Role" },
      { key: "subscription", label: "Subscription" },
      { key: "mfa", label: "MFA Status" },
      { key: "status", label: "Status" },
      { key: "risk", label: "Risk" },
    ],
    data: usersForRole.map(u => formatUserForDisplay(u)),
  };
};

/**
 * Generate modal data for Azure Identity tile card clicks
 */
export const getAzureIdentityModalData = (cardType: string, users: User[]): ModalData | null => {
  switch (cardType) {
    case 'total-users':
      return {
        title: 'Total Users Details',
        columns: [
          { key: 'user', label: 'User', width: '17%' },
          { key: 'principalType', label: 'Principal Type', width: '13%' },
          { key: 'role', label: 'Role', width: '10%' },
          { key: 'subscription', label: 'Subscription', width: '18%' },
          { key: 'mfa', label: 'MFA Status', width: '17%' },
          { key: 'status', label: 'Status', width: '12%' },
          { key: 'risk', label: 'Risk', width: '11%' }
        ],
        data: users.map(u => formatUserForDisplay(u)),
      };

    case 'active-users':
      return {
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

    case 'inactive-users':
      return {
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

    case 'mfa-enabled':
      return {
        title: 'MFA Enabled Users',
        columns: [
          { key: 'user', label: 'User', width: '20%' },
          { key: 'role', label: 'Role', width: '15%' },
          { key: 'subscription', label: 'Subscription', width: '20%' },
          { key: 'mfa', label: 'MFA Status', width: '22%' },
          { key: 'status', label: 'Status', width: '15%' },
          { key: 'risk', label: 'Risk', width: '08%' }
        ],
        data: users.filter(u => u.mfa === 'Enabled').map(u => formatUserForDisplay(u)),
      };

    case 'mfa-disabled':
      return {
        title: 'MFA Disabled Users',
        columns: [
          { key: 'user', label: 'User', width: '20%' },
          { key: 'role', label: 'Role', width: '15%' },
          { key: 'subscription', label: 'Subscription', width: '20%' },
          { key: 'mfa', label: 'MFA Status', width: '22%' },
          { key: 'status', label: 'Status', width: '15%' },
          { key: 'risk', label: 'Risk', width: '08%' }
        ],
        data: users.filter(u => u.mfa === 'Disabled').map(u => formatUserForDisplay(u)),
      };

    default:
      return null;
  }
};

/**
 * Generate modal data for Microsoft 365 tile card clicks
 */
export const getMicrosoft365ModalData = (cardType: string): ModalData | null => {
  switch (cardType) {
    case 'teams-uptime':
      return {
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

    case 'active-users':
      return {
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

    default:
      return null;
  }
};

/**
 * Generate modal data for Domain Overview tile card clicks
 */
export const getDomainOverviewModalData = (cardType: string): ModalData | null => {
  switch (cardType) {
    case 'active-domains':
      return {
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

    case 'expiring-soon':
      return {
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

    default:
      return null;
  }
};

/**
 * Generate modal data for table row clicks
 */
export const getTableRowModalData = (tableType: string, record: any): ModalData | null => {
  const baseColumns = [
    { key: 'property', label: 'Property', width: '30%' },
    { key: 'value', label: 'Value', width: '70%' },
  ];

  switch (tableType) {
    case 'user-identity-governance':
      return {
        title: `Details for ${record.category}`,
        columns: baseColumns,
        data: [
          { property: 'Category', value: record.category },
          { property: 'Count', value: record.count },
          { property: 'Description', value: `${record.category} represents ${record.count} users in this category.` },
          { property: 'Last Updated', value: new Date().toLocaleDateString() },
        ],
      };

    case 'email-security':
      return {
        title: `Email Security Details: ${record.metric}`,
        columns: baseColumns,
        data: [
          { property: 'Metric', value: record.metric },
          { property: 'Count', value: record.count },
          { property: 'Time Period', value: 'Last 30 days' },
          { property: 'Trend', value: record.metric.includes('Blocked') ? 'Decreasing' : 'Stable' },
          { property: 'Last Updated', value: new Date().toLocaleDateString() },
        ],
      };

    case 'license-usage':
      return {
        title: `License Details: ${record.licenseType}`,
        columns: baseColumns,
        data: [
          { property: 'License Type', value: record.licenseType },
          { property: 'Purchased', value: record.purchased },
          { property: 'Assigned', value: record.assigned },
          { property: 'Unused', value: record.unused },
          { property: 'Utilization %', value: `${Math.round((parseInt(record.assigned) / parseInt(record.purchased)) * 100)}%` },
          { property: 'Cost Savings Potential', value: record.unused > 0 ? `$${parseInt(record.unused) * 50}/month` : 'None' },
        ],
      };

    case 'executive-summary':
      return {
        title: `Security Details: ${record.area}`,
        columns: baseColumns,
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

    // Add more cases as needed...
    default:
      return null;
  }
};
