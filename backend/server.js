
const express = require('express');
const cors = require('cors');
const prisma = require('./lib/prisma');
require('dotenv').config();
const authRoutes = require('./routes/auth.routes');
const skuRoutes = require('./routes/sku.routes');
const importRoutes = require('./routes/import.routes');
const insightsRoutes = require('./routes/insights.routes');
const optimizationRoutes = require('./routes/optimization.routes');
const actionRoutes = require('./routes/action.routes');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/skus', skuRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/optimization', optimizationRoutes);
app.use('/api/actions', actionRoutes);




// Get all ad performance data
app.get('/api/ads', async (req, res) => {
    try {
        const ads = await prisma.ad_performance.findMany({
            orderBy: { date: 'desc' }
        });
        res.json(ads);
    } catch (error) {
        console.error('Error fetching ads:', error);
        res.status(500).json({ error: 'Failed to fetch ad data' });
    }
});

// Create new ad performance entry (or bulk create)
app.post('/api/ads', async (req, res) => {
    try {
        const data = req.body;

        // Handle array for bulk insert (CSV upload)
        if (Array.isArray(data)) {
            const result = await prisma.ad_performance.createMany({
                data: data.map(item => ({
                    sku_name: item.sku,
                    date: new Date(item.date),
                    spend: parseFloat(item.spend),
                    impressions: parseInt(item.impressions) || 0,
                    orders: parseInt(item.orders) || 0,
                    revenue: parseFloat(item.revenue),
                    roas: parseFloat(item.revenue) / parseFloat(item.spend),
                    status: (parseFloat(item.revenue) / parseFloat(item.spend)) > 3 ? 'Push' : (parseFloat(item.revenue) / parseFloat(item.spend)) > 1.5 ? 'Watch' : 'Pause'
                }))
            });
            res.json({ message: `Successfully added ${result.count} entries` });
        } else {
            // Single entry
            const entry = await prisma.ad_performance.create({
                data: {
                    sku_name: data.sku,
                    date: new Date(data.date),
                    spend: parseFloat(data.spend),
                    impressions: parseInt(data.impressions) || 0,
                    orders: parseInt(data.orders) || 0,
                    revenue: parseFloat(data.revenue),
                    roas: parseFloat(data.revenue) / parseFloat(data.spend),
                    status: (parseFloat(data.revenue) / parseFloat(data.spend)) > 3 ? 'Push' : (parseFloat(data.revenue) / parseFloat(data.spend)) > 1.5 ? 'Watch' : 'Pause'
                }
            });
            res.json(entry);
        }
    } catch (error) {
        console.error('Error creating ad entry:', error);
        res.status(500).json({ error: 'Failed to create ad entry' });
    }
});

app.get('/', (req, res) => {
    res.send('Zepto Ads Manager API with Prisma');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
