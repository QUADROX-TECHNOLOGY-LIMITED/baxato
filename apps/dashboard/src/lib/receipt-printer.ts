/**
 * BAXATO Universal Printable Receipt Engine
 *
 * Implements isolated, zero-blank-page printing for all transaction receipts,
 * electricity tokens, cable TV recharges, exam PINs, and backoffice staff slips.
 *
 * Uses an isolated, offscreen iframe to ensure complete independence from
 * Next.js App Router DOM, modal overlays, fixed backdrops, and dark mode styles.
 */

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatNaira(amount: number | string | undefined | null): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);
  return `₦${(isNaN(num) ? 0 : num).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const BASE_RECEIPT_STYLES = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  @page {
    size: auto;
    margin: 8mm 10mm;
  }
  body {
    background: #ffffff;
    color: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 12px;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    padding: 12px;
  }
  .receipt-card {
    max-width: 440px;
    margin: 0 auto;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 24px;
  }
  .brand-header {
    text-align: center;
    padding-bottom: 16px;
    border-bottom: 2px dashed #e2e8f0;
  }
  .brand-title {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #0f172a;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .brand-title span.accent {
    color: #126beb;
  }
  .brand-subtitle {
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-top: 3px;
  }
  .status-badge-container {
    text-align: center;
    margin: 16px 0 12px 0;
  }
  .status-badge {
    display: inline-block;
    padding: 4px 14px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .status-success {
    background-color: #ecfdf5;
    color: #059669;
    border: 1px solid #a7f3d0;
  }
  .status-processing {
    background-color: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
  }
  .status-failed {
    background-color: #fff1f2;
    color: #e11d48;
    border: 1px solid #fecdd3;
  }
  .amount-hero {
    text-align: center;
    margin-bottom: 16px;
  }
  .amount-val {
    font-size: 26px;
    font-weight: 800;
    color: #0f172a;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }
  .amount-label {
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
  }
  .token-box {
    background: #f8fafc;
    border: 2px dashed #0284c7;
    border-radius: 10px;
    padding: 14px;
    text-align: center;
    margin: 16px 0;
  }
  .token-label {
    font-size: 10.5px;
    font-weight: 700;
    color: #0369a1;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .token-code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 19px;
    font-weight: 800;
    letter-spacing: 2px;
    color: #0f172a;
    margin: 6px 0;
  }
  .token-meta {
    font-size: 11px;
    color: #475569;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 14px;
  }
  .data-table tr {
    border-bottom: 1px solid #f1f5f9;
  }
  .data-table tr:last-child {
    border-bottom: none;
  }
  .data-table td {
    padding: 7px 0;
    font-size: 11.5px;
    vertical-align: top;
  }
  .data-table td.label {
    color: #64748b;
    font-weight: 500;
    width: 42%;
  }
  .data-table td.value {
    color: #0f172a;
    font-weight: 600;
    text-align: right;
  }
  .data-table td.value-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }
  .total-row td {
    border-top: 1px solid #cbd5e1 !important;
    border-bottom: 1px solid #cbd5e1 !important;
    padding: 9px 0 !important;
    font-weight: 800 !important;
    font-size: 12.5px !important;
  }
  .receipt-footer {
    margin-top: 20px;
    padding-top: 14px;
    border-top: 2px dashed #e2e8f0;
    text-align: center;
    font-size: 10px;
    color: #94a3b8;
    line-height: 1.5;
  }
  .receipt-footer .bold {
    font-weight: 700;
    color: #64748b;
  }
  @media print {
    body {
      padding: 0;
    }
    .receipt-card {
      border: 1px solid #94a3b8;
      border-radius: 0;
      box-shadow: none;
      max-width: 100%;
      padding: 16px;
    }
  }
`;

/**
 * Universal iframe print trigger.
 * Injects HTML into an isolated hidden iframe, triggers print, and cleans up.
 */
export function printReceiptHtml(htmlContent: string) {
  if (typeof window === 'undefined') return;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('style', 'position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0; visibility: hidden;');
  iframe.src = 'about:blank';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Small delay to allow CSS & fonts to render completely before opening print dialog
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('[ReceiptPrinter] Print failed:', err);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }
  }, 250);
}

