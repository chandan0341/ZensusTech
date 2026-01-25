import { useState, useEffect } from "react";
import { ENDPOINTS } from "@/constants/api";
import { SubscriptionOption, SubscriptionMetadata } from "@/types/dashboard.types";

interface UseAzureSubscriptionsProps {
  clientId: string;
  clientSecret: string;
  selectedTenant: string;
}

export const useAzureSubscriptions = ({
  clientId,
  clientSecret,
  selectedTenant,
}: UseAzureSubscriptionsProps) => {
  const [azureSubscriptions, setAzureSubscriptions] = useState<SubscriptionOption[]>([]);
  const [mgtToken, setMgtToken] = useState<string>("");
  const [subMetadata, setSubMetadata] = useState<SubscriptionMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize: Fetch token and subscriptions
  useEffect(() => {
    const initializeAzureData = async () => {
      if (!clientId || !clientSecret || !selectedTenant) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch Management Token
        const subTokenResp = await fetch(`${ENDPOINTS.AZURE.TOKEN}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_id: selectedTenant,
            client_id: clientId,
            client_secret: clientSecret,
            scope: "https://management.azure.com/.default"
          })
        });

        if (!subTokenResp.ok) {
          throw new Error("Failed to fetch management token");
        }

        const { access_token: managementToken } = await subTokenResp.json();
        setMgtToken(managementToken);

        // Fetch Subscriptions
        const subsResp = await fetch(`${ENDPOINTS.SUBSCRIPTIONS.LIST}`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${managementToken}` }
        });

        if (!subsResp.ok) {
          throw new Error("Failed to fetch subscriptions");
        }

        const subsData = await subsResp.json();
        
        const dropdownSubs = (subsData.value || [])
          .filter((sub: any) => sub.state === "Enabled")
          .map((sub: any) => ({
            value: sub.subscriptionId,
            label: `${sub.subscriptionId} - ${sub.displayName}`
          }));

        setAzureSubscriptions(dropdownSubs);
      } catch (err: any) {
        console.error("Initialization Error:", err.message);
        setError("Failed to load subscriptions. Check credentials.");
      } finally {
        setLoading(false);
      }
    };

    initializeAzureData();
  }, [clientId, clientSecret, selectedTenant]);

  // Fetch subscription metadata when subscription is selected
  const fetchSubscriptionMetadata = async (subscriptionId: string) => {
    if (!mgtToken || !subscriptionId) return;

    try {
      const metaResp = await fetch(
        `https://management.azure.com/subscriptions/${subscriptionId}?api-version=2020-01-01`,
        {
          method: "GET",
          headers: { "Authorization": `Bearer ${mgtToken}` }
        }
      );

      if (!metaResp.ok) {
        throw new Error("Failed to fetch subscription metadata");
      }

      const metadata = await metaResp.json();
      setSubMetadata(metadata);
    } catch (err: any) {
      console.error("Metadata fetch error:", err.message);
      setSubMetadata(null);
    }
  };

  return {
    azureSubscriptions,
    mgtToken,
    subMetadata,
    loading,
    error,
    fetchSubscriptionMetadata,
  };
};
