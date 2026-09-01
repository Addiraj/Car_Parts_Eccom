if (typeof globalThis !== "undefined" && !(globalThis as any).DOMMatrix) {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m21 = 0; m22 = 1; m41 = 0; m42 = 0;
    constructor() {}
  };
}

import { getInvoiceSettings } from './cms.invoice.functions';

async function createPrinter() {
  const mVirtualFS = await import('pdfmake/js/virtual-fs.js');
  const mURLResolver = await import('pdfmake/js/URLResolver.js');
  const mPrinter = await import('pdfmake/js/Printer.js');

  const VFSClassOrInst = (mVirtualFS as any).default?.default || (mVirtualFS as any).default;
  const URLResolverClass = (mURLResolver as any).default?.default || (mURLResolver as any).default;
  const PrinterClass = (mPrinter as any).default?.default || (mPrinter as any).default;

  const vfs = typeof VFSClassOrInst === 'function' ? new VFSClassOrInst() : VFSClassOrInst;
  const urlResolver = new URLResolverClass(vfs);

  const fonts = {
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique'
    }
  };

  return new PrinterClass(fonts, vfs, urlResolver);
}

async function renderDocToBuffer(printer: any, docDefinition: any): Promise<Buffer> {
  const doc = await printer.createPdfKitDocument(docDefinition);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

async function getLogoElement(logoUrl: string, companyName: string, primaryColor: string) {
  if (!logoUrl) {
    return { text: companyName, fontSize: 20, bold: true, color: primaryColor };
  }
  if (logoUrl.startsWith('data:')) {
    return { image: logoUrl, width: 120 };
  }
  try {
    const resp = await fetch(logoUrl);
    const arrayBuffer = await resp.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = resp.headers.get('content-type') || 'image/png';
    return { image: `data:${mimeType};base64,${base64}`, width: 120 };
  } catch (e) {
    return { text: companyName, fontSize: 20, bold: true, color: primaryColor };
  }
}

export async function generateOrderInvoicePdf(order: any, items: any[]): Promise<Buffer> {
  const settings = await getInvoiceSettings();
  const printer = await createPrinter();
  const logoElement = await getLogoElement(settings.logoUrl, settings.companyName, settings.primaryColor);
  
  const docDefinition: any = {
    defaultStyle: {
      font: 'Helvetica',
      fontSize: 10,
    },
    content: [
      {
        columns: [
          logoElement,
          {
            text: [
              { text: 'TAX INVOICE\n', fontSize: 20, bold: true, alignment: 'right', color: settings.primaryColor },
              { text: `Invoice #: ${order.order_number}\n`, alignment: 'right' },
              { text: `Date: ${new Date(order.created_at).toLocaleDateString()}\n`, alignment: 'right' },
            ]
          }
        ]
      },
      { text: '\n' },
      {
        columns: [
          {
            text: [
              { text: 'From:\n', bold: true },
              `${settings.companyName}\n`,
              `${settings.companyAddress}\n`,
              `Phone: ${settings.companyPhone}\n`,
              `Email: ${settings.companyEmail}\n`,
              `TRN: ${settings.companyTrn}\n`
            ]
          },
          {
            text: [
              { text: 'To:\n', bold: true },
              `${order.shipping_address?.full_name || 'Customer'}\n`,
              `${order.shipping_address?.address || ''}\n`,
              `${order.shipping_address?.city || ''}, ${order.shipping_address?.emirate || ''}\n`,
              `Phone: ${order.shipping_address?.phone || ''}\n`,
            ]
          }
        ]
      },
      { text: '\n\n' },
      settings.headerText ? { text: settings.headerText, margin: [0, 0, 0, 10], color: settings.primaryColor, bold: true } : null,
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Description', bold: true, fillColor: settings.primaryColor, color: '#ffffff' },
              { text: 'Qty', bold: true, fillColor: settings.primaryColor, color: '#ffffff' },
              { text: 'Unit Price', bold: true, fillColor: settings.primaryColor, color: '#ffffff' },
              { text: 'Total', bold: true, fillColor: settings.primaryColor, color: '#ffffff' }
            ],
            ...items.map(item => [
              item.part_name || item.part_number,
              item.quantity.toString(),
              `${order.currency} ${Number(item.unit_price).toFixed(2)}`,
              `${order.currency} ${(item.quantity * Number(item.unit_price)).toFixed(2)}`
            ]),
            [
              { text: 'Subtotal', colSpan: 3, alignment: 'right', border: [false, true, false, false] },
              {}, {},
              { text: `${order.currency} ${Number(order.subtotal).toFixed(2)}`, border: [false, true, false, false] }
            ],
            [
              { text: 'Discount', colSpan: 3, alignment: 'right', border: [false, false, false, false] },
              {}, {},
              { text: `-${order.currency} ${Number(order.discount_amount).toFixed(2)}`, border: [false, false, false, false] }
            ],
            [
              { text: 'Tax', colSpan: 3, alignment: 'right', border: [false, false, false, false] },
              {}, {},
              { text: `${order.currency} ${Number(order.tax_amount).toFixed(2)}`, border: [false, false, false, false] }
            ],
            [
              { text: 'Shipping', colSpan: 3, alignment: 'right', border: [false, false, false, false] },
              {}, {},
              { text: `${order.currency} ${Number(order.shipping_amount).toFixed(2)}`, border: [false, false, false, false] }
            ],
            [
              { text: 'Total', colSpan: 3, alignment: 'right', bold: true, border: [false, true, false, false] },
              {}, {},
              { text: `${order.currency} ${Number(order.total_amount).toFixed(2)}`, bold: true, border: [false, true, false, false] }
            ]
          ]
        }
      },
      { text: '\n\n' },
      { text: settings.footerText, alignment: 'center', fontSize: 9, color: 'gray', margin: [0, 40, 0, 0] }
    ]
  };

  return renderDocToBuffer(printer, docDefinition);
}