/**
 * 1. Print Standard Airtime / Data / Transaction Receipt
 */
export function printTransactionReceipt(receipt: {
  transactionId?: string;
  reference: string;
  clientReference?: string;
  serviceType: string;
  status: string;
  recipient: string;
  network?: string;
  networkName?: string;
  faceAmountNaira: number;
  discountNaira?: number;
  amountDebitedNaira: number;
  date: string;
  businessName?: string;
}) {
  const isSuccess = receipt.status === 'SUCCESSFUL';
  const isFailed = receipt.status === 'FAILED' || receipt.status === 'REVERSED';
  const statusClass = isSuccess ? 'status-success' : isFailed ? 'status-failed' : 'status-processing';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Baxato Receipt - ${escapeHtml(receipt.reference)}</title>
  <style>${BASE_RECEIPT_STYLES}</style>
</head>
<body>
  <div class="receipt-card">
    <div class="brand-header">
      <div class="brand-title">
        BAX<span class="accent">ATO</span>
      </div>
      <div class="brand-subtitle">Official Transaction Receipt</div>
    </div>

    <div class="status-badge-container">
      <span class="status-badge ${statusClass}">${escapeHtml(receipt.status)}</span>
    </div>

    <div class="amount-hero">
      <div class="amount-val">${formatNaira(receipt.amountDebitedNaira)}</div>
      <div class="amount-label">Amount Debited</div>
    </div>

    <table class="data-table">
      <tr>
        <td class="label">Service</td>
        <td class="value">${escapeHtml(receipt.serviceType)} Top-Up</td>
      </tr>
      <tr>
        <td class="label">Provider / Network</td>
        <td class="value">${escapeHtml(receipt.networkName || receipt.network || 'Telecom')}</td>
      </tr>
      <tr>
        <td class="label">Recipient Number</td>
        <td class="value value-mono">${escapeHtml(receipt.recipient)}</td>
      </tr>
      <tr>
        <td class="label">Face Value Purchased</td>
        <td class="value value-mono">${formatNaira(receipt.faceAmountNaira)}</td>
      </tr>
      ${
        receipt.discountNaira && receipt.discountNaira > 0
          ? `<tr>
        <td class="label">Merchant Cashback / Discount</td>
        <td class="value" style="color: #059669;">-${formatNaira(receipt.discountNaira)}</td>
      </tr>`
          : ''
      }
      <tr class="total-row">
        <td class="label">Net Amount Debited</td>
        <td class="value value-mono">${formatNaira(receipt.amountDebitedNaira)}</td>
      </tr>
      <tr>
        <td class="label">Payment Source</td>
        <td class="value">BAXATO Main Balance</td>
      </tr>
      ${
        receipt.businessName
          ? `<tr>
        <td class="label">Business Terminal</td>
        <td class="value">${escapeHtml(receipt.businessName)}</td>
      </tr>`
          : ''
      }
      <tr>
        <td class="label">Transaction Reference</td>
        <td class="value value-mono" style="font-size: 11px;">${escapeHtml(receipt.reference)}</td>
      </tr>
      ${
        receipt.clientReference
          ? `<tr>
        <td class="label">Order / Client Ref</td>
        <td class="value value-mono" style="font-size: 11px;">${escapeHtml(receipt.clientReference)}</td>
      </tr>`
          : ''
      }
      <tr>
        <td class="label">Date & Time</td>
        <td class="value">${escapeHtml(receipt.date)}</td>
      </tr>
    </table>

    <div class="receipt-footer">
      <div class="bold">Thank you for using BAXATO</div>
      <div>Quadrox Technologies Limited &bull; Verified Digital Settlement</div>
      <div>Support: support@baxato.com &bull; https://baxato.com</div>
      <div style="margin-top: 6px; font-size: 9px;">Generated: ${new Date().toLocaleString('en-NG')}</div>
    </div>
  </div>
</body>
</html>`;

  printReceiptHtml(html);
}

/**
 * 2. Print Electricity Token Receipt
 */
export function printElectricityReceipt(receipt: {
  transactionId?: string;
  reference: string;
  clientReference?: string;
  status: string;
  disco: string;
  discoName: string;
  meterNumber: string;
  meterType: 'PREPAID' | 'POSTPAID' | string;
  customerName?: string;
  customerAddress?: string;
  token?: string;
  units?: string;
  unitsCostNaira?: number;
  vatNaira?: number;
  tariff?: string;
  feeder?: string;
  faceAmountNaira: number;
  discountNaira?: number;
  amountDebitedNaira: number;
  date: string;
}) {
  const isSuccess = receipt.status === 'SUCCESSFUL';
  const isFailed = receipt.status === 'FAILED' || receipt.status === 'REVERSED';
  const statusClass = isSuccess ? 'status-success' : isFailed ? 'status-failed' : 'status-processing';

  // Format token in 4-digit groups if available
  const formattedToken = receipt.token
    ? receipt.token.replace(/\D/g, '').match(/.{1,4}/g)?.join(' - ') || receipt.token
    : null;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Electricity Receipt - ${escapeHtml(receipt.reference)}</title>
  <style>${BASE_RECEIPT_STYLES}</style>
</head>
<body>
  <div class="receipt-card">
    <div class="brand-header">
      <div class="brand-title">
        BAX<span class="accent">ATO</span>
      </div>
      <div class="brand-subtitle">Electricity Value Delivery Slip</div>
    </div>

    <div class="status-badge-container">
      <span class="status-badge ${statusClass}">${escapeHtml(receipt.status)}</span>
    </div>

    ${
      formattedToken
        ? `<div class="token-box">
      <div class="token-label">&#9889; STS Prepaid Token</div>
      <div class="token-code">${escapeHtml(formattedToken)}</div>
      <div class="token-meta">
        ${receipt.units ? `<strong>Units:</strong> ${escapeHtml(receipt.units)} kWh &nbsp;|&nbsp; ` : ''}
        <strong>Meter:</strong> ${escapeHtml(receipt.meterNumber)}
      </div>
    </div>`
        : `<div class="amount-hero">
      <div class="amount-val">${formatNaira(receipt.amountDebitedNaira)}</div>
      <div class="amount-label">Electricity Recharge</div>
    </div>`
    }

    <table class="data-table">
      <tr>
        <td class="label">DisCo Operator</td>
        <td class="value">${escapeHtml(receipt.discoName || receipt.disco)}</td>
      </tr>
      <tr>
        <td class="label">Meter Number</td>
        <td class="value value-mono">${escapeHtml(receipt.meterNumber)}</td>
      </tr>
      <tr>
        <td class="label">Meter Type</td>
        <td class="value">${escapeHtml(receipt.meterType)}</td>
      </tr>
      ${
        receipt.customerName
          ? `<tr>
        <td class="label">Customer Name</td>
        <td class="value">${escapeHtml(receipt.customerName)}</td>
      </tr>`
          : ''
      }
      ${
        receipt.customerAddress
          ? `<tr>
        <td class="label">Customer Address</td>
        <td class="value" style="font-size: 10.5px;">${escapeHtml(receipt.customerAddress)}</td>
      </tr>`
          : ''
      }
      ${
        receipt.units
          ? `<tr>
        <td class="label">Units Delivered</td>
        <td class="value value-mono">${escapeHtml(receipt.units)} kWh</td>
      </tr>`
          : ''
      }
      ${
        receipt.tariff
          ? `<tr>
        <td class="label">Tariff Class</td>
        <td class="value">${escapeHtml(receipt.tariff)}</td>
      </tr>`
          : ''
      }
      <tr>
        <td class="label">Recharge Value</td>
        <td class="value value-mono">${formatNaira(receipt.faceAmountNaira)}</td>
      </tr>
      ${
        receipt.vatNaira && receipt.vatNaira > 0
          ? `<tr>
        <td class="label">Value Added Tax (VAT)</td>
        <td class="value value-mono">${formatNaira(receipt.vatNaira)}</td>
      </tr>`
          : ''
      }
      ${
        receipt.discountNaira && receipt.discountNaira > 0
          ? `<tr>
        <td class="label">Discount</td>
        <td class="value" style="color: #059669;">-${formatNaira(receipt.discountNaira)}</td>
      </tr>`
          : ''
      }
      <tr class="total-row">
        <td class="label">Amount Paid</td>
        <td class="value value-mono">${formatNaira(receipt.amountDebitedNaira)}</td>
      </tr>
      <tr>
        <td class="label">Transaction Reference</td>
        <td class="value value-mono" style="font-size: 11px;">${escapeHtml(receipt.reference)}</td>
      </tr>
      <tr>
        <td class="label">Date & Time</td>
        <td class="value">${escapeHtml(receipt.date)}</td>
      </tr>
    </table>

    <div class="receipt-footer">
      <div class="bold">Thank you for recharging with BAXATO</div>
      <div>Enter token on your Customer Interface Unit (CIU/Keypad) and press Enter.</div>
      <div>Support: support@baxato.com &bull; https://baxato.com</div>
      <div style="margin-top: 6px; font-size: 9px;">Printed: ${new Date().toLocaleString('en-NG')}</div>
    </div>
  </div>
</body>
</html>`;

  printReceiptHtml(html);
}

/**
 * 3. Print Cable TV Subscription Receipt
 */
export function printCableReceipt(receipt: {
  transactionId?: string;
  reference: string;
  clientReference?: string;
  status: string;
  operator: string;
  operatorName: string;
  smartcard: string;
  customerName?: string;
  bouquetName: string;
  validity?: string;
  faceAmountNaira: number;
  discountNaira?: number;
  amountDebitedNaira: number;
  date: string;
}) {
  const isSuccess = receipt.status === 'SUCCESSFUL';
  const isFailed = receipt.status === 'FAILED' || receipt.status === 'REVERSED';
  const statusClass = isSuccess ? 'status-success' : isFailed ? 'status-failed' : 'status-processing';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Cable TV Receipt - ${escapeHtml(receipt.reference)}</title>
  <style>${BASE_RECEIPT_STYLES}</style>
</head>
<body>
  <div class="receipt-card">
    <div class="brand-header">
      <div class="brand-title">
        BAX<span class="accent">ATO</span>
      </div>
      <div class="brand-subtitle">Cable TV Subscription Receipt</div>
    </div>

    <div class="status-badge-container">
      <span class="status-badge ${statusClass}">${escapeHtml(receipt.status)}</span>
    </div>

    <div class="amount-hero">
      <div class="amount-val">${formatNaira(receipt.amountDebitedNaira)}</div>
      <div class="amount-label">${escapeHtml(receipt.bouquetName)}</div>
    </div>

    <table class="data-table">
      <tr>
        <td class="label">PayTV Provider</td>
        <td class="value">${escapeHtml(receipt.operatorName || receipt.operator)}</td>
      </tr>
      <tr>
        <td class="label">Smartcard / IUC / Decoder</td>
        <td class="value value-mono">${escapeHtml(receipt.smartcard)}</td>
      </tr>
      ${
        receipt.customerName
          ? `<tr>
        <td class="label">Customer Name</td>
        <td class="value">${escapeHtml(receipt.customerName)}</td>
      </tr>`
          : ''
      }
      <tr>
        <td class="label">Subscribed Bouquet</td>
        <td class="value">${escapeHtml(receipt.bouquetName)}</td>
      </tr>
      ${
        receipt.validity
          ? `<tr>
        <td class="label">Subscription Duration</td>
        <td class="value">${escapeHtml(receipt.validity)}</td>
      </tr>`
          : ''
      }
      <tr>
        <td class="label">Bouquet Cost</td>
        <td class="value value-mono">${formatNaira(receipt.faceAmountNaira)}</td>
      </tr>
      ${
        receipt.discountNaira && receipt.discountNaira > 0
          ? `<tr>
        <td class="label">Merchant Discount</td>
        <td class="value" style="color: #059669;">-${formatNaira(receipt.discountNaira)}</td>
      </tr>`
          : ''
      }
      <tr class="total-row">
        <td class="label">Amount Paid</td>
        <td class="value value-mono">${formatNaira(receipt.amountDebitedNaira)}</td>
      </tr>
      <tr>
        <td class="label">Payment Source</td>
        <td class="value">BAXATO Main Balance</td>
      </tr>
      <tr>
        <td class="label">Transaction Reference</td>
        <td class="value value-mono" style="font-size: 11px;">${escapeHtml(receipt.reference)}</td>
      </tr>
      <tr>
        <td class="label">Date & Time</td>
        <td class="value">${escapeHtml(receipt.date)}</td>
      </tr>
    </table>

    <div class="receipt-footer">
      <div class="bold">Thank you for renewing with BAXATO</div>
      <div>Please keep your decoder powered on for instant automatic signal activation.</div>
      <div>Support: support@baxato.com &bull; https://baxato.com</div>
      <div style="margin-top: 6px; font-size: 9px;">Printed: ${new Date().toLocaleString('en-NG')}</div>
    </div>
  </div>
</body>
</html>`;

  printReceiptHtml(html);
}

/**
 * 4. Print Exam PIN Slip
 */
export function printExamPinReceipt(receipt: {
  transactionId?: string;
  reference: string;
  clientReference?: string;
  status: string;
  packageCode: string;
  packageName: string;
  examBody: string;
  portalUrl?: string;
  instructions?: string;
  candidateName?: string;
  candidateId?: string;
  pins?: Array<{ pin: string; serialNumber?: string; instructions?: string }>;
  baseCostNaira?: number;
  merchantMarkupNaira?: number;
  faceAmountNaira?: number;
  discountNaira?: number;
  amountDebitedNaira: number;
  date: string;
}) {
  const isSuccess = receipt.status === 'SUCCESSFUL';
  const isFailed = receipt.status === 'FAILED' || receipt.status === 'REVERSED';
  const statusClass = isSuccess ? 'status-success' : isFailed ? 'status-failed' : 'status-processing';

  const pinsHtml =
    receipt.pins && receipt.pins.length > 0
      ? receipt.pins
          .map(
            (p, idx) => `
        <div class="token-box" style="margin: 10px 0; padding: 10px;">
          <div class="token-label">PIN #${idx + 1}</div>
          <div class="token-code">${escapeHtml(p.pin)}</div>
          ${p.serialNumber ? `<div class="token-meta"><strong>Serial:</strong> ${escapeHtml(p.serialNumber)}</div>` : ''}
        </div>`,
          )
          .join('')
      : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Exam PIN Receipt - ${escapeHtml(receipt.reference)}</title>
  <style>${BASE_RECEIPT_STYLES}</style>
</head>
<body>
  <div class="receipt-card">
    <div class="brand-header">
      <div class="brand-title">
        BAX<span class="accent">ATO</span>
      </div>
      <div class="brand-subtitle">Educational Exam PIN Voucher</div>
    </div>

    <div class="status-badge-container">
      <span class="status-badge ${statusClass}">${escapeHtml(receipt.status)}</span>
    </div>

    ${pinsHtml}

    <table class="data-table">
      <tr>
        <td class="label">Exam Council</td>
        <td class="value">${escapeHtml(receipt.examBody)}</td>
      </tr>
      <tr>
        <td class="label">Package</td>
        <td class="value">${escapeHtml(receipt.packageName)}</td>
      </tr>
      ${
        receipt.candidateName || receipt.candidateId
          ? `<tr>
        <td class="label">Candidate / ID</td>
        <td class="value">${escapeHtml(receipt.candidateName || receipt.candidateId)}</td>
      </tr>`
          : ''
      }
      ${
        receipt.portalUrl
          ? `<tr>
        <td class="label">Official Portal</td>
        <td class="value" style="font-size: 11px;">${escapeHtml(receipt.portalUrl)}</td>
      </tr>`
          : ''
      }
      <tr class="total-row">
        <td class="label">Total Debited</td>
        <td class="value value-mono">${formatNaira(receipt.amountDebitedNaira)}</td>
      </tr>
      <tr>
        <td class="label">Transaction Reference</td>
        <td class="value value-mono" style="font-size: 11px;">${escapeHtml(receipt.reference)}</td>
      </tr>
      <tr>
        <td class="label">Date & Time</td>
        <td class="value">${escapeHtml(receipt.date)}</td>
      </tr>
    </table>

    ${
      receipt.instructions
        ? `<div style="margin-top: 12px; padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 10px; color: #475569;">
      <strong>Instructions:</strong> ${escapeHtml(receipt.instructions)}
    </div>`
        : ''
    }

    <div class="receipt-footer">
      <div class="bold">Official Examination Card</div>
      <div>Visit official portal to redeem your token. Do not share your PIN with unauthorized parties.</div>
      <div>Support: support@baxato.com &bull; https://baxato.com</div>
      <div style="margin-top: 6px; font-size: 9px;">Printed: ${new Date().toLocaleString('en-NG')}</div>
    </div>
  </div>
</body>
</html>`;

  printReceiptHtml(html);
}

