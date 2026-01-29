/**
 * Hook to manage Azure Subscription listing and metadata via Bearer tokens.
 */
import { useState, useEffect, useCallback } from "react";
import { SubscriptionOption, SubscriptionMetadata } from "@/types/dashboard.types";

interface UseAzureSubscriptionsProps {
  selectedTenant: string;
}

export const useAzureSubscriptions = ({
  selectedTenant,
}: UseAzureSubscriptionsProps) => {
  const [azureSubscriptions, setAzureSubscriptions] = useState<SubscriptionOption[]>([]);
  const [subMetadata, setSubMetadata] = useState<SubscriptionMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Subscriptions List
  const fetchSubscriptions = useCallback(async () => {
    if (!selectedTenant) {
      setAzureSubscriptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // --- TOKEN RETRIEVAL ---
      // Get the management token saved during the /connect phase
      const mgmtToken = localStorage.getItem('mgmt_token');

      if (!mgmtToken) {
        throw new Error("No active session found. Please reconnect.");
      }

      /**
       * We now pass the token in the Authorization header.
       * This avoids the 4KB cookie size limit entirely.
       */
      const response = await fetch(`/api/v1/subscriptions?tenant_id=${selectedTenant}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${mgmtToken}`,
          "Content-Type": "application/json"
        }
        // credentials: 'include' is removed as we are not using cookies
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error("Azure session expired or unauthorized. Please reconnect.");
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to fetch subscriptions.");
      }

      const data = await response.json();
      
      const dropdownSubs = (data.value || [])
        .filter((sub: any) => sub.state === "Enabled")
        .map((sub: any) => ({
          value: sub.subscriptionId,
          label: `${sub.subscriptionId} - ${sub.displayName}`
        }));

      setAzureSubscriptions(dropdownSubs);
    } catch (err: any) {
      console.error("Subscription fetch error:", err);
      setError(err.message || "Failed to load subscriptions.");
    } finally {
      setLoading(false);
    }
  }, [selectedTenant]);

  // 2. Fetch Subscription Metadata
  const fetchSubscriptionMetadata = useCallback(async (subscriptionId: string) => {
    if (!subscriptionId) {
      setSubMetadata(null);
      return;
    };

    try {
      const mgmtToken = localStorage.getItem('mgmt_token');

      // Updated path: Ensure this matches the router path in your FastAPI azure.py
      const response = await fetch(`/api/v1/subscriptions/${subscriptionId}/metadata`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${mgmtToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) throw new Error("Metadata fetch failed");

      const metadata = await response.json();
      setSubMetadata(metadata);
    } catch (err: any) {
      console.error("Metadata fetch error:", err);
      setSubMetadata(null);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  return {
    azureSubscriptions,
    subMetadata,
    loading,
    error,
    fetchSubscriptionMetadata,
  };
};