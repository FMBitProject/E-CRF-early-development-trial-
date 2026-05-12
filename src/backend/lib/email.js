import nodemailer from 'nodemailer';

function createTransport() {
    return nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

export async function sendQueryRaisedEmail(toEmail, toName, { subjectCode, queryText, raisedByName, visitName, fieldLabel }) {
    if (!process.env.SMTP_HOST) return;
    const transporter = createTransport();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transporter.sendMail({
        from: `"E-CRF System" <${from}>`,
        to:   toEmail,
        subject: `[E-CRF] New Query — Subject ${subjectCode}`,
        html: `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F0F3F8;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
      <tr><td style="background:#B45309;padding:24px 32px">
        <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">E-CRF System — New Query</p>
        <p style="margin:4px 0 0;color:#FDE68A;font-size:12px">Action required by Investigator</p>
      </td></tr>
      <tr><td style="padding:32px">
        <p style="margin:0 0 16px;color:#1E293B;font-size:15px">Hello, <strong>${toName}</strong></p>
        <p style="margin:0 0 16px;color:#64748B;font-size:14px">A new data query has been raised by <strong>${raisedByName}</strong> and requires your response.</p>
        <table width="100%" cellpadding="8" cellspacing="0" style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;margin-bottom:24px">
          <tr><td style="font-size:12px;color:#92400E;font-weight:bold;width:120px">Subject</td><td style="font-size:13px;color:#1E293B;font-family:monospace">${subjectCode}</td></tr>
          ${visitName ? `<tr><td style="font-size:12px;color:#92400E;font-weight:bold">Visit</td><td style="font-size:13px;color:#1E293B">${visitName}</td></tr>` : ''}
          ${fieldLabel ? `<tr><td style="font-size:12px;color:#92400E;font-weight:bold">Field</td><td style="font-size:13px;color:#1E293B">${fieldLabel}</td></tr>` : ''}
          <tr><td style="font-size:12px;color:#92400E;font-weight:bold;vertical-align:top">Query</td><td style="font-size:13px;color:#1E293B">${queryText}</td></tr>
        </table>
        <p style="margin:0;color:#64748B;font-size:13px">Please log in to the E-CRF system to review and respond to this query.</p>
      </td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #E2E8F0">
        <p style="margin:0;color:#94A3B8;font-size:11px">FDA 21 CFR Part 11 · ICH GCP E6 (R2) · Secure & Encrypted</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`,
    });
}

export async function sendQueryResolvedEmail(toEmail, toName, { subjectCode, queryText, resolutionText, resolvedByName }) {
    if (!process.env.SMTP_HOST) return;
    const transporter = createTransport();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transporter.sendMail({
        from: `"E-CRF System" <${from}>`,
        to:   toEmail,
        subject: `[E-CRF] Query Resolved — Subject ${subjectCode}`,
        html: `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F0F3F8;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
      <tr><td style="background:#065F46;padding:24px 32px">
        <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">E-CRF System — Query Resolved</p>
        <p style="margin:4px 0 0;color:#A7F3D0;font-size:12px">Investigator has responded to your query</p>
      </td></tr>
      <tr><td style="padding:32px">
        <p style="margin:0 0 16px;color:#1E293B;font-size:15px">Hello, <strong>${toName}</strong></p>
        <p style="margin:0 0 16px;color:#64748B;font-size:14px">The following query for subject <strong>${subjectCode}</strong> has been resolved by <strong>${resolvedByName}</strong>.</p>
        <table width="100%" cellpadding="8" cellspacing="0" style="background:#F0FDF4;border:1px solid #A7F3D0;border-radius:8px;margin-bottom:24px">
          <tr><td style="font-size:12px;color:#065F46;font-weight:bold;width:120px;vertical-align:top">Query</td><td style="font-size:13px;color:#1E293B">${queryText}</td></tr>
          <tr><td style="font-size:12px;color:#065F46;font-weight:bold;vertical-align:top">Response</td><td style="font-size:13px;color:#1E293B">${resolutionText}</td></tr>
        </table>
        <p style="margin:0;color:#64748B;font-size:13px">Please log in to review and close this query if the response is satisfactory.</p>
      </td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #E2E8F0">
        <p style="margin:0;color:#94A3B8;font-size:11px">FDA 21 CFR Part 11 · ICH GCP E6 (R2) · Secure & Encrypted</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`,
    });
}

export async function sendVisitCleanEmail(toEmail, toName, { subjectCode, siteName }) {
    if (!process.env.SMTP_HOST) return;
    const transporter = createTransport();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transporter.sendMail({
        from: `"E-CRF System" <${from}>`,
        to:   toEmail,
        subject: `[E-CRF] Data Clean — Subject ${subjectCode} Ready for Final Review`,
        html: `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F0F3F8;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
      <tr><td style="background:#1D4ED8;padding:24px 32px">
        <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">E-CRF System — Data Clean</p>
        <p style="margin:4px 0 0;color:#BFDBFE;font-size:12px">Subject ready for PI final review &amp; e-Signature</p>
      </td></tr>
      <tr><td style="padding:32px">
        <p style="margin:0 0 16px;color:#1E293B;font-size:15px">Hello, <strong>${toName}</strong></p>
        <p style="margin:0 0 20px;color:#64748B;font-size:14px">
          All data for the following subject is now <strong>clean</strong>: all queries have been closed and Source Data Verification (SDV) is complete.
        </p>
        <table width="100%" cellpadding="8" cellspacing="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;margin-bottom:24px">
          <tr><td style="font-size:12px;color:#1E40AF;font-weight:bold;width:120px">Subject</td><td style="font-size:13px;color:#1E293B;font-family:monospace">${subjectCode}</td></tr>
          <tr><td style="font-size:12px;color:#1E40AF;font-weight:bold">Site</td><td style="font-size:13px;color:#1E293B">${siteName ?? '—'}</td></tr>
          <tr><td style="font-size:12px;color:#1E40AF;font-weight:bold">Status</td><td style="font-size:13px;color:#065F46;font-weight:bold">✓ All queries closed &nbsp;·&nbsp; ✓ SDV 100%</td></tr>
        </table>
        <p style="margin:0;color:#64748B;font-size:13px">
          Please log in to perform the final review and apply your electronic signature (PI sign-off) for this subject's data.
        </p>
      </td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #E2E8F0">
        <p style="margin:0;color:#94A3B8;font-size:11px">FDA 21 CFR Part 11 · ICH GCP E6 (R3) · Secure &amp; Encrypted</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`,
    });
}

export async function sendUserInviteEmail(toEmail, toName, { tempPassword, role, invitedBy, appUrl }) {
    if (!process.env.SMTP_HOST) return;
    const transporter = createTransport();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const roleLabel = { admin: 'Administrator', investigator: 'Investigator', pi: 'Principal Investigator', cra: 'CRA / Monitor', crc: 'Study Coordinator' }[role] || role;
    await transporter.sendMail({
        from: `"E-CRF System" <${from}>`,
        to:   toEmail,
        subject: '[E-CRF] You have been invited to the Clinical Data Platform',
        html: `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F0F3F8;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
      <tr><td style="background:#0A2E5C;padding:24px 32px">
        <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">Welcome to E-CRF System</p>
        <p style="margin:4px 0 0;color:#93C5FD;font-size:12px">You have been invited as ${roleLabel}</p>
      </td></tr>
      <tr><td style="padding:32px">
        <p style="margin:0 0 16px;color:#1E293B;font-size:15px">Hello, <strong>${toName}</strong></p>
        <p style="margin:0 0 20px;color:#64748B;font-size:14px"><strong>${invitedBy}</strong> has invited you to access the E-CRF Clinical Data Platform as <strong>${roleLabel}</strong>.</p>
        <table width="100%" cellpadding="8" cellspacing="0" style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:8px;margin-bottom:20px">
          <tr><td style="font-size:12px;color:#0369A1;font-weight:bold;width:140px">Login URL</td><td style="font-size:13px;color:#1E293B"><a href="${appUrl}">${appUrl}</a></td></tr>
          <tr><td style="font-size:12px;color:#0369A1;font-weight:bold">Email</td><td style="font-size:13px;color:#1E293B;font-family:monospace">${toEmail}</td></tr>
          <tr><td style="font-size:12px;color:#0369A1;font-weight:bold">Temp Password</td><td style="font-size:15px;color:#0A2E5C;font-weight:bold;font-family:monospace;letter-spacing:2px">${tempPassword}</td></tr>
          <tr><td style="font-size:12px;color:#0369A1;font-weight:bold">Role</td><td style="font-size:13px;color:#1E293B">${roleLabel}</td></tr>
        </table>
        <p style="margin:0 0 8px;color:#DC2626;font-size:13px;font-weight:bold">⚠ You will be required to change your password on first login.</p>
        <p style="margin:0;color:#64748B;font-size:13px">Keep your credentials confidential. Do not share this email.</p>
      </td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #E2E8F0">
        <p style="margin:0;color:#94A3B8;font-size:11px">FDA 21 CFR Part 11 · ICH GCP E6 (R3) · Secure &amp; Encrypted</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`,
    });
}

export async function sendSAEDeadlineEmail(toEmail, toName, { subjectCode, aeTerm, deadlineDate, reportType, hoursRemaining }) {
    if (!process.env.SMTP_HOST) return;
    const transporter = createTransport();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const urgencyColor = hoursRemaining <= 24 ? '#DC2626' : '#D97706';
    const urgencyLabel = hoursRemaining <= 24 ? '🚨 URGENT' : '⚠ Action Required';
    await transporter.sendMail({
        from: `"E-CRF System" <${from}>`,
        to:   toEmail,
        subject: `[E-CRF] ${urgencyLabel} — SAE Report Due: Subject ${subjectCode}`,
        html: `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F0F3F8;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
      <tr><td style="background:${urgencyColor};padding:24px 32px">
        <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">SAE Report Deadline Alert</p>
        <p style="margin:4px 0 0;color:#FEE2E2;font-size:12px">${urgencyLabel} — ${hoursRemaining}h remaining</p>
      </td></tr>
      <tr><td style="padding:32px">
        <p style="margin:0 0 16px;color:#1E293B;font-size:15px">Hello, <strong>${toName}</strong></p>
        <p style="margin:0 0 20px;color:#64748B;font-size:14px">An SAE expedited report deadline is approaching and requires immediate action.</p>
        <table width="100%" cellpadding="8" cellspacing="0" style="background:#FFF7F7;border:1px solid #FECACA;border-radius:8px;margin-bottom:24px">
          <tr><td style="font-size:12px;color:#991B1B;font-weight:bold;width:140px">Subject</td><td style="font-size:13px;color:#1E293B;font-family:monospace">${subjectCode}</td></tr>
          <tr><td style="font-size:12px;color:#991B1B;font-weight:bold">AE Term</td><td style="font-size:13px;color:#1E293B">${aeTerm}</td></tr>
          <tr><td style="font-size:12px;color:#991B1B;font-weight:bold">Report Type</td><td style="font-size:13px;color:#1E293B">${reportType}</td></tr>
          <tr><td style="font-size:12px;color:#991B1B;font-weight:bold">Deadline</td><td style="font-size:13px;color:#DC2626;font-weight:bold">${deadlineDate}</td></tr>
          <tr><td style="font-size:12px;color:#991B1B;font-weight:bold">Time Left</td><td style="font-size:13px;color:#DC2626;font-weight:bold">${hoursRemaining} hours</td></tr>
        </table>
        <p style="margin:0;color:#64748B;font-size:13px">Please log in immediately to submit this SAE expedited report (ICH E2A).</p>
      </td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #E2E8F0">
        <p style="margin:0;color:#94A3B8;font-size:11px">ICH E2A · FDA 21 CFR Part 312 · Expedited Safety Reporting</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`,
    });
}

export async function sendDBLockRequestEmail(toEmail, toName, { studyTitle, protocolNo, requestedBy, role }) {
    if (!process.env.SMTP_HOST) return;
    const transporter = createTransport();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transporter.sendMail({
        from: `"E-CRF System" <${from}>`,
        to:   toEmail,
        subject: `[E-CRF] Database Lock Signature Required — ${protocolNo}`,
        html: `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F0F3F8;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
      <tr><td style="background:#4F46E5;padding:24px 32px">
        <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">Database Lock Signature Required</p>
        <p style="margin:4px 0 0;color:#C7D2FE;font-size:12px">Your electronic signature is needed to proceed</p>
      </td></tr>
      <tr><td style="padding:32px">
        <p style="margin:0 0 16px;color:#1E293B;font-size:15px">Hello, <strong>${toName}</strong></p>
        <p style="margin:0 0 20px;color:#64748B;font-size:14px"><strong>${requestedBy}</strong> has initiated the study database lock process and requires your electronic signature as <strong>${role}</strong>.</p>
        <table width="100%" cellpadding="8" cellspacing="0" style="background:#EEF2FF;border:1px solid #C7D2FE;border-radius:8px;margin-bottom:24px">
          <tr><td style="font-size:12px;color:#3730A3;font-weight:bold;width:140px">Study</td><td style="font-size:13px;color:#1E293B">${studyTitle}</td></tr>
          <tr><td style="font-size:12px;color:#3730A3;font-weight:bold">Protocol No.</td><td style="font-size:13px;color:#1E293B;font-family:monospace">${protocolNo}</td></tr>
          <tr><td style="font-size:12px;color:#3730A3;font-weight:bold">Your Role</td><td style="font-size:13px;color:#1E293B">${role}</td></tr>
        </table>
        <p style="margin:0;color:#64748B;font-size:13px">Please log in to review the pre-lock checklist and apply your electronic signature (ICH GCP E6(R3) §5.5.7).</p>
      </td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #E2E8F0">
        <p style="margin:0;color:#94A3B8;font-size:11px">FDA 21 CFR Part 11 · ICH GCP E6 (R3) §5.5.7</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`,
    });
}

export async function sendOTPEmail(toEmail, toName, otp) {
    const transporter = createTransport();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
        from: `"E-CRF System" <${from}>`,
        to:   toEmail,
        subject: 'Your E-CRF Verification Code',
        html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F0F3F8;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
      <tr>
        <td style="background:#0A2E5C;padding:24px 32px">
          <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">E-CRF System</p>
          <p style="margin:4px 0 0;color:#93C5FD;font-size:12px">Clinical Data Platform</p>
        </td>
      </tr>
      <tr>
        <td style="padding:32px">
          <p style="margin:0 0 8px;color:#1E293B;font-size:16px">Hello, <strong>${toName}</strong></p>
          <p style="margin:0 0 24px;color:#64748B;font-size:14px">Your verification code for E-CRF System login:</p>
          <div style="background:#F8FAFF;border:2px dashed #BFDBFE;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px">
            <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#0A2E5C">${otp}</span>
          </div>
          <p style="margin:0 0 8px;color:#64748B;font-size:13px">⏱ This code expires in <strong>10 minutes</strong>.</p>
          <p style="margin:0;color:#64748B;font-size:13px">If you did not request this code, please ignore this email and contact your system administrator.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px;border-top:1px solid #E2E8F0">
          <p style="margin:0;color:#94A3B8;font-size:11px">FDA 21 CFR Part 11 · ICH GCP E6 (R2) · Secure & Encrypted</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`,
    });
}
