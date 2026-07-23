// Golden RBAC matrix — single source of truth for automated permission tests.
//
// Derived from ROLE_MATRIX.md (+ the documented data_manager grants) and frozen
// against the audited state of the route guards. tests/rbac-matrix.test.js
// compares this file against the live Express route table in BOTH directions:
//   - a route whose guard drifts from this matrix fails the test;
//   - a new/renamed route not documented here fails the test.
//
// Update this file ONLY together with ROLE_MATRIX.md / PANDUAN.md.
//
// Value semantics:
//   [roles...] — requireRole(...) guard with exactly these roles (sorted)
//   null       — authenticated-only; either read access for all roles, or
//                ownership/scoping is enforced inside the handler
//                (e.g. delegation self-sign, study scoping via middleware).

export const EXPECTED = {
    '/api/subjects': {
        'GET /':                    null,
        'GET /status-overview':     ['admin', 'cra', 'data_manager', 'pi'],
        'GET /:id':                 null,
        'POST /':                   ['admin', 'crc', 'investigator', 'pi'],
        'PATCH /:id/status':        ['admin', 'investigator', 'pi'],
        'POST /:id/ie-assessment':  ['admin', 'investigator', 'pi'],
        'GET /:id/ie-assessment':   null,
        'GET /:id/lock-status':     null,
        'POST /:id/lock':           ['admin', 'cra', 'data_manager', 'pi'],
        'POST /:id/unlock':         ['admin'],
    },
    '/api/entries': {
        'GET /':             null,
        'POST /':            ['admin', 'crc', 'investigator', 'pi'],
        'PATCH /:id/lock':   ['admin', 'cra', 'pi'],
        'PATCH /:id/unlock': ['admin'],
    },
    '/api/queries': {
        'GET /':              null,
        'POST /':             ['admin', 'cra', 'data_manager'],
        'PATCH /:id/resolve': ['admin', 'crc', 'investigator', 'pi'],
        'PATCH /:id/close':   ['admin', 'cra', 'data_manager'],
    },
    '/api/signatures': {
        'POST /': ['admin', 'investigator', 'pi'],
        'GET /':  null,
    },
    '/api/ae': {
        'GET /':             null,
        'GET /stats':        null,
        'GET /:id':          null,
        'POST /':            ['admin', 'crc', 'investigator', 'pi'],
        'PATCH /:id':        ['admin', 'crc', 'investigator', 'pi'],
        'PATCH /:id/report': ['admin', 'investigator', 'pi'],
        'PATCH /:id/close':  ['admin', 'pi'],
    },
    '/api/deviations': {
        'GET /':                 null,
        'GET /stats':            null,
        'GET /:id':              null,
        'POST /':                ['admin', 'crc', 'investigator', 'pi'],
        'PATCH /:id':            ['admin', 'crc', 'investigator', 'pi'],
        'PATCH /:id/report-irb': ['admin', 'investigator', 'pi'],
        'PATCH /:id/status':     ['admin', 'pi'],
    },
    '/api/consents': {
        'GET /':               null,
        'GET /stats':          null,
        'POST /':              ['admin', 'crc', 'investigator', 'pi'],
        'PATCH /:id/withdraw': ['admin', 'investigator', 'pi'],
    },
    '/api/randomization': {
        'GET /list':          ['admin'],
        'POST /list':         ['admin'],
        'GET /':              null,
        'POST /':             ['admin', 'investigator', 'pi'],
        'PATCH /:id/unblind': ['admin'],
        'GET /stats':         null,
    },
    '/api/dblock': {
        'GET /':                 null,
        'GET /status':           null,
        'POST /check':           ['admin', 'cra', 'data_manager', 'pi'],
        'POST /initiate':        ['admin', 'data_manager', 'pi'],
        'POST /:id/sign-cra':    ['admin', 'cra', 'data_manager', 'pi'],
        'POST /:id/sign-admin':  ['admin', 'pi'],
    },
    '/api/delegation': {
        'GET /':                        null, // self-scoped in handler for crc/investigator
        'GET /training/records':        ['admin', 'cra', 'data_manager', 'pi'],
        'POST /training/records':       ['admin', 'pi'],
        'GET /training/expiring':       ['admin', 'cra', 'data_manager', 'pi'],
        'DELETE /training/records/:id': ['admin', 'pi'],
        'GET /:id':                     null, // self-scoped in handler
        'POST /':                       ['admin', 'pi'],
        'PATCH /:id':                   ['admin', 'pi'],
        'POST /:id/sign':               null, // owner-only, enforced in handler
    },
    '/api/saereports': {
        'GET /':            ['admin', 'cra', 'data_manager', 'pi'],
        'GET /overdue':     ['admin', 'cra', 'data_manager', 'pi'],
        'GET /:id':         ['admin', 'cra', 'data_manager', 'pi'],
        'POST /':           ['admin', 'cra', 'data_manager', 'pi'],
        'PATCH /:id/sign':  ['admin', 'investigator', 'pi'],
        'PATCH /:id/submit':['admin', 'cra', 'data_manager', 'pi'],
    },
    '/api/monitoring': {
        'GET /':                 ['admin', 'cra', 'data_manager', 'pi'],
        'GET /sdv-summary':      ['admin', 'cra', 'data_manager', 'pi'],
        'GET /:id':              ['admin', 'cra', 'data_manager', 'pi'],
        'POST /':                ['admin', 'cra', 'data_manager', 'pi'],
        'PATCH /:id':            ['admin', 'cra', 'data_manager', 'pi'],
        'POST /:id/submit':      ['admin', 'cra', 'data_manager', 'pi'],
        'POST /:id/acknowledge': ['admin', 'pi'],
        'GET /:id/sdv':          ['admin', 'cra', 'data_manager', 'pi'],
        'POST /:id/sdv':         ['admin', 'cra', 'data_manager', 'pi'],
        'GET /:id/report':       ['admin', 'cra', 'data_manager', 'pi'],
    },
    '/api/export': {
        'GET /odm': ['admin', 'cra', 'data_manager', 'pi'],
        'GET /csv': ['admin', 'cra', 'data_manager', 'pi'],
    },
    '/api/sites': {
        'GET /':      null,
        'POST /':     ['admin'],
        'PATCH /:id': ['admin'],
    },
    '/api/studies': {
        'GET /':                     null,
        'GET /:id':                  null,
        'POST /':                    ['admin'],
        'PATCH /:id':                ['admin'],
        'GET /:id/users':            ['admin'],
        'POST /:id/users':           ['admin'],
        'DELETE /:id/users/:userId': ['admin'],
    },
};

// Maps each mount point to its router file under src/backend/routes/.
export const ROUTER_FILES = {
    '/api/subjects':      'subjects.js',
    '/api/entries':       'entries.js',
    '/api/queries':       'queries.js',
    '/api/signatures':    'signatures.js',
    '/api/ae':            'adverseevents.js',
    '/api/deviations':    'deviations.js',
    '/api/consents':      'consents.js',
    '/api/randomization': 'randomization.js',
    '/api/dblock':        'dblock.js',
    '/api/delegation':    'delegation.js',
    '/api/saereports':    'saereports.js',
    '/api/monitoring':    'monitoring.js',
    '/api/export':        'export.js',
    '/api/sites':         'sites.js',
    '/api/studies':       'studies.js',
};
