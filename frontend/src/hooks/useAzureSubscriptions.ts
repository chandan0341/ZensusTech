/**
 * Hook to manage Azure Subscription listing and metadata via Bearer tokens.
 */
import { useState, useEffect, useCallback } from "react";
import { SubscriptionOption } from "@/types/dashboard.types";

interface UseAzureSubscriptionsProps {
  selectedTenant: string;
}

export const useAzureSubscriptions = ({
  selectedTenant,
}: UseAzureSubscriptionsProps) => {
  const [azureSubscriptions, setAzureSubscriptions] = useState<SubscriptionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dropdownSubs: SubscriptionOption[] = [
    { label: "Subscription A", value: "sub-a-id" },
    { label: "Subscription B", value: "sub-b-id" },
    { label: "Subscription C", value: "sub-c-id" },
  ];

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
      
      setAzureSubscriptions(dropdownSubs);
    } catch (err: any) {
      console.error("Subscription fetch error:", err);
      setError(err.message || "Failed to load subscriptions.");
    } finally {
      setLoading(false);
    }
  }, [selectedTenant]);


  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  return {
    azureSubscriptions,
    loading,
    error
  };
};