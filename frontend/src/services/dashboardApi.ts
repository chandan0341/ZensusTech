interface AzureStats {
  totalUsers: number
  inactiveUsers: number
  mfaDisabled: number
  owners: number
  guestUsers: number
  highRiskFindings: number
}

interface RiskDistribution {
  high: number
  medium: number
  low: number
}

interface User {
  user: string
  role: string
  subscription: string
  mfa: string
  lastLogin: string
  status: string
  risk: "High" | "Medium" | "Low"
}

interface RoleCount {
  role: string
  count: number
}

interface InactivityPeriod {
  period: string
  count: number
}

interface ExternalUser {
  user: string
  domain: string
  role: string
  lastLogin: string
  risk: string
}

// Ensure API_BASE_URL includes /api/v1 if not already included
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"
  // If the URL doesn't end with /api/v1, add it
  if (envUrl && !envUrl.endsWith('/api/v1')) {
    return envUrl.endsWith('/') ? `${envUrl}api/v1` : `${envUrl}/api/v1`
  }
  return envUrl
}

const API_BASE_URL = getApiBaseUrl()
console.log("API Base URL configured as:", API_BASE_URL)

interface GovernanceRequest {
  clientId: string
  clientSecret: string
  tenantId: string
  subscriptionId: string
}

export async function fetchDashboardStats(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  subscriptionId: string
): Promise<AzureStats> {
  const url = `${API_BASE_URL}/governance/stats`
  console.log("Fetching dashboard stats from:", url)
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        clientSecret,
        tenantId,
        subscriptionId,
      } as GovernanceRequest),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error("API Error:", error)
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    console.log("Dashboard stats received:", data)
    return data
  } catch (error) {
    console.error("Error fetching dashboard stats from", url, ":", error)
    throw error
  }
}

export async function fetchRiskDistribution(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  subscriptionId: string
): Promise<RiskDistribution> {
  try {
    const response = await fetch(`${API_BASE_URL}/governance/risk-distribution`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        clientSecret,
        tenantId,
        subscriptionId,
      } as GovernanceRequest),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching risk distribution:", error)
    throw error
  }
}

export async function fetchUserDrilldown(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  subscriptionId: string
): Promise<User[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/governance/users/drilldown`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        clientSecret,
        tenantId,
        subscriptionId,
      } as GovernanceRequest),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching user drilldown:", error)
    throw error
  }
}

export async function fetchUserActivityTrend(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  subscriptionId: string
): Promise<Array<{ week: string; signIns: number }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/governance/user-activity-trend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        clientSecret,
        tenantId,
        subscriptionId,
      } as GovernanceRequest),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching activity trend:", error)
    throw error
  }
}

export async function fetchRoleCounts(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  subscriptionId: string
): Promise<RoleCount[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/governance/role-counts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        clientSecret,
        tenantId,
        subscriptionId,
      } as GovernanceRequest),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching role counts:", error)
    throw error
  }
}

export async function fetchInactivityAnalysis(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  subscriptionId: string
): Promise<InactivityPeriod[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/governance/inactivity-analysis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        clientSecret,
        tenantId,
        subscriptionId,
      } as GovernanceRequest),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching inactivity analysis:", error)
    throw error
  }
}

export async function fetchExternalUsers(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  subscriptionId: string
): Promise<ExternalUser[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/governance/external-users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        clientSecret,
        tenantId,
        subscriptionId,
      } as GovernanceRequest),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching external users:", error)
    throw error
  }
}
