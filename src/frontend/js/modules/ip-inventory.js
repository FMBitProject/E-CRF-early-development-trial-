// Inventory is derived from the accountability ledger; no separate stock totals.
export function buildIPInventory(records, today = new Date().toISOString().slice(0, 10)) {
    const batches = new Map();
    for (const record of records) {
        const key = JSON.stringify([record.siteId ?? null, record.drugName, record.batchNo || '', record.unit || '']);
        if (!batches.has(key)) batches.set(key, {
            drugName: record.drugName, batchNo: record.batchNo, unit: record.unit,
            siteName: record.siteName, quantityIn: 0, quantityOut: 0,
            expiryDate: null, supplierRefs: new Set(), lastTransaction: '', invalidQuantity: false,
        });
        const batch = batches.get(key);
        for (const field of ['quantityIn', 'quantityOut']) {
            const quantity = Number(record[field] || 0);
            if (!Number.isFinite(quantity) || quantity < 0) batch.invalidQuantity = true;
            else batch[field] += quantity;
        }
        if (record.expiryDate && (!batch.expiryDate || record.expiryDate < batch.expiryDate)) batch.expiryDate = record.expiryDate;
        if (record.supplierRef) batch.supplierRefs.add(record.supplierRef);
        if (record.transactionDate > batch.lastTransaction) batch.lastTransaction = record.transactionDate;
    }
    return [...batches.values()].map(batch => {
        const balance = batch.quantityIn - batch.quantityOut;
        const daysToExpiry = batch.expiryDate
            ? Math.round((Date.parse(batch.expiryDate) - Date.parse(today)) / 86400000) : null;
        const alerts = [];
        if (batch.invalidQuantity || balance < 0) alerts.push('Needs reconciliation');
        if (balance === 0) alerts.push('Out of stock');
        if (balance > 0 && daysToExpiry !== null && daysToExpiry < 0) alerts.push('Expired');
        else if (balance > 0 && daysToExpiry !== null && daysToExpiry <= 30) alerts.push('Expiring within 30 days');
        if (balance > 0 && !batch.expiryDate) alerts.push('Expiry not recorded');
        return { ...batch, balance, supplierRefs: [...batch.supplierRefs], alerts };
    });
}
