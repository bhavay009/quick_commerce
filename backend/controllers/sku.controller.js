const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Add a new SKU (treated as a single-entry import for now)
exports.createSku = async (req, res) => {
    try {
        const { sku_name, spend, impressions, orders, revenue } = req.body;
        const userId = req.user.userId;

        if (!sku_name || spend < 0 || impressions < 0 || orders < 0 || revenue < 0) {
            return res.status(400).json({ error: 'Invalid input data' });
        }

        // Create an ImportHistory record for this "manual import"
        const importRecord = await prisma.importHistory.create({
            data: {
                userId,
                filename: 'Manual Entry',
                row_count: 1,
                sku_count: 1,
                date_range_start: new Date(),
                date_range_end: new Date(),
            },
        });

        const newSku = await prisma.sku.create({
            data: {
                userId,
                importId: importRecord.id, // Link to import history
                sku_name,
                spend: parseFloat(spend), // Ensure Decimal
                impressions: parseInt(impressions), // Ensure Int
                orders: parseInt(orders), // Ensure Int
                revenue: parseFloat(revenue), // Ensure Decimal
            },
        });

        res.status(201).json(newSku);
    } catch (error) {
        console.error('Error creating SKU:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Bulk create SKUs from CSV upload
exports.createBulkSkus = async (req, res) => {
    try {
        const { skus, filename } = req.body; // Expecting array of SKU objects and filename
        const userId = req.user.userId;

        if (!skus || !Array.isArray(skus) || skus.length === 0) {
            return res.status(400).json({ error: 'Invalid input data. Expected array of SKUs.' });
        }

        // Calculate stats for import history
        const rowCount = skus.length;
        const uniqueSkus = new Set(skus.map(s => s.sku)).size;

        // Find date range
        const dates = skus.map(s => new Date(s.date).getTime()).filter(d => !isNaN(d));
        const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
        const maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();

        // Transaction: Create Import History -> Create SKUs
        const result = await prisma.$transaction(async (prisma) => {
            const importRecord = await prisma.importHistory.create({
                data: {
                    userId,
                    filename: filename || 'CSV Upload',
                    row_count: rowCount,
                    sku_count: uniqueSkus,
                    date_range_start: minDate,
                    date_range_end: maxDate,
                },
            });

            const skuData = skus.map(item => {
                const spend = parseFloat(item.spend || 0);
                const revenue = parseFloat(item.revenue || 0);
                const orders = parseInt(item.orders || 0);
                const impressions = parseInt(item.impressions || 0);
                const clicks = parseInt(item.clicks || 0);

                // Calculate derived metrics if not provided
                // CTR = (Clicks / Impressions) * 100
                const ctr = item.ctr ? parseFloat(item.ctr) : (impressions > 0 ? (clicks / impressions) * 100 : 0);

                // CPC = Spend / Clicks
                const cpc = item.cpc ? parseFloat(item.cpc) : (clicks > 0 ? spend / clicks : 0);

                // Conversion Rate = (Orders / Clicks) * 100
                const conversion_rate = item.conversion_rate ? parseFloat(item.conversion_rate) : (clicks > 0 ? (orders / clicks) * 100 : 0);

                return {
                    userId,
                    importId: importRecord.id,
                    sku_name: item.sku,
                    spend,
                    impressions,
                    orders,
                    revenue,
                    clicks,
                    ctr,
                    cpc,
                    conversion_rate,
                    placement: item.placement || null,
                    created_at: item.date ? new Date(item.date) : new Date(), // Use date from CSV if available
                };
            });

            // Wait, I need to check if I should update schema. 
            // In step 335, I added Sku model: id, userId, sku_name, spend, impressions, orders, revenue, created_at.
            // There is no `date` field. This implies the dashboard shows "lifetime" or "current" stats for a SKU, not time-series.
            // However, the CSV has `date`. If I import multiple rows for same SKU on different dates, they will just be separate rows in `Sku` table.
            // That works fine for aggregation. I will proceed with creating separate rows.

            await prisma.sku.createMany({
                data: skuData
            });

            return importRecord;
        });

        res.status(201).json({ message: 'Import successful', importId: result.id });
    } catch (error) {
        console.error('Error bulk creating SKUs:', error);
        res.status(500).json({ error: 'Internal server error during bulk import' });
    }
};

// Get all SKUs for the logged-in user
exports.getUserSkus = async (req, res) => {
    try {
        const userId = req.user.userId;

        const skus = await prisma.sku.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                created_at: 'desc',
            },
        });

        res.status(200).json(skus);
    } catch (error) {
        console.error('Error fetching SKUs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
