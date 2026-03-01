const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all actions for the user
exports.getActions = async (req, res) => {
    try {
        const userId = req.user.userId;
        const actions = await prisma.action.findMany({
            where: { userId },
            orderBy: { appliedAt: 'desc' }
        });
        res.status(200).json(actions);
    } catch (error) {
        console.error('Error fetching actions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create or update an action
exports.saveAction = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id, importId, type, title, desc, impact, confidence, state, baselineMetrics, afterMetrics, evaluatedAt, outcome } = req.body;

        const actionData = {
            userId,
            importId,
            type,
            title,
            desc,
            impact: impact ? parseFloat(impact) : null,
            confidence: confidence ? parseInt(confidence) : null,
            state,
            baselineMetrics: baselineMetrics || {},
            afterMetrics: afterMetrics || {},
            evaluatedAt: evaluatedAt ? new Date(evaluatedAt) : null,
            outcome
        };

        const action = await prisma.action.upsert({
            where: { id: id || '00000000-0000-0000-0000-000000000000' }, // Use a dummy UUID if no ID provided for create
            update: actionData,
            create: actionData
        });

        res.status(201).json(action);
    } catch (error) {
        console.error('Error saving action:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete an action (e.g. on Dismiss)
exports.deleteAction = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.action.delete({
            where: { id }
        });
        res.status(200).json({ message: 'Action deleted' });
    } catch (error) {
        console.error('Error deleting action:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
