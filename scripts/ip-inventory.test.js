import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIPInventory } from '../src/frontend/js/modules/ip-inventory.js';

const receipt = { siteId: 1, siteName: 'Site A', drugName: 'IP A', batchNo: 'B1', unit: 'tablet', quantityIn: '100', transactionDate: '2026-10-01', expiryDate: '2026-12-31', supplierRef: 'Shipment 1' };

test('stock counts ledger movements once and retains batch metadata', () => {
    const [batch] = buildIPInventory([
        receipt,
        { ...receipt, quantityIn: null, quantityOut: '20', transactionDate: '2026-10-02' },
        { ...receipt, quantityIn: '5', returnedQuantity: '5', transactionDate: '2026-10-03' },
        { ...receipt, quantityIn: null, quantityOut: '3', destroyedQuantity: '3', transactionDate: '2026-10-04' },
    ], '2026-10-06');
    assert.equal(batch.balance, 82);
    assert.equal(batch.lastTransaction, '2026-10-04');
    assert.deepEqual(batch.supplierRefs, ['Shipment 1']);
    assert.deepEqual(batch.alerts, []);
});

test('sites, batches and units never share a stock balance', () => {
    const batches = buildIPInventory([
        receipt, { ...receipt, siteId: 2 }, { ...receipt, batchNo: 'B2' },
        { ...receipt, unit: 'bottle' }, { ...receipt, siteId: null },
    ]);
    assert.equal(batches.length, 5);
    assert.ok(batches.every(batch => batch.balance === 100));
});

test('expiry alerts cover overdue, today, 30 days, and unknown expiry', () => {
    for (const [expiryDate, alert] of [
        ['2026-10-05', 'Expired'], ['2026-10-06', 'Expiring within 30 days'],
        ['2026-11-05', 'Expiring within 30 days'], [null, 'Expiry not recorded'],
    ]) {
        assert.ok(buildIPInventory([{ ...receipt, expiryDate }], '2026-10-06')[0].alerts.includes(alert));
    }
    assert.deepEqual(buildIPInventory([{ ...receipt, expiryDate: '2026-11-06' }], '2026-10-06')[0].alerts, []);
});

test('zero stock and negative balances need distinct attention', () => {
    assert.deepEqual(buildIPInventory([{ ...receipt, quantityOut: '100' }])[0].alerts, ['Out of stock']);
    assert.ok(buildIPInventory([{ ...receipt, quantityOut: '101' }])[0].alerts.includes('Needs reconciliation'));
});

test('invalid historical quantities are flagged and earliest recorded expiry is used', () => {
    const [batch] = buildIPInventory([
        receipt, { ...receipt, quantityIn: 'invalid', expiryDate: '2026-10-01' },
    ], '2026-10-06');
    assert.equal(batch.invalidQuantity, true);
    assert.equal(batch.expiryDate, '2026-10-01');
    assert.ok(batch.alerts.includes('Needs reconciliation'));
    assert.ok(batch.alerts.includes('Expired'));
    assert.equal(buildIPInventory([{ ...receipt, quantityIn: '-1' }])[0].invalidQuantity, true);
    assert.deepEqual(buildIPInventory([]), []);
});