export async function generateQuotationPdf(quote: any, items: any[]): Promise<Buffer> {
  const settings = await getInvoiceSettings();
  const printer = await createPrinter();
  const logoElement = await getLogoElement(settings.logoUrl, settings.companyName, settings.primaryColor);
  
  const docDefinition: any = {
    defaultStyle: {
      font: 'Helvetica',
      fontSize: 10,
    },
    content: [
      {
        columns: [
          logoElement,
          {
            text: [
              { text: 'QUOTATION\n', fontSize: 20, bold: true, alignment: 'right', color: settings.primaryColor },
              { text: `Quote #: ${quote.quotation_number}\n`, alignment: 'right' },
              { text: `Date: ${new Date(quote.created_at).toLocaleDateString()}\n`, alignment: 'right' },
              { text: `Valid Until: ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : 'N/A'}\n`, alignment: 'right' },
            ]
          }
        ]
      },
      { text: '\n' },
      {
        columns: [
          {
            text: [
              { text: 'From:\n', bold: true },
              `${settings.companyName}\n`,
              `${settings.companyAddress}\n`,
              `Phone: ${settings.companyPhone}\n`,
              `Email: ${settings.companyEmail}\n`,
              `TRN: ${settings.companyTrn}\n`
            ]
          },
          {
            text: [
              { text: 'To:\n', bold: true },
              `${quote.customer_snapshot?.full_name || 'Customer'}\n`,
              `${quote.customer_snapshot?.address || ''}\n`,
              `Phone: ${quote.customer_snapshot?.phone || ''}\n`,
            ]
          }
        ]
      },
      { text: '\n\n' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Description', bold: true, fillColor: settings.primaryColor, color: '#ffffff' },
              { text: 'Qty', bold: true, fillColor: settings.primaryColor, color: '#ffffff' },
              { text: 'Unit Price', bold: true, fillColor: settings.primaryColor, color: '#ffffff' },
              { text: 'Total', bold: true, fillColor: settings.primaryColor, color: '#ffffff' }
            ],
            ...items.map(item => {
              const ps = item.part_snapshot || {};
              const name = ps.name || ps.part_number || item.part_name || item.part_number || 'Part Item';
              const qty = item.quantity ?? 1;
              const unitPrice = Number(item.custom_price ?? item.unit_price ?? 0);
              const lineTotal = Number(item.line_total ?? (qty * unitPrice));
              const currency = quote.currency || 'AED';
              return [
                name,
                qty.toString(),
                `${currency} ${unitPrice.toFixed(2)}`,
                `${currency} ${lineTotal.toFixed(2)}`
              ];
            }),
            [
              { text: 'Subtotal', colSpan: 3, alignment: 'right', border: [false, true, false, false] },
              {}, {},
              { text: `${quote.currency || 'AED'} ${Number(quote.subtotal || 0).toFixed(2)}`, border: [false, true, false, false] }
            ],
            [
              { text: 'Discount', colSpan: 3, alignment: 'right', border: [false, false, false, false] },
              {}, {},
              { text: `-${quote.currency || 'AED'} ${Number(quote.discount_amount || 0).toFixed(2)}`, border: [false, false, false, false] }
            ],
            [
              { text: 'Tax', colSpan: 3, alignment: 'right', border: [false, false, false, false] },
              {}, {},
              { text: `${quote.currency || 'AED'} ${Number(quote.tax_amount || 0).toFixed(2)}`, border: [false, false, false, false] }
            ],
            [
              { text: 'Shipping', colSpan: 3, alignment: 'right', border: [false, false, false, false] },
              {}, {},
              { text: `${quote.currency || 'AED'} ${Number(quote.shipping_amount || 0).toFixed(2)}`, border: [false, false, false, false] }
            ],
            [
              { text: 'Grand Total', colSpan: 3, alignment: 'right', bold: true, border: [false, true, false, false] },
              {}, {},
              { text: `${quote.currency || 'AED'} ${Number(quote.grand_total ?? quote.total_amount ?? 0).toFixed(2)}`, bold: true, border: [false, true, false, false] }
            ]
          ]
        }
      },
      { text: '\n\n' },
      { text: settings.footerText, alignment: 'center', fontSize: 9, color: 'gray', margin: [0, 40, 0, 0] }
    ]
  };

  return renderDocToBuffer(printer, docDefinition);
}
