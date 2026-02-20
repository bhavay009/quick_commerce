const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getFinancialInsights = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Fetch all SKUs for the user
        const skus = await prisma.sku.findMany({
            where: { userId },
        });

        if (skus.length === 0) {
            return res.status(200).json({ wastedSpend: 0, opportunity: 0 });
        }

        let wastedSpend = 0;
        let totalOrders = 0;

        // Calculate metrics
        skus.forEach(sku => {
            const spend = Number(sku.spend);
            const revenue = Number(sku.revenue);
            const orders = Number(sku.orders);
            const roas = spend > 0 ? revenue / spend : 0;

            // Logic for "Pause" (Weak performers)
            // ROAS < 0.8 is considered "Pause" as per our metrics.js logic
            if (roas < 0.8 && spend > 0) {
                wastedSpend += spend;
            }

            totalOrders += orders;
        });

        // Calculate Opportunity
        const avgOrders = totalOrders / skus.length;

        // Identify "Push" SKUs (ROAS >= 1.5)
        const topSkus = skus.filter(sku => {
            const spend = Number(sku.spend);
            const revenue = Number(sku.revenue);
            return (spend > 0 ? revenue / spend : 0) >= 1.5;
        });

        // Estimate opportunity: If we reallocated budget from bad SKUs to good ones.
        // Simplified logic: Assume top SKUs could generate 20% more orders if budget was optimized
        // Or: (Avg Orders of Top SKUs - Avg Orders of All) * Count of Top SKUs

        let opportunityOrders = 0;
        if (topSkus.length > 0) {
            const topSkuAvgOrders = topSkus.reduce((acc, sku) => acc + Number(sku.orders), 0) / topSkus.length;
            // Difference in performance * number of strong candidates
            // This is a rough estimation of "potential" if average SKUs performed like top SKUs
            opportunityOrders = Math.round((topSkuAvgOrders - avgOrders) * topSkus.length);

            // Ensure it's not negative
            if (opportunityOrders < 0) opportunityOrders = 0;
        }

        res.status(200).json({
            wastedSpend,
            opportunityOrders,
            topSkuCount: topSkus.length
        });

    } catch (error) {
        console.error('Error calculating insights:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
