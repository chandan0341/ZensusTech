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

  // 1. Fetch Subscriptions List (Now explicitly named refreshSubscriptions for the dashboard)
  const refreshSubscriptions = useCallback(async () => {
    if (!selectedTenant) {
      setAzureSubscriptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // --- TOKEN RETRIEVAL ---
      const mgmtToken = localStorage.getItem('mgmt_token');

      if (!mgmtToken) {
        throw new Error("No active session found. Please reconnect.");
      }

      const response = await fetch(`/api/v1/subscriptions?tenant_id=${selectedTenant}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${mgmtToken}`,
          "Content-Type": "application/json"
        }
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

  // Initial load
  useEffect(() => {
    refreshSubscriptions();
  }, [refreshSubscriptions]);

  return {
    azureSubscriptions,
    subMetadata,
    loading,
    error,
    fetchSubscriptionMetadata,
    refreshSubscriptions, // <--- ADDED THIS LINE to fix TS2339
  };
};