const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get import history for the logged-in user
exports.getImportHistory = async (req, res) => {
    try {
        const userId = req.user.userId;

        const imports = await prisma.importHistory.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                created_at: 'desc',
            },
        });

        res.status(200).json(imports);
    } catch (error) {
        console.error('Error fetching import history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Undo the most recent import
exports.undoLatestImport = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Find the most recent import for this user
        const latestImport = await prisma.importHistory.findFirst({
            where: { userId },
            orderBy: { created_at: 'desc' },
        });

        if (!latestImport) {
            return res.status(404).json({ error: 'No imports found to undo' });
        }

        // Transaction to ensure atomicity
        await prisma.$transaction(async (prisma) => {
            // Delete associated SKUs (cascade might handle this, but explicit is safer for logic verification)
            // Actually, schema has onDelete: Cascade, so deleting the import record is enough.

            await prisma.importHistory.delete({
                where: { id: latestImport.id },
            });
        });

        res.status(200).json({ message: 'Latest import undone successfully', importId: latestImport.id });
    } catch (error) {
        console.error('Error undoing import:', error);
        res.status(500).json({ error: 'Failed to undo import' });
    }
};
