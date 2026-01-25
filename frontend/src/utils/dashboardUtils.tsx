import { User, AdminRoleData } from "@/types/dashboard.types";

/**
 * Process users to generate admin roles data
 */
export const processAdminRoles = (users: User[]): AdminRoleData[] => {
  const rolesMap: Record<string, { total: number; mfaDisabled: number }> = {};

  users.forEach((u: User) => {
    const roleName = u.role || "Standard User";
    if (!rolesMap[roleName]) {
      rolesMap[roleName] = { total: 0, mfaDisabled: 0 };
    }
    rolesMap[roleName].total += 1;
    if (u.mfa === "Disabled") {
      rolesMap[roleName].mfaDisabled += 1;
    }
  });

  return Object.entries(rolesMap).map(([role, stats]) => ({
    role,
    assignedUsers: stats.total.toString(),
    mfaEnabled: stats.mfaDisabled > 0 ? `❌ ${stats.mfaDisabled}` : "✅"
  }));
};

/**
 * Calculate role counts from users
 */
export const calculateRoleCounts = (users: User[]): Record<string, number> => {
  return users.reduce<Record<string, number>>((result, user) => {
    const role = user.role;
    if (result[role]) {
      result[role] += 1;
    } else {
      result[role] = 1;
    }
    return result;
  }, {});
};

/**
 * Calculate MFA statistics
 */
export const calculateMFAStats = (users: User[]) => {
  const mfaEnabledCount = users.filter(user => user.mfa === "Enabled").length;
  const mfaDisabledCount = users.filter(user => user.mfa === "Disabled").length;
  return { mfaEnabledCount, mfaDisabledCount };
};

/**
 * Calculate MFA disabled users by role
 */
export const calculateMFADisabledByRole = (users: User[]) => {
  return Object.entries(
    users.reduce((acc, user) => {
      if (user.mfa === "Disabled") {
        acc[user.role] = (acc[user.role] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>)
  ).map(([role, count]) => ({ role, count }));
};

/**
 * Get risk color based on risk level
 */
export const getRiskColor = (risk: "High" | "Medium" | "Low"): string => {
  return risk === 'High' ? '#dc2626' : risk === 'Medium' ? '#d97706' : '#16a34a';
};

/**
 * Format user data for display
 */
export const formatUserForDisplay = (user: User) => {
  const riskColor = getRiskColor(user.risk);

  return {
    user: user.user,
    principalType: (
      <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
        {user.principalType || 'User'}
      </span>
    ),
    role: user.role,
    subscription: user.subscription,
    mfa: (
      <span style={{ color: user.mfa === 'Enabled' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
        {user.mfa === 'Enabled' ? '✅ Enabled' : '❌ Disabled'}
      </span>
    ),
    status: (
      <span
        style={{
          backgroundColor: user.status === 'Active' ? '#dcfce7' : '#f1f5f9',
          color: user.status === 'Active' ? '#166534' : '#475569',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        {user.status}
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
        <span style={{ color: riskColor, fontWeight: 500 }}>{user.risk}</span>
      </div>
    ),
  };
};
