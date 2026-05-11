/**
 * Regenerates auto-generated sections inside PANDUAN.md.
 * Triggered by Claude Code hook after edits to routes or app.js.
 *
 * Run manually: node scripts/update-guide.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const ROLES = ['admin', 'pi', 'investigator', 'cra', 'crc'];
const ROLE_LABELS = {
    admin:        'Administrator',
    pi:           'Principal Investigator',
    investigator: 'Investigator',
    cra:          'CRA / Monitor',
    crc:          'Study Coordinator',
};
const YES = '✓';
const NO  = '—';

// ─── Parse NAV_ITEMS from app.js ───────────────────────────────────────────
function parseNavItems() {
    const appJs = fs.readFileSync(path.join(ROOT, 'src/frontend/js/app.js'), 'utf8');
    const blockMatch = appJs.match(/const NAV_ITEMS\s*=\s*\[([\s\S]*?)\];/);
    if (!blockMatch) return [];

    const items = [];
    const lineRe = /\{\s*id:\s*'([^']+)'.*?label:\s*'([^']+)'.*?roles:\s*\[([^\]]+)\]/g;
    let m;
    while ((m = lineRe.exec(blockMatch[1])) !== null) {
        const roles = m[3].match(/'([^']+)'/g).map(r => r.replace(/'/g, ''));
        items.push({ id: m[1], label: m[2], roles });
    }
    return items;
}

// ─── Parse requireRole calls from a route file ────────────────────────────
function parseRoutePermissions(filePath) {
    const src = fs.readFileSync(filePath, 'utf8');
    const results = [];

    // Match: router.METHOD('path', requireRole('r1','r2',...), async ...
    const re = /router\.(get|post|patch|put|delete)\s*\(\s*'([^']+)'\s*,\s*requireRole\(([^)]+)\)/gi;
    let m;
    while ((m = re.exec(src)) !== null) {
        const method = m[1].toUpperCase();
        const routePath = m[2];
        const roles = m[3].match(/'([^']+)'/g)?.map(r => r.replace(/'/g, '')) ?? [];
        results.push({ method, path: routePath, roles });
    }
    return results;
}

// ─── Build nav access table ───────────────────────────────────────────────
function buildNavTable(navItems) {
    const header = `| Modul | ${ROLES.map(r => ROLE_LABELS[r]).join(' | ')} |`;
    const sep    = `|-------|${ROLES.map(() => ':---:').join('|')}|`;
    const rows   = navItems.map(item => {
        const cols = ROLES.map(r => item.roles.includes(r) ? YES : NO);
        return `| ${item.label} | ${cols.join(' | ')} |`;
    });
    return [header, sep, ...rows].join('\n');
}

// ─── Build permissions table for a route file ────────────────────────────
function buildPermTable(perms) {
    if (perms.length === 0) return '_Tidak ada endpoint yang dibatasi role._';
    const header = `| Endpoint | ${ROLES.map(r => ROLE_LABELS[r]).join(' | ')} |`;
    const sep    = `|----------|${ROLES.map(() => ':---:').join('|')}|`;
    const rows   = perms.map(p => {
        const cols = ROLES.map(r => p.roles.includes(r) ? YES : NO);
        return `| \`${p.method} ${p.path}\` | ${cols.join(' | ')} |`;
    });
    return [header, sep, ...rows].join('\n');
}

// ─── Replace AUTO-GENERATED section in PANDUAN.md ────────────────────────
function replaceSection(content, key, replacement) {
    const startTag = `<!-- AUTO-GENERATED:${key}-START -->`;
    const endTag   = `<!-- AUTO-GENERATED:${key}-END -->`;
    const re = new RegExp(`${escRe(startTag)}[\\s\\S]*?${escRe(endTag)}`, 'g');
    const block = `${startTag}\n${replacement}\n${endTag}`;
    if (re.test(content)) {
        return content.replace(re, block);
    }
    return content;
}
function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ─── Main ─────────────────────────────────────────────────────────────────
function main() {
    const guidePath = path.join(ROOT, 'PANDUAN.md');
    let guide = fs.readFileSync(guidePath, 'utf8');

    // 1. Navigation access table
    const navItems = parseNavItems();
    guide = replaceSection(guide, 'NAV-ACCESS', buildNavTable(navItems));

    // 2. Per-module permission tables
    const routeFiles = {
        'PERM-SUBJECTS':    'subjects.js',
        'PERM-AE':          'adverseevents.js',
        'PERM-DEVIATIONS':  'deviations.js',
        'PERM-CONSENTS':    'consents.js',
        'PERM-RANDOMIZATION': 'randomization.js',
        'PERM-QUERIES':     'queries.js',
        'PERM-ENTRIES':     'entries.js',
        'PERM-SIGNATURES':  'signatures.js',
        'PERM-DBLOCK':      'dblock.js',
        'PERM-MONITORING':  'monitoring.js',
        'PERM-DELEGATION':  'delegation.js',
        'PERM-SAE':         'saereports.js',
        'PERM-EXPORT':      'export.js',
    };

    for (const [key, file] of Object.entries(routeFiles)) {
        const filePath = path.join(ROOT, 'src/backend/routes', file);
        if (!fs.existsSync(filePath)) continue;
        const perms = parseRoutePermissions(filePath);
        guide = replaceSection(guide, key, buildPermTable(perms));
    }

    // 3. Update timestamp
    guide = replaceSection(guide, 'UPDATED-AT',
        `_Panduan ini terakhir diperbarui otomatis: **${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB**_`
    );

    fs.writeFileSync(guidePath, guide, 'utf8');
    console.log('✓ PANDUAN.md updated');
}

main();
