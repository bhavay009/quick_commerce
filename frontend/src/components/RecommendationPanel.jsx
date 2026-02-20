import React from 'react';
import { Lightbulb, AlertTriangle, CheckCircle, PauseCircle } from 'lucide-react';
import { calculateROAS, getStatus } from '../utils/metrics';

const RecommendationPanel = ({ skus }) => {
    const generateRecommendations = (data) => {
        const recs = [];

        // Calculate average internal metrics for comparison
        const totalOrders = data.reduce((acc, sku) => acc + Number(sku.orders), 0);
        const avgOrders = totalOrders / (data.length || 1);

        data.forEach(sku => {
            const roas = calculateROAS(sku.revenue, sku.spend);
            const status = getStatus(roas);
            const spend = Number(sku.spend);
            const orders = Number(sku.orders);

            // 1. Pause / Stop Recommendations (Burn)
            if (status === 'Pause' && spend > 1000) {
                recs.push({
                    type: 'pause',
                    title: `Stop wasting money on ${sku.sku_name}`,
                    message: `This SKU consumed ₹${spend} but generated only ${orders} orders. Pausing this can immediately reduce loss.`,
                });
            }
            // 2. Push / Scale Recommendations (Opportunity)
            else if (status === 'Push' && orders > avgOrders) {
                const multiplier = (orders / (avgOrders || 1)).toFixed(1);
                recs.push({
                    type: 'push',
                    title: `Increase spend on ${sku.sku_name}`,
                    message: `This SKU generated ${multiplier}× more orders than average. Scaling this could increase total orders without increasing overall ad spend.`,
                });
            }
            // 3. Watch / Optimization Recommendations
            else if (status === 'Watch' && roas < 1.2) {
                recs.push({
                    type: 'watch',
                    title: `Monitor ${sku.sku_name} closely`,
                    message: `ROAS is ${roas}x. Consider shifting budget to higher performing SKUs if performance doesn't improve.`,
                });
            }
        });

        // 4. Budget Reallocation (Generic if we have both poor and great performers)
        const poorPerformers = data.filter(s => getStatus(calculateROAS(s.revenue, s.spend)) === 'Pause');
        const bestPerformer = data.reduce((prev, current) => (calculateROAS(prev.revenue, prev.spend) > calculateROAS(current.revenue, current.spend)) ? prev : current, data[0]);

        if (poorPerformers.length > 0 && bestPerformer && getStatus(calculateROAS(bestPerformer.revenue, bestPerformer.spend)) === 'Push') {
            const wastedSpend = poorPerformers.reduce((acc, s) => acc + Number(s.spend), 0);
            recs.push({
                type: 'opportunity',
                title: 'Missed revenue opportunity detected',
                message: `Shifting ₹${wastedSpend} from low-performing SKUs to "${bestPerformer.sku_name}" could result in significantly more orders.`,
            });
        }

        if (recs.length === 0 && data.length > 0) {
            recs.push({
                type: 'watch',
                title: 'Performance looks stable',
                message: 'All SKUs are performing within expected ranges. No immediate actions required.',
            });
        }

        return recs.slice(0, 5); // Limit to 5
    };

    const recommendations = generateRecommendations(skus);

    return (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg h-full">
            <h3 className="text-lg leading-6 font-medium text-white mb-4 flex items-center">
                <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
                Smart Recommendations
            </h3>
            <div className="space-y-4">
                {recommendations.length > 0 ? (
                    recommendations.map((rec, index) => (
                        <div
                            key={index}
                            className={`p-4 rounded-lg border flex items-start gap-3 ${rec.type === 'push' ? 'bg-green-900/20 border-green-900/50' :
                                    rec.type === 'pause' ? 'bg-red-900/20 border-red-900/50' :
                                        rec.type === 'opportunity' ? 'bg-blue-900/20 border-blue-900/50' :
                                            'bg-yellow-900/20 border-yellow-900/50'
                                }`}
                        >
                            <div className="shrink-0 mt-1">
                                {rec.type === 'push' ? <CheckCircle className="w-5 h-5 text-green-500" /> :
                                    rec.type === 'pause' ? <PauseCircle className="w-5 h-5 text-red-500" /> :
                                        rec.type === 'opportunity' ? <Lightbulb className="w-5 h-5 text-blue-500" /> :
                                            <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                            </div>

                            <div>
                                <h4 className={`text-sm font-bold ${rec.type === 'push' ? 'text-green-400' :
                                        rec.type === 'pause' ? 'text-red-400' :
                                            rec.type === 'opportunity' ? 'text-blue-400' :
                                                'text-yellow-400'
                                    }`}>{rec.title}</h4>
                                <p className="text-sm text-gray-300 mt-1">{rec.message}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-gray-500 py-4">Add SKU data to generate insights.</div>
                )}
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">
                Insights are based on your recent ad performance and historical trends.
            </p>
        </div>
    );
};

export default RecommendationPanel;
