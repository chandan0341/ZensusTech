"""
Azure license and usage service for Microsoft 365 license management.
"""
from typing import Dict, List

from app.core.logging_config import get_logger
from app.services.azure.graph_service import GraphService

logger = get_logger(__name__)

# License pricing map (in USD per month)
PRICE_MAP = {
    "O365_BUSINESS_PREMIUM": 22.00,
    "ENTERPRISEPACK": 23.00,  # O365 E3
    "DEVELOPER_PACK": 0.00,
    "EXCHANGEONLINEPLAN1": 4.00,
}


class LicenseService:
    """Service for Microsoft 365 license operations."""

    def __init__(self, graph_token: str):
        """
        Initialize license service with Graph token.

        Args:
            graph_token: Microsoft Graph API token
        """
        self.graph_service = GraphService(graph_token)

    async def get_license_usage_details(self) -> Dict:
        """
        Get license usage and optimization details.

        Returns:
            Dictionary with overall score, summary items, and table data
        """
        try:
            # Fetch data in parallel
            skus, usage_data, usage_ok = await self.graph_service.get_license_and_usage()
            score = await self.graph_service.get_secure_score()
            email_sec = await self.graph_service.get_email_security_status()

            license_list = []
            total_unused = 0

            # Calculate inactive users globally
            if usage_ok and usage_data:
                inactive_users = [u for u in usage_data if not u.get("lastActivityDate")]
                total_inactive_count = len(inactive_users)
            else:
                total_inactive_count = 0

            # Process each SKU
            for item in skus:
                sku_name = item.get("skuPartNumber")
                purchased = item.get("prepaidUnits", {}).get("enabled", 0)
                assigned = item.get("consumedUnits", 0)
                unused = purchased - assigned
                total_unused += unused

                if not usage_ok:
                    inactive_display = "N/A"
                    savings_display = "-"
                else:
                    # Estimate inactive portion for this license
                    share_of_inactivity = (
                        int((assigned / len(usage_data)) * total_inactive_count)
                        if usage_data
                        else 0
                    )

                    unit_price = PRICE_MAP.get(sku_name, 0.0)
                    total_savings = (unused + share_of_inactivity) * unit_price

                    inactive_display = share_of_inactivity
                    savings_display = f"${total_savings:,.2f}"

                license_list.append({
                    "license": sku_name.replace("_", " ") if sku_name else "Unknown",
                    "purchased": purchased,
                    "assigned": assigned,
                    "unused": unused,
                    "inactive": inactive_display,
                    "potentialSavings": savings_display,
                })

            # Build executive summary
            executive_summary = [
                {
                    "area": "Identity Security",
                    "status": "Needs Improvement" if score < 75 else "Good",
                    "color": "orange" if score < 75 else "green",
                },
                {
                    "area": "License Optimization",
                    "status": "Savings Possible" if total_unused > 0 else "Optimized",
                    "color": "red" if total_unused > 0 else "green",
                },
                {
                    "area": "Email Security",
                    "status": email_sec["status"],
                    "color": email_sec.get("color", "green"),
                },
            ]

            logger.info(f"License usage report generated with score: {score}%")

            return {
                "overallScore": score,
                "summaryItems": executive_summary,
                "tableData": license_list,
            }

        except Exception as e:
            logger.error(f"Error generating license usage report: {str(e)}", exc_info=True)
            raise

    async def get_identity_governance_report(self) -> List[Dict]:
        """
        Get identity governance report.

        Returns:
            List of governance items
        """
        try:
            user_stats = await self.graph_service.get_identity_governance_data()
            privileged_count = await self.graph_service.get_privileged_user_count()

            if not user_stats:
                return []

            report_data = [
                {"category": "Total Users", "count": user_stats["total"]},
                {"category": "Active Users", "count": user_stats["active"]},
                {"category": "Guest Users", "count": user_stats["guests"]},
                {"category": "Inactive Users (>30 days)", "count": user_stats["inactive"]},
                {"category": "Privileged Users", "count": privileged_count},
            ]

            logger.info("Identity governance report generated")
            return report_data

        except Exception as e:
            logger.error(f"Error generating identity governance report: {str(e)}", exc_info=True)
            raise
