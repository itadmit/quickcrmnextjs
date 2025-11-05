import puppeteer, { Browser } from "puppeteer"
import QRCode from "qrcode"

interface QuoteItem {
  description: string
  richDescription?: string | null
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

interface Lead {
  name: string
  email?: string | null
  phone?: string | null
}

interface Company {
  name: string
  settings?: any
}

interface Quote {
  id: string
  quoteNumber: string
  title: string
  description?: string | null
  templateType?: string
  subtotal: number
  discount: number
  tax: number
  total: number
  validUntil?: Date | null
  notes?: string | null
  terms?: string | null
  createdAt: Date
  items: QuoteItem[]
  lead?: Lead | null
  company: Company
}

// Browser pool singleton - מחזיק browser instance פעיל לשימוש חוזר
let browserInstance: Browser | null = null
let browserPromise: Promise<Browser> | null = null

async function getBrowser(): Promise<Browser> {
  if (browserInstance) {
    return browserInstance
  }

  if (browserPromise) {
    return browserPromise
  }

  browserPromise = puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-component-extensions-with-background-pages',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--disable-renderer-backgrounding',
      '--disable-sync',
      '--force-color-profile=srgb',
      '--metrics-recording-only',
      '--mute-audio',
      '--hide-scrollbars',
      '--disable-default-apps',
      '--single-process'
    ],
    timeout: 30000
  }).then(browser => {
    browserInstance = browser
    browserPromise = null
    return browser
  })

  return browserPromise
}

