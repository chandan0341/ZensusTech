import { useState, useEffect, useCallback } from "react";
import { SubscriptionOption, SubscriptionMetadata } from "@/types/dashboard.types";

interface UseAzureSubscriptionsProps {
  selectedTenant: string;
}

export const useAzureSubscriptions = ({
  selectedTenant,
}: UseAzureSubscriptionsProps) => {
  const [azureSubscriptions, setAzureSubscriptions] = useState<SubscriptionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subMetadata, setSubMetadata] = useState<SubscriptionMetadata | null>(null);

  // Updated to match the metadata ID below
  const dropdownSubs: SubscriptionOption[] = [
    { label: "Subscription-PROD", value: "95f52ab4-5d3f-49e6-8ef7-1b14626ff046" },
    { label: "Subscription-DEV", value: "c0c05a7c-36f8-4fb7-b1cd-a283e5a6d422" },
  ];

  const metadata: SubscriptionMetadata = {
  authorizationSource: "RoleBased",
  subscriptionId: "95f52ab4-5d3f-49e6-8ef7-1b14626ff046",
  state: "Enabled",
  // Remove the extra properties to satisfy the type 'SubscriptionMetadata'
  subscriptionPolicies: {
    spendingLimit: "Off"
  }
};

  const fetchSubscriptions = useCallback(async () => {
    if (!selectedTenant) {
      setAzureSubscriptions([]);
      setSubMetadata(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // If fetching from API later, this is where you'd call SubscriptionService
      setAzureSubscriptions(dropdownSubs);
      setSubMetadata(metadata);
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
    subMetadata, // Added this to return
    loading,
    error
  };
};