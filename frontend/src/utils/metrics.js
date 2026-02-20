export const calculateROAS = (revenue, spend) => {
    if (!spend || spend <= 0) return 0;
    return parseFloat((revenue / spend).toFixed(2));
};

export const calculateCPO = (spend, orders) => {
    if (!orders || orders <= 0) return 0;
    return parseFloat((spend / orders).toFixed(2));
};

export const getStatus = (roas) => {
    if (roas >= 1.5) return 'Push';
    if (roas >= 0.8) return 'Watch';
    return 'Pause';
};

export const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value);
};