function formatCurrency(amount: number): string {
  return `₪${amount.toLocaleString("he-IL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("he-IL")
}

// פונקציה ליצירת QR code של קישור לאישור
async function generateQRCodeDataURL(url: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 150,
      margin: 1,
    })
    return qrCodeDataURL
  } catch (error) {
    console.error('Error generating QR code:', error)
    return ''
  }
}

// פונקציה שמחזירה את ה-HTML בלבד (ללא PDF)
export async function generateQuoteHTML(quote: Quote): Promise<string> {
  const templateType = quote.templateType || 'simple'
  
  // יצירת URL לאישור
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const approveUrl = `${baseUrl}/quotes/${quote.id}/approve`
  
  // יצירת QR code
  const qrCodeDataURL = await generateQRCodeDataURL(approveUrl)
  
  return templateType === 'professional' 
    ? generateProfessionalTemplate(quote, approveUrl, qrCodeDataURL)
    : generateSimpleTemplate(quote, approveUrl, qrCodeDataURL)
}

function generateSimpleTemplate(quote: Quote, approveUrl: string, qrCodeDataURL: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>הצעת מחיר ${quote.quoteNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;500;600;700&display=swap');
    @page {
      size: A4;
      margin-top: 20mm;
      margin-bottom: 20mm;
      margin-left: 0;
      margin-right: 0;
    }
    @page :first {
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Noto Sans Hebrew', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #000;
      background: #fff;
      padding: 0;
      margin: 0;
      orphans: 3;
      widows: 3;
    }
    .header {
      background: linear-gradient(135deg, #6f65e2 0%, #5a52c7 100%);
      color: white;
      padding: 30px 50px;
      text-align: right;
      page-break-inside: avoid;
      page-break-after: avoid;
    }
    .header h1 {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .header .subtitle {
      font-size: 18px;
      opacity: 0.9;
    }
    .content {
      padding: 30px 50px;
    }
    .info-section {
      margin-bottom: 30px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-label {
      font-weight: bold;
      color: #374151;
    }
    .info-value {
      color: #111827;
    }
    .quote-title {
      font-size: 20px;
      font-weight: bold;
      color: #1f2937;
      margin: 30px 0 15px 0;
      text-align: right;
    }
    .quote-description {
      color: #4b5563;
      margin-bottom: 30px;
      line-height: 1.8;
      text-align: right;
    }
    .table-container {
      margin: 30px 0;
      overflow-x: auto;
      page-break-inside: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      page-break-inside: auto;
    }
    thead {
      background: linear-gradient(135deg, #6f65e2 0%, #5a52c7 100%);
      color: white;
      display: table-header-group;
    }
    tbody {
      display: table-row-group;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    th {
      padding: 15px;
      text-align: right;
      font-weight: bold;
      font-size: 11px;
      page-break-inside: avoid;
    }
    td {
      padding: 12px 15px;
      text-align: right;
      border-bottom: 1px solid #e5e7eb;
      page-break-inside: avoid;
    }
    tbody tr:nth-child(even) {
      background-color: #f9fafb;
    }
    tbody tr:hover {
      background-color: #f3f4f6;
    }
    .summary {
      margin-top: 30px;
      padding: 20px;
      background: #f9fafb;
      page-break-inside: avoid;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .summary-row:last-child {
      border-bottom: none;
    }
    .summary-label {
      font-weight: 600;
      color: #374151;
    }
    .summary-value {
      font-weight: 600;
      color: #111827;
    }
    .total-row {
      font-size: 16px;
      padding: 15px 0;
      margin-top: 10px;
      border-top: 2px solid #6f65e2;
    }
    .total-label {
      font-size: 18px;
      font-weight: bold;
      color: #6f65e2;
    }
    .total-value {
      font-size: 20px;
      font-weight: bold;
      color: #6f65e2;
    }
    .notes-terms-container {
      margin-top: 40px;
      padding: 20px;
      background: #f9fafb;
      page-break-inside: avoid;
    }
    .notes-section {
      margin-top: 0;
      margin-bottom: 0;
      padding: 0;
      padding-bottom: 0;
      background: transparent;
      page-break-inside: auto;
    }
    .terms-section {
      margin-top: 0;
      padding: 0;
      padding-top: 0;
      background: transparent;
      page-break-inside: auto;
      position: relative;
    }
    .notes-section + .terms-section {
      margin-top: 40px;
      padding-top: 40px;
    }
    .notes-section + .terms-section::before {
      content: "";
      position: absolute;
      top: 0;
      left: -20px;
      right: -20px;
      height: 40px;
      background: white;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 15px;
    }
    .section-content {
      color: #4b5563;
      line-height: 1.8;
      white-space: pre-wrap;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 10px;
    }
    .brand-name {
      color: #de4481;
      font-weight: 600;
    }
    .approval-section {
      margin-top: 30px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
      text-align: center;
      page-break-inside: avoid;
    }
    .approval-title {
      font-size: 14px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 15px;
    }
    .approval-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      flex-direction: row-reverse;
    }
    .qr-code {
      width: 120px;
      height: 120px;
    }
    .approval-text {
      text-align: right;
      font-size: 12px;
      color: #4b5563;
    }
    .approval-link {
      color: #de4481;
      text-decoration: underline;
      font-weight: 600;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .currency {
      font-family: 'Noto Sans Hebrew', sans-serif;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${quote.company.name}</h1>
    <div class="subtitle">הצעת מחיר</div>
  </div>
  
  <div class="content">
    <div class="info-section">
      <div class="info-row">
        <span class="info-label">מספר הצעת מחיר:</span>
        <span class="info-value">${quote.quoteNumber}</span>
      </div>
      <div class="info-row">
        <span class="info-label">תאריך:</span>
        <span class="info-value">${formatDate(quote.createdAt)}</span>
      </div>
      ${quote.validUntil ? `
      <div class="info-row">
        <span class="info-label">תוקף עד:</span>
        <span class="info-value">${formatDate(quote.validUntil)}</span>
      </div>
      ` : ''}
      ${quote.lead ? `
      <div class="info-row">
        <span class="info-label">לכבוד:</span>
        <span class="info-value">${quote.lead.name}</span>
      </div>
      ${quote.lead.email ? `
      <div class="info-row">
        <span class="info-label">אימייל:</span>
        <span class="info-value">${quote.lead.email}</span>
      </div>
      ` : ''}
      ${quote.lead.phone ? `
      <div class="info-row">
        <span class="info-label">טלפון:</span>
        <span class="info-value">${quote.lead.phone}</span>
      </div>
      ` : ''}
      ` : ''}
    </div>

    <div class="quote-title">${quote.title}</div>
    
    ${quote.description ? `
    <div class="quote-description">${quote.description}</div>
    ` : ''}

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>תיאור הפריט</th>
            <th>כמות</th>
            <th>מחיר יחידה</th>
            <th>סה״כ</th>
          </tr>
        </thead>
        <tbody>
          ${quote.items.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.description}</td>
              <td>${item.quantity}</td>
              <td class="currency">${formatCurrency(item.unitPrice)}</td>
              <td class="currency">${formatCurrency(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="summary">
      <div class="summary-row">
        <span class="summary-label">סכום ביניים:</span>
        <span class="summary-value currency">${formatCurrency(quote.subtotal)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">מע״מ (${quote.tax}%):</span>
        <span class="summary-value currency">${formatCurrency((quote.subtotal * (1 - quote.discount / 100)) * (quote.tax / 100))}</span>
      </div>
      ${quote.discount > 0 ? `
      <div class="summary-row">
        <span class="summary-label">הנחה (${quote.discount}%):</span>
        <span class="summary-value currency">-${formatCurrency(quote.subtotal * (quote.discount / 100))}</span>
      </div>
      ` : ''}
      <div class="summary-row total-row">
        <span class="total-label">סה״כ לתשלום:</span>
        <span class="total-value currency">${formatCurrency(quote.total)}</span>
      </div>
    </div>

    ${quote.notes || quote.terms ? `
    <div class="notes-terms-container">
      ${quote.notes ? `
      <div class="notes-section">
        <div class="section-title">הערות:</div>
        <div class="section-content">${quote.notes}</div>
      </div>
      ` : ''}
      ${quote.terms ? `
      <div class="terms-section">
        <div class="section-title">תנאים:</div>
        <div class="section-content">${quote.terms}</div>
      </div>
      ` : ''}
    </div>
    ` : ''}

    ${quote.signature ? `
    <div class="signature-section" style="margin-top: 40px; padding: 20px; background: #f9fafb; border-radius: 8px; page-break-inside: avoid;">
      <div class="section-title">חתימת לקוח:</div>
      <div style="margin-top: 15px; text-align: center;">
        <img src="${quote.signature}" alt="חתימת לקוח" style="max-width: 300px; max-height: 150px; border: 1px solid #e5e7eb; padding: 10px; background: white;" />
      </div>
      ${quote.signedAt ? `
      <div style="margin-top: 10px; text-align: center; color: #6b7280; font-size: 11px;">
        נחתם ב-${formatDate(quote.signedAt)}
      </div>
      ` : ''}
    </div>
    ` : `
    <div class="approval-section">
      <div class="approval-title">לאישור ההצעה סרקו את הברקוד או לחצו כאן</div>
      <div class="approval-content">
        ${qrCodeDataURL ? `<img src="${qrCodeDataURL}" alt="QR Code" class="qr-code" />` : ''}
        <div class="approval-text">
          <a href="${approveUrl}" class="approval-link" target="_blank">לחץ כאן לאישור ותשלום מקדמה</a>
        </div>
      </div>
    </div>
    `}

    <div class="footer">
      <div>הצעת מחיר זו הופקה על ידי <span class="brand-name">Quick invoice</span></div>
    </div>
  </div>
</body>
  </html>
  `
}