/**
 * 5. Print Staff / Admin Backoffice Receipt
 */
export function printStaffReceipt(tx: any) {
  const meta = tx.metadata || {};
  const isElectricity = tx.serviceType === 'ELECTRICITY';
  const rawToken = meta.token || meta.tokenValue || tx.token;
  const tokenFormatted = rawToken
    ? rawToken.replace(/\D/g, '').match(/.{1,4}/g)?.join(' - ') || rawToken
    : null;

  const formattedDate = new Date(tx.createdAt).toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const isSuccess = tx.status === 'SUCCESSFUL';
  const isFailed = tx.status === 'FAILED' || tx.status === 'REVERSED';
  const statusClass = isSuccess ? 'status-success' : isFailed ? 'status-failed' : 'status-processing';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Staff Audit Slip - ${escapeHtml(tx.id || tx.clientReference)}</title>
  <style>${BASE_RECEIPT_STYLES}</style>
</head>
<body>
  <div class="receipt-card">
    <div class="brand-header">
      <div class="brand-title">
        BAX<span class="accent">ATO</span>
      </div>
      <div class="brand-subtitle">Platform Operations Audit Slip</div>
    </div>

    <div class="status-badge-container">
      <span class="status-badge ${statusClass}">${escapeHtml(tx.status)}</span>
    </div>

    ${
      tokenFormatted && isElectricity
        ? `<div class="token-box">
      <div class="token-label">&#9889; STS Token</div>
      <div class="token-code">${escapeHtml(tokenFormatted)}</div>
      <div class="token-meta">
        ${meta.units || tx.units ? `<strong>Units:</strong> ${escapeHtml(meta.units || tx.units)} kWh &nbsp;|&nbsp; ` : ''}
        <strong>Meter:</strong> ${escapeHtml(tx.recipient)}
      </div>
    </div>`
        : `<div class="amount-hero">
      <div class="amount-val">${formatNaira(tx.amountNaira || tx.amount)}</div>
      <div class="amount-label">${escapeHtml(tx.serviceType)} Transaction</div>
    </div>`
    }

    <table class="data-table">
      <tr>
        <td class="label">Transaction ID</td>
        <td class="value value-mono" style="font-size: 11px;">${escapeHtml(tx.id)}</td>
      </tr>
      <tr>
        <td class="label">Reference / Order</td>
        <td class="value value-mono" style="font-size: 11px;">${escapeHtml(tx.clientReference || tx.reference || 'N/A')}</td>
      </tr>
      <tr>
        <td class="label">Merchant Business</td>
        <td class="value">${escapeHtml(tx.businessName || 'Merchant Terminal')}</td>
      </tr>
      <tr>
        <td class="label">Service Category</td>
        <td class="value">${escapeHtml(tx.serviceType)}</td>
      </tr>
      <tr>
        <td class="label">Provider Route</td>
        <td class="value">${escapeHtml(tx.provider || meta.provider || 'PRIMARY')}</td>
      </tr>
      <tr>
        <td class="label">Recipient / Target</td>
        <td class="value value-mono">${escapeHtml(tx.recipient)}</td>
      </tr>
      <tr class="total-row">
        <td class="label">Amount</td>
        <td class="value value-mono">${formatNaira(tx.amountNaira || tx.amount)}</td>
      </tr>
      <tr>
        <td class="label">Timestamp</td>
        <td class="value">${escapeHtml(formattedDate)}</td>
      </tr>
    </table>

    <div class="receipt-footer">
      <div class="bold">Baxato Backoffice Operations Verification</div>
      <div>Confidential Operational Record &bull; quadrox.tech</div>
      <div style="margin-top: 6px; font-size: 9px;">Printed by Staff on: ${new Date().toLocaleString('en-NG')}</div>
    </div>
  </div>
</body>
</html>`;

  printReceiptHtml(html);
}
