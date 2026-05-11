import { api } from './api.js';

export function renderDataStatus(container) {
    container.innerHTML = `
        <div class="page-header">
            <h2>Subject Data Status</h2>
            <p class="page-subtitle">Per-subject summary: entries, signatures, open queries, and randomization status.</p>
        </div>
        <div id="ds-filters" class="filter-bar">
            <input id="ds-search" type="text" placeholder="Filter by subject code…" class="form-control" style="max-width:220px">
            <select id="ds-status-filter" class="form-control" style="max-width:160px">
                <option value="">All statuses</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Withdrawn">Withdrawn</option>
                <option value="Screen Failed">Screen Failed</option>
            </select>
            <button id="ds-refresh" class="btn btn-secondary btn-sm">Refresh</button>
        </div>
        <div id="ds-table-wrap">
            <p class="loading-text">Loading…</p>
        </div>
    `;

    let allRows = [];

    async function load() {
        document.getElementById('ds-table-wrap').innerHTML = '<p class="loading-text">Loading…</p>';
        try {
            allRows = await api.getSubjectStatusOverview();
            renderTable();
        } catch (err) {
            document.getElementById('ds-table-wrap').innerHTML =
                `<p class="error-text">Failed to load: ${err.message}</p>`;
        }
    }

    function renderTable() {
        const search = (document.getElementById('ds-search')?.value ?? '').toLowerCase();
        const statusFilter = document.getElementById('ds-status-filter')?.value ?? '';

        const rows = allRows.filter(r => {
            if (search && !r.subjectCode.toLowerCase().includes(search)) return false;
            if (statusFilter && r.status !== statusFilter) return false;
            return true;
        });

        const wrap = document.getElementById('ds-table-wrap');
        if (!wrap) return;

        if (rows.length === 0) {
            wrap.innerHTML = '<p class="empty-text">No subjects match the current filter.</p>';
            return;
        }

        const tbody = rows.map(r => {
            const entryBar = buildEntryBar(r);
            const queryBadge = r.openQueries > 0
                ? `<span class="badge badge-warning">${r.openQueries} open</span>`
                : `<span class="badge badge-success">Clean</span>`;
            const randCell = r.randomized
                ? `<span class="badge badge-info">${r.treatmentArm ?? 'Randomized'}</span>`
                : `<span class="badge badge-neutral">—</span>`;
            const statusBadge = `<span class="badge status-${r.status.toLowerCase().replace(' ', '-')}">${r.status}</span>`;
            const cleanSignal = (r.openQueries === 0 && r.totalEntries > 0 && r.signedCount >= r.savedCount + r.signedCount)
                ? '<span class="badge badge-success">✓ Clean</span>'
                : '';

            return `<tr>
                <td><strong>${escHtml(r.subjectCode)}</strong>${r.initials ? `<br><small>${escHtml(r.initials)}</small>` : ''}</td>
                <td>${escHtml(r.siteCode ?? '—')}</td>
                <td>${statusBadge}</td>
                <td>${entryBar}</td>
                <td class="text-center">${r.signedCount}</td>
                <td class="text-center">${queryBadge}</td>
                <td class="text-center">${randCell}</td>
                <td class="text-center">${cleanSignal}</td>
            </tr>`;
        }).join('');

        wrap.innerHTML = `
            <table class="data-table ds-table">
                <thead>
                    <tr>
                        <th>Subject</th>
                        <th>Site</th>
                        <th>Status</th>
                        <th>Entries</th>
                        <th class="text-center">Signed</th>
                        <th class="text-center">Queries</th>
                        <th class="text-center">Randomization</th>
                        <th class="text-center">Data Clean</th>
                    </tr>
                </thead>
                <tbody>${tbody}</tbody>
            </table>
            <p class="table-footer">${rows.length} subject${rows.length !== 1 ? 's' : ''}</p>
        `;
    }

    function buildEntryBar(r) {
        const total = r.totalEntries;
        if (total === 0) return '<span class="text-muted">No entries</span>';
        const parts = [];
        if (r.draftCount)  parts.push(`<span class="entry-seg seg-draft"  title="Draft"  style="width:${pct(r.draftCount,  total)}%"></span>`);
        if (r.savedCount)  parts.push(`<span class="entry-seg seg-saved"  title="Saved"  style="width:${pct(r.savedCount,  total)}%"></span>`);
        if (r.signedCount) parts.push(`<span class="entry-seg seg-signed" title="Signed" style="width:${pct(r.signedCount, total)}%"></span>`);
        if (r.lockedCount) parts.push(`<span class="entry-seg seg-locked" title="Locked" style="width:${pct(r.lockedCount, total)}%"></span>`);
        return `<div class="entry-bar" title="${total} total">${parts.join('')}</div><small>${total}</small>`;
    }

    function pct(n, total) { return Math.round((n / total) * 100); }
    function escHtml(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    load();

    container.addEventListener('input', e => {
        if (e.target.id === 'ds-search') renderTable();
    });
    container.addEventListener('change', e => {
        if (e.target.id === 'ds-status-filter') renderTable();
    });
    container.addEventListener('click', e => {
        if (e.target.id === 'ds-refresh') load();
    });
}