function generateProfessionalTemplate(quote: Quote, approveUrl: string, qrCodeDataURL: string): string {
  // קבלת הגדרות עיצוב מהגדרות החברה
  const settings = quote.company.settings || {}
  const quoteTemplate = settings.quoteTemplate || {}
  const companyInfo = settings.companyInfo || {}
  
  // צבעים - ברירת מחדל אם לא מוגדר
  const primaryColor = quoteTemplate.primaryColor || '#FF6B6B'
  const secondaryColor = quoteTemplate.secondaryColor || '#1e3a8a'
  
  // לוגו או שם חברה
  const logoUrl = quoteTemplate.logoUrl
  const companyName = quote.company.name
  const companyTagline = quoteTemplate.tagline || companyInfo.tagline || ''
  
  // פרטי חברה
  const vatId = companyInfo.vatId || settings.vatId
  const address = companyInfo.address || settings.address
  const phone = companyInfo.phone || settings.phone
  const email = companyInfo.email || settings.email
  const website = companyInfo.website || settings.website

  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>הצעת מחיר ${quote.quoteNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;500;600;700&display=swap');
    @page {
      size: A4;
      margin-top: 20mm;
      margin-bottom: 20mm;
      margin-left: 0;
      margin-right: 0;
    }
    @page :first {
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Noto Sans Hebrew', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.7;
      color: #000;
      background: #fff;
      padding: 0;
      margin: 0;
      orphans: 3;
      widows: 3;
    }
    .header-container {
      position: relative;
      height: 180px;
      overflow: hidden;
      margin-bottom: 30px;
      page-break-inside: avoid;
      page-break-after: avoid;
    }
    .header-left {
      position: absolute;
      left: 50px;
      top: 20px;
      bottom: 20px;
      z-index: 2;
      width: 40%;
      max-width: 300px;
      display: flex;
      align-items: center;
    }
    .logo-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
    }
    .logo-image {
      width: 100%;
      height: 100%;
      max-height: 140px;
      object-fit: contain;
      object-position: left center;
    }
    .logo-circle {
      width: 60px;
      height: 60px;
      background: ${primaryColor};
      border: 3px solid ${secondaryColor};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
    }
    .logo-letter {
      color: white;
      font-size: 32px;
      font-weight: bold;
      font-family: 'Arial', sans-serif;
    }
    .company-name {
      font-size: 18px;
      font-weight: bold;
      color: ${secondaryColor};
      letter-spacing: 1px;
    }
    .company-tagline {
      font-size: 10px;
      color: ${secondaryColor};
      letter-spacing: 2px;
      margin-top: 2px;
    }
    .header-right {
      position: absolute;
      right: 0;
      top: 0;
      width: 60%;
      height: 100%;
      background: ${primaryColor};
      clip-path: polygon(20% 0, 100% 0, 100% 100%, 0% 100%);
      padding: 40px 60px 40px 80px;
      color: white;
      z-index: 1;
    }
    .header-right h1 {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 8px;
      text-align: right;
    }
    .header-right .subtitle {
      font-size: 16px;
      opacity: 0.95;
      text-align: right;
      margin-bottom: 20px;
    }
    .header-contact {
      text-align: right;
      font-size: 11px;
      line-height: 1.8;
    }
    .header-contact-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    .header-contact-label {
      font-weight: 600;
      margin-left: 15px;
    }
    .header-contact-value {
      opacity: 0.95;
    }
    .content {
      padding: 30px 50px;
      position: relative;
    }
    .doc-info {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .doc-date {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .doc-number {
      font-size: 16px;
      font-weight: bold;
      color: ${secondaryColor};
      margin-bottom: 5px;
    }
    .doc-copy {
      font-size: 10px;
      color: #9ca3af;
      font-style: italic;
    }
    .info-section {
      margin-bottom: 30px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-label {
      font-weight: bold;
      color: #374151;
    }
    .info-value {
      color: #111827;
    }
    .quote-title {
      font-size: 20px;
      font-weight: bold;
      color: #1f2937;
      margin: 30px 0 15px 0;
      text-align: right;
    }
    .quote-description {
      color: #4b5563;
      margin-bottom: 30px;
      line-height: 1.8;
      text-align: right;
    }
    .items-section {
      margin: 30px 0;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      background: white;
      page-break-inside: auto;
    }
    .items-table thead {
      background: ${primaryColor};
      display: table-header-group;
    }
    .items-table tbody {
      display: table-row-group;
    }
    .items-table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    .items-table th {
      padding: 12px 15px;
      text-align: right;
      font-weight: bold;
      font-size: 11px;
      color: white;
      border: 1px solid ${primaryColor};
      page-break-inside: avoid;
    }
    .items-table td {
      padding: 15px;
      text-align: right;
      border: 1px solid #e5e7eb;
      vertical-align: top;
      page-break-inside: avoid;
    }
    .items-table tbody tr {
      border-bottom: 1px solid #e5e7eb;
    }
    .items-table tbody tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .item-title-cell {
      font-size: 14px;
      font-weight: 600;
      color: ${secondaryColor};
      line-height: 1.6;
    }
    .item-description-cell {
      font-size: 11px;
      color: #4b5563;
      line-height: 1.8;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #f3f4f6;
    }
    .item-price-cell {
      font-family: 'Noto Sans Hebrew', sans-serif;
      font-weight: 600;
      color: ${secondaryColor};
      font-size: 13px;
      text-align: right;
    }
    .item-quantity-cell {
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .item-unit-price-cell {
      text-align: right;
      font-size: 12px;
      color: #6b7280;
      font-family: 'Noto Sans Hebrew', sans-serif;
      font-weight: 600;
    }
    .item-unit-price-cell.included, .item-total-cell.included {
      font-family: 'Noto Sans Hebrew', sans-serif;
      color: #6b7280;
      font-weight: 500;
      text-align: center;
    }
    .item-total-cell {
      font-family: 'Noto Sans Hebrew', sans-serif;
      font-weight: 600;
      color: ${secondaryColor};
      text-align: right;
      font-size: 13px;
    }
    .summary {
      margin-top: 40px;
      padding: 25px;
      background: #f9fafb;
      page-break-inside: avoid;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
    }
    .summary-label {
      font-weight: 600;
      color: #374151;
    }
    .summary-value {
      font-weight: 600;
      color: ${secondaryColor};
      font-family: 'Noto Sans Hebrew', sans-serif;
    }
    .total-row {
      font-size: 18px;
      padding: 20px 0;
      margin-top: 15px;
    }
    .total-label {
      font-size: 20px;
      font-weight: bold;
      color: ${secondaryColor};
    }
    .total-value {
      font-size: 24px;
      font-weight: bold;
      color: ${secondaryColor};
      font-family: 'Noto Sans Hebrew', sans-serif;
    }
    .discount-row {
      font-size: 14px;
      padding: 15px 0;
      margin-top: 10px;
      background: transparent;
    }
    .discount-label {
      font-weight: 600;
      color: ${secondaryColor};
    }
    .discount-reason {
      font-size: 12px;
      color: #6b7280;
      margin-top: 5px;
      font-style: italic;
    }
    .notes-terms-container {
      margin-top: 40px;
      padding: 20px;
      background: #f9fafb;
      page-break-inside: avoid;
    }
    .notes-section {
      margin-top: 0;
      margin-bottom: 0;
      padding: 0;
      padding-bottom: 0;
      background: transparent;
      page-break-inside: auto;
    }
    .terms-section {
      margin-top: 0;
      padding: 0;
      padding-top: 0;
      background: transparent;
      page-break-inside: auto;
      position: relative;
    }
    .notes-section + .terms-section {
      margin-top: 40px;
      padding-top: 40px;
    }
    .notes-section + .terms-section::before {
      content: "";
      position: absolute;
      top: 0;
      left: -20px;
      right: -20px;
      height: 40px;
      background: white;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 15px;
    }
    .section-content {
      color: #4b5563;
      line-height: 1.8;
      white-space: pre-wrap;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 10px;
    }
    .brand-name {
      color: #de4481;
      font-weight: 600;
    }
    .approval-section {
      margin-top: 30px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
      text-align: center;
      page-break-inside: avoid;
    }
    .approval-title {
      font-size: 14px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 15px;
    }
    .approval-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      flex-direction: row-reverse;
    }
    .qr-code {
      width: 120px;
      height: 120px;
    }
    .approval-text {
      text-align: right;
      font-size: 12px;
      color: #4b5563;
    }
    .approval-link {
      color: #de4481;
      text-decoration: underline;
      font-weight: 600;
    }
    .currency {
      font-family: 'Noto Sans Hebrew', sans-serif;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header-container">
    <div class="header-left">
      ${logoUrl ? `
      <div class="logo-container">
        <img src="${logoUrl}" alt="${companyName}" class="logo-image" />
      </div>
      ` : `
      <div class="company-name">${companyName.toUpperCase()}</div>
      ${companyTagline ? `<div class="company-tagline">${companyTagline.toUpperCase()}</div>` : ''}
      `}
    </div>
    <div class="header-right">
      <h1>${quote.company.name}</h1>
      ${companyTagline ? `<div class="subtitle">${companyTagline}</div>` : ''}
      <div class="header-contact">
        ${vatId ? `
        <div class="header-contact-row">
          <span class="header-contact-label">עוסק מורשה:</span>
          <span class="header-contact-value">${vatId}</span>
        </div>
        ` : ''}
        ${address ? `
        <div class="header-contact-row">
          <span class="header-contact-label">כתובת:</span>
          <span class="header-contact-value">${address}</span>
        </div>
        ` : ''}
        ${phone ? `
        <div class="header-contact-row">
          <span class="header-contact-label">טלפון:</span>
          <span class="header-contact-value">${phone}</span>
        </div>
        ` : ''}
        ${email ? `
        <div class="header-contact-row">
          <span class="header-contact-label">דוא"ל:</span>
          <span class="header-contact-value">${email}</span>
        </div>
        ` : ''}
        ${website ? `
        <div class="header-contact-row">
          <span class="header-contact-label">אתר אינטרנט:</span>
          <span class="header-contact-value">${website}</span>
        </div>
        ` : ''}
      </div>
    </div>
  </div>
  
  <div class="content">
    <div class="doc-info">
      <div class="doc-date">${formatDate(quote.createdAt)}</div>
      <div class="doc-number">הצעת מחיר מספר ${quote.quoteNumber}</div>
      <div class="doc-copy">העתק נאמן למקור</div>
    </div>

    <div class="info-section">
      ${quote.lead ? `
      <div class="info-row">
        <span class="info-label">לכבוד:</span>
        <span class="info-value">${quote.lead.name}</span>
      </div>
      ${quote.lead.email ? `
      <div class="info-row">
        <span class="info-label">כתובת המייל:</span>
        <span class="info-value">${quote.lead.email}</span>
      </div>
      ` : ''}
      ${quote.lead.phone ? `
      <div class="info-row">
        <span class="info-label">טלפון:</span>
        <span class="info-value">${quote.lead.phone}</span>
      </div>
      ` : ''}
      ` : ''}
    </div>

    <div class="quote-title">${quote.title}</div>
    
    ${quote.description ? `
    <div class="quote-description">${quote.description}</div>
    ` : ''}

    <div class="items-section">
      <table class="items-table">
        <thead>
          <tr>
            <th>תיאור הפריט</th>
            <th>כמות</th>
            <th>מחיר</th>
            <th>סה״כ</th>
          </tr>
        </thead>
        <tbody>
          ${quote.items.map((item, index) => {
            const hasRichDescription = item.richDescription && item.richDescription.trim() && item.richDescription !== item.description
            const isIncluded = item.unitPrice === 0 && item.total === 0
            const priceText = isIncluded 
              ? 'כלול' 
              : formatCurrency(item.unitPrice)
            const totalText = isIncluded
              ? 'כלול'
              : formatCurrency(item.total)
            
            const priceCellClass = isIncluded ? 'item-unit-price-cell included' : 'item-unit-price-cell'
            const totalCellClass = isIncluded ? 'item-total-cell included' : 'item-total-cell'
            
            return `
            <tr>
              <td>
                <div class="item-title-cell">${item.description}</div>
                ${hasRichDescription ? `
                <div class="item-description-cell">${item.richDescription.replace(/\n/g, '<br>')}</div>
                ` : ''}
              </td>
              <td class="item-quantity-cell">${item.quantity}</td>
              <td class="${priceCellClass}">${priceText}</td>
              <td class="${totalCellClass}">${totalText}</td>
            </tr>
            `
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="summary">
      <div class="summary-row">
        <span class="summary-label">סכום ביניים:</span>
        <span class="summary-value currency">${formatCurrency(quote.subtotal)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">מע״מ (${quote.tax}%):</span>
        <span class="summary-value currency">${formatCurrency((quote.subtotal * (1 - quote.discount / 100)) * (quote.tax / 100))}</span>
      </div>
      ${quote.discount > 0 ? `
      <div class="summary-row discount-row">
        <div>
          <span class="discount-label">הנחה (${quote.discount}%):</span>
          ${quoteTemplate.discountReason ? `
          <div class="discount-reason">${quoteTemplate.discountReason}</div>
          ` : ''}
        </div>
        <span class="summary-value currency">-${formatCurrency(quote.subtotal * (quote.discount / 100))}</span>
      </div>
      ` : ''}
      <div class="summary-row total-row">
        <span class="total-label">סה״כ לתשלום:</span>
        <span class="total-value currency">${formatCurrency(quote.total)}</span>
      </div>
    </div>

    ${quote.notes || quote.terms ? `
    <div class="notes-terms-container">
      ${quote.notes ? `
      <div class="notes-section">
        <div class="section-title">הערות:</div>
        <div class="section-content">${quote.notes}</div>
      </div>
      ` : ''}
      ${quote.terms ? `
      <div class="terms-section">
        <div class="section-title">תנאים:</div>
        <div class="section-content">${quote.terms}</div>
      </div>
      ` : ''}
    </div>
    ` : ''}

    ${quote.signature ? `
    <div class="signature-section" style="margin-top: 40px; padding: 20px; background: #f9fafb; border-radius: 8px; page-break-inside: avoid;">
      <div class="section-title">חתימת לקוח:</div>
      <div style="margin-top: 15px; text-align: center;">
        <img src="${quote.signature}" alt="חתימת לקוח" style="max-width: 300px; max-height: 150px; border: 1px solid #e5e7eb; padding: 10px; background: white;" />
      </div>
      ${quote.signedAt ? `
      <div style="margin-top: 10px; text-align: center; color: #6b7280; font-size: 11px;">
        נחתם ב-${formatDate(quote.signedAt)}
      </div>
      ` : ''}
    </div>
    ` : `
    <div class="approval-section">
      <div class="approval-title">לאישור ההצעה סרקו את הברקוד או לחצו כאן</div>
      <div class="approval-content">
        ${qrCodeDataURL ? `<img src="${qrCodeDataURL}" alt="QR Code" class="qr-code" />` : ''}
        <div class="approval-text">
          <a href="${approveUrl}" class="approval-link" target="_blank">לחץ כאן לאישור ותשלום מקדמה</a>
        </div>
      </div>
    </div>
    `}

    <div class="footer">
      <div>הצעת מחיר זו הופקה על ידי <span class="brand-name">Quick invoice</span></div>
    </div>
  </div>
</body>
</html>
  `
}

export async function generateQuotePDF(quote: Quote): Promise<Buffer> {
  // יצירת URL לאישור
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const approveUrl = `${baseUrl}/quotes/${quote.id}/approve`
  
  // יצירת QR code
  const qrCodeDataURL = await generateQRCodeDataURL(approveUrl)
  
  const templateType = quote.templateType || 'simple'
  const html = templateType === 'professional' 
    ? generateProfessionalTemplate(quote, approveUrl, qrCodeDataURL)
    : generateSimpleTemplate(quote, approveUrl, qrCodeDataURL)

  try {
    const browser = await getBrowser()
    const page = await browser.newPage()
    
    try {
      // אופטימיזציה: משתמשים ב-domcontentloaded במקום networkidle0 - זה הרבה יותר מהיר
      await page.setContent(html, { 
        waitUntil: 'domcontentloaded',
        timeout: 10000
      })
      
      // מחכים קצת שהגופנים והסטיילים יטענו
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0'
        },
        preferCSSPageSize: false
      })

      return Buffer.from(pdfBuffer)
    } finally {
      // סוגרים את הדף אבל משאירים את הדפדפן פתוח לשימוש חוזר
      await page.close()
    }
  } catch (error) {
    console.error('Error generating PDF with Puppeteer:', error)
    // אם יש שגיאה, נסגור את הדפדפן ונאפשר יצירה מחדש
    if (browserInstance) {
      try {
        await browserInstance.close()
      } catch (e) {
        // ignore
      }
      browserInstance = null
      browserPromise = null
    }
    throw error
  }
}
