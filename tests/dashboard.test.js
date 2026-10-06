import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = {};
const { api } = await import('../src/frontend/js/modules/api.js');
const { renderDashboard } = await import('../src/frontend/js/modules/dashboard.js');

const responses = {
    getDashboardStats: { activeSubjects: 3, totalSubjects: 4, pendingForms: 2, openQueries: 1, totalVisits: 5, recentAudit: [] },
    getAEStats: { total: 0, serious: 0, overdue: 0, draft: 0 },
    getDeviationStats: { total: 0, open: 0, major: 0 },
    getConsentStats: { consented: 3, totalActive: 3, unconsented: 0 },
    getDblockStatus: { isLocked: false, current: null },
    getPasswordStatus: { mustChange: false, expired: false, warningSoon: false },
};

function dashboard(t, overrides = {}) {
    const content = { innerHTML: '' };
    let retry;
    const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
    Object.defineProperty(globalThis, 'document', { configurable: true, value: {
        getElementById: id => id === 'main-content' ? content : id === 'dashboard-retry' && content.innerHTML.includes('id="dashboard-retry"')
            ? { addEventListener: (event, handler) => { retry = handler; } } : null,
    } });
    t.after(() => original ? Object.defineProperty(globalThis, 'document', original) : delete globalThis.document);
    t.mock.method(api, 'getCurrentUser', () => ({ id: 'pi1', name: 'Dr Test', role: 'pi' }));
    for (const [method, value] of Object.entries(responses)) {
        const override = overrides[method];
        t.mock.method(api, method, typeof override === 'function' ? override : async () => override ?? value);
    }
    return { content, retry: () => retry() };
}
const failure = async () => { throw new Error('private database details'); };

test('successful dashboard preserves zero counts and known lock state', async t => {
    const { content } = dashboard(t);
    await renderDashboard();
    assert.match(content.innerHTML, /Welcome, Dr/);
    assert.match(content.innerHTML, /Unlocked/);
    assert.match(content.innerHTML, /no serious events/);
    assert.doesNotMatch(content.innerHTML, /Some dashboard information is unavailable/);
});

test('one failed source keeps successful metrics and does not imply safety counts are zero', async t => {
    const { content } = dashboard(t, { getAEStats: failure });
    await renderDashboard();
    assert.match(content.innerHTML, /unavailable: Adverse events/);
    assert.match(content.innerHTML, /3<\/p>/);
    assert.doesNotMatch(content.innerHTML, /no serious events|all SAEs reported|Tracking active/);
    assert.doesNotMatch(content.innerHTML, /undefined|private database details/);
});

test('unavailable database lock status never appears unlocked', async t => {
    const { content } = dashboard(t, { getDblockStatus: failure });
    await renderDashboard();
    assert.match(content.innerHTML, /Database lock status/);
    assert.doesNotMatch(content.innerHTML, /Unlocked/);
    assert.match(content.innerHTML, /Welcome, Dr/);
});

test('forced password reset remains accessible when all study APIs reject', async t => {
    const { content } = dashboard(t, {
        getDashboardStats: failure, getAEStats: failure, getDeviationStats: failure,
        getConsentStats: failure, getDblockStatus: failure,
        getPasswordStatus: { mustChange: true },
    });
    await renderDashboard();
    assert.match(content.innerHTML, /Password reset required/);
    assert.match(content.innerHTML, /onclick="openChangePasswordModal\(\)"/);
    assert.doesNotMatch(content.innerHTML, /Unlocked|None open|All subjects consented|No recent activity/);
});

test('failed audit overview is unavailable rather than an empty audit history', async t => {
    const { content } = dashboard(t, { getDashboardStats: failure });
    await renderDashboard();
    assert.match(content.innerHTML, /Audit activity unavailable/);
    assert.doesNotMatch(content.innerHTML, /No recent activity/);
});

test('retry reloads failed data and removes unavailable placeholders', async t => {
    let offline = true;
    const overrides = Object.fromEntries(Object.entries(responses).map(([method, value]) => [method, async () => {
        if (offline) throw new Error('offline');
        return value;
    }]));
    const page = dashboard(t, overrides);
    await renderDashboard();
    assert.match(page.content.innerHTML, /Retry loading/);
    assert.doesNotMatch(page.content.innerHTML, /Unlocked|All subjects consented|undefined/);
    offline = false;
    await page.retry();
    assert.doesNotMatch(page.content.innerHTML, /Retry loading|Unavailable|Audit activity unavailable/);
    assert.match(page.content.innerHTML, /Unlocked/);
});
