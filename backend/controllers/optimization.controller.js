const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getOptimizationInsights = async (req, res) => {
    try {
        const userId = req.user.userId;
        const skus = await prisma.sku.findMany({ where: { userId } });

        const insights = {
            visibility: [],
            interaction: [],
            conversion: [],
            placement: [],
            leakage: []
        };

        if (skus.length === 0) {
            return res.status(200).json(insights);
        }

        skus.forEach(sku => {
            const spend = Number(sku.spend);
            const impressions = Number(sku.impressions);
            const clicks = Number(sku.clicks);
            const orders = Number(sku.orders);
            const revenue = Number(sku.revenue);
            const roas = spend > 0 ? revenue / spend : 0;
            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
            const conversionRate = clicks > 0 ? (orders / clicks) * 100 : 0;
            const placement = sku.placement || 'Unknown';

            // 1. Visibility Issues: High Impressions (> 1000) but Low CTR (< 0.5%)
            // "Ads seen but ignored"
            if (impressions > 1000 && ctr < 0.5) {
                insights.visibility.push({
                    sku: sku.sku_name,
                    metric: `${ctr.toFixed(2)}% CTR`,
                    message: `Ads seen ${impressions} times but rarely clicked. Creative or headline may not be relevant.`,
                    action: "Test new ad creative or headline."
                });
            }

            // 2. Interaction Issues: High Clicks (> 50) but Low Orders (< 1)
            // "Browsing but not buying"
            if (clicks > 50 && orders === 0) {
                insights.interaction.push({
                    sku: sku.sku_name,
                    metric: `${clicks} Clicks, 0 Orders`,
                    message: `Users are clicking but not buying. Price, pack size, or landing page may be the issue.`,
                    action: "Check product page details or price competitiveness."
                });
            }

            // 3. Budget Leakage: Spend > 1000 with 0 Orders
            // "Spending without return"
            if (spend > 1000 && orders === 0) {
                insights.leakage.push({
                    sku: sku.sku_name,
                    metric: `₹${spend} Wasted`,
                    message: `This ad is consuming budget without generating a single order.`,
                    action: "Pause immediately to stop waste."
                });
            }

            // 4. Conversion Issues: High Spend (> 2000), Low ROAS (< 1.0), but getting Orders
            // "Orders low compared to spend"
            if (spend > 2000 && roas < 1.0 && orders > 0) {
                insights.conversion.push({
                    sku: sku.sku_name,
                    metric: `${roas.toFixed(2)}x ROAS`,
                    message: `Generating orders but at a loss.`,
                    action: "Adjust bid or improve average order value."
                });
            }
        });

        // 5. Placement Issues (Aggregate Analysis)
        // Compare performance by placement if data exists
        const placementStats = {};
        skus.forEach(sku => {
            if (sku.placement) {
                if (!placementStats[sku.placement]) {
                    placementStats[sku.placement] = { spend: 0, orders: 0, revenue: 0 };
                }
                placementStats[sku.placement].spend += Number(sku.spend);
                placementStats[sku.placement].orders += Number(sku.orders);
                placementStats[sku.placement].revenue += Number(sku.revenue);
            }
        });

        const placements = Object.keys(placementStats);
        if (placements.length > 1) {
            placements.forEach(p => {
                const stats = placementStats[p];
                const roas = stats.spend > 0 ? stats.revenue / stats.spend : 0;
                if (roas > 2.0) {
                    insights.placement.push({
                        placement: p,
                        metric: `${roas.toFixed(2)}x ROAS`,
                        message: `${p} placement is performing exceptionally well.`,
                        action: `Shift budget towards ${p}.`
                    });
                } else if (roas < 0.8 && stats.spend > 1000) {
                    insights.placement.push({
                        placement: p,
                        metric: `${roas.toFixed(2)}x ROAS`,
                        message: `${p} placement is underperforming.`,
                        action: `Reduce bid or pause ads on ${p}.`
                    });
                }
            });
        }

        res.status(200).json(insights);

    } catch (error) {
        console.error('Error generating optimization insights:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
