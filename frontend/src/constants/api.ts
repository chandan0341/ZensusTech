// src/constants/api.ts

// Fallback to localhost if the .env variable is missing
const BASE_URL = 'http://localhost:8000/api/v1';

export const ENDPOINTS = {
    AZURE: {
        TOKEN: `${BASE_URL}/azure/token`,
        ROLES: `${BASE_URL}/azure/roles`,
        USERS: `${BASE_URL}/azure/users`,
        TANENT_USERS: `${BASE_URL}/azure/tenant/users`,
    },
    USERS: {
        DASHBOARD: `${BASE_URL}/users/dashboard`,
        GOVERNANCE: `${BASE_URL}/users/governance`,
    },
    SECURITY: {
        SECURE_SCORE: `${BASE_URL}/security/score`,
        EMAIL_STATUS: `${BASE_URL}/security/email-status`,
    },
    SUBSCRIPTIONS: {
        LIST: `${BASE_URL}/azure/subscriptions`,
    },
    MICROSOFT:{
        LICENSE_AND_USAGE_DETAILS: `${BASE_URL}/microsoft0365/license_and_usage_details`,
        IDENTITY_GOVERNANCE: `${BASE_URL}/microsoft0365/identity/governance`,
        SECURE_SCORE_DETAILS: `${BASE_URL}/microsoft0365/secure/score`,
    }
};