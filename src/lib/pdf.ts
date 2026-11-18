import QRCode from 'qrcode';
import type { jsPDF as JsPdfType } from 'jspdf';
import type { Invoice } from '../types';
import { calculateInvoice, formatDate, formatMoney, paymentQrString, roundMoney } from './invoice';
import regularFontUrl from '../assets/fonts/Roboto-Regular.ttf?url';
import boldFontUrl from '../assets/fonts/Roboto-Bold.ttf?url';

type Pdf = JsPdfType;

const PAGE_WIDTH = 210;
const MARGIN = 15;
const CONTENT_RIGHT = PAGE_WIDTH - MARGIN;
const CONTENT_WIDTH = CONTENT_RIGHT - MARGIN;
const FOOTER_Y = 281;
const CONTENT_BOTTOM = 266;

const INK: [number, number, number] = [31, 45, 40];
const MUTED: [number, number, number] = [89, 105, 98];
const GREEN: [number, number, number] = [32, 91, 76];
const LIGHT_GREEN: [number, number, number] = [236, 244, 240];
const LIGHT: [number, number, number] = [246, 248, 247];
const LINE: [number, number, number] = [220, 229, 224];
const WHITE: [number, number, number] = [255, 255, 255];

const fontCache = new Map<string, Promise<string>>();

function safeFilePart(value: string, fallback: string) {
  const part = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return part || fallback;
}

export function invoicePdfFilename(invoice: Invoice) {
  const number = safeFilePart(invoice.number, 'faktura');
  const client = safeFilePart(invoice.client.name, 'bez-odberatele');
  return `Faktura_${number}_${client}.pdf`;
}

async function loadFontBase64(url: string) {
  let cached = fontCache.get(url);
  if (!cached) {
    cached = fetch(url).then(async (response) => {
      if (!response.ok) throw new Error('Nepodařilo se načíst písmo pro PDF.');
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = '';
      const chunkSize = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
      }
      return btoa(binary);
    });
    fontCache.set(url, cached);
  }
  return cached;
}

function setColor(pdf: Pdf, color: [number, number, number], fill = false) {
  if (fill) pdf.setFillColor(...color);
  else pdf.setTextColor(...color);
}

function font(pdf: Pdf, size: number, weight: 'normal' | 'bold' = 'normal', color = INK) {
  pdf.setFont('Roboto', weight);
  pdf.setFontSize(size);
  setColor(pdf, color);
}

function horizontalRule(pdf: Pdf, y: number, color = LINE, width = 0.25) {
  pdf.setDrawColor(...color);
  pdf.setLineWidth(width);
  pdf.line(MARGIN, y, CONTENT_RIGHT, y);
}

function cleanMoney(value: number, currency: string) {
  return formatMoney(value, currency).replace(/\u00a0/g, ' ');
}

function fitFontSize(pdf: Pdf, text: string, maxWidth: number, size: number, minSize = 8) {
  let current = size;
  while (pdf.getTextWidth(text) > maxWidth && current > minSize) {
    current -= 0.5;
    pdf.setFontSize(current);
  }
  return current;
}

function partyAddress(party: Invoice['client']) {
  return [
    party.street,
    `${party.zip} ${party.city}`.trim(),
    party.country,
  ].filter(Boolean).flatMap((line) => line.split('\n'));
}

function drawDocumentHeader(pdf: Pdf, invoice: Invoice) {
  pdf.setFillColor(...GREEN);
  pdf.rect(0, 0, PAGE_WIDTH, 2.8, 'F');

  pdf.setFillColor(...GREEN);
  pdf.roundedRect(MARGIN, 13, 13.5, 13.5, 2.2, 2.2, 'F');
  pdf.setFillColor(...WHITE);
  pdf.roundedRect(MARGIN + 4, 16, 5.5, 7.2, 0.7, 0.7, 'F');
  pdf.setDrawColor(...GREEN);
  pdf.setLineWidth(0.45);
  pdf.line(MARGIN + 5.5, 18.4, MARGIN + 8, 18.4);
  pdf.line(MARGIN + 5.5, 20.1, MARGIN + 8, 20.1);
  pdf.line(MARGIN + 5.5, 21.8, MARGIN + 7.2, 21.8);

  font(pdf, 13, 'bold', GREEN);
  const supplierName = (pdf.splitTextToSize(invoice.supplier.name || 'Dodavatel', 112) as string[]).slice(0, 2);
  supplierName.forEach((line, index) => pdf.text(line, MARGIN + 17, 19 + index * 5));
  if (invoice.supplier.web) {
    font(pdf, 8.3, 'normal', MUTED);
    pdf.text(invoice.supplier.web, MARGIN + 17, 19 + supplierName.length * 5);
  }

  font(pdf, 8, 'bold', GREEN);
  pdf.text('FAKTURA', CONTENT_RIGHT, 15.5, { align: 'right' });
  font(pdf, 22, 'bold', GREEN);
  fitFontSize(pdf, invoice.number, 72, 22, 13);
  pdf.text(invoice.number, CONTENT_RIGHT, 27, { align: 'right' });
  font(pdf, 8.7, 'normal', MUTED);
  pdf.text(invoice.supplier.vatPayer ? 'Daňový doklad' : 'Doklad o poskytnutí služby', CONTENT_RIGHT, 33.5, { align: 'right' });

  horizontalRule(pdf, 39, GREEN, 0.7);
}

function drawParties(pdf: Pdf, invoice: Invoice) {
  font(pdf, 7.8, 'bold', MUTED);
  pdf.text('DODAVATEL', MARGIN, 49);
  pdf.text('ODBĚRATEL', 110, 49);
  let supplierEnd = 49;
  let clientEnd = 49;

  // Dodavatel
  let y = 56;
  font(pdf, 11, 'bold', INK);
  const supplierName = (pdf.splitTextToSize(invoice.supplier.name || 'Dodavatel', 82) as string[]).slice(0, 2);
  supplierName.forEach((line, index) => pdf.text(line, MARGIN, y + index * 5));
  y += Math.max(1, supplierName.length) * 5 + 2;
  font(pdf, 9.3, 'normal', MUTED);
  for (const line of partyAddress(invoice.supplier)) {
    for (const wrapped of pdf.splitTextToSize(line, 82)) {
      pdf.text(wrapped, MARGIN, y);
      y += 4.7;
    }
  }
  const supplierMeta = [invoice.supplier.ico && `IČO: ${invoice.supplier.ico}`, invoice.supplier.dic && `DIČ: ${invoice.supplier.dic}`].filter(Boolean).join('    ');
  if (supplierMeta) {
    y += 2;
    font(pdf, 8.8, 'normal', MUTED);
    pdf.text(supplierMeta, MARGIN, y);
    y += 4.5;
  }
  supplierEnd = y;

  // Odběratel
  y = 56;
  font(pdf, 11, 'bold', INK);
  const clientName = (pdf.splitTextToSize(invoice.client.name || '—', 82) as string[]).slice(0, 2);
  clientName.forEach((line, index) => pdf.text(line, 110, y + index * 5));
  y += Math.max(1, clientName.length) * 5 + 2;
  font(pdf, 9.3, 'normal', MUTED);
  for (const line of partyAddress(invoice.client)) {
    for (const wrapped of pdf.splitTextToSize(line, 82)) {
      pdf.text(wrapped, 110, y);
      y += 4.7;
    }
  }
  const clientMeta = [invoice.client.ico && `IČO: ${invoice.client.ico}`, invoice.client.dic && `DIČ: ${invoice.client.dic}`].filter(Boolean).join('    ');
  if (clientMeta) {
    y += 2;
    font(pdf, 8.8, 'normal', MUTED);
    pdf.text(clientMeta, 110, y);
    y += 4.5;
  }
  clientEnd = y;

  return Math.max(supplierEnd, clientEnd);
}

function drawDates(pdf: Pdf, invoice: Invoice, top: number) {
  const boxHeight = 21;
  pdf.setFillColor(...LIGHT);
  pdf.roundedRect(MARGIN, top, CONTENT_WIDTH, boxHeight, 1.4, 1.4, 'F');

  const labels = [
    'Datum vystavení',
    invoice.supplier.vatPayer ? 'Datum zdanitelného plnění' : 'Datum plnění',
    'Datum splatnosti',
    'Způsob úhrady',
  ];
  const values = [
    formatDate(invoice.issueDate),
    formatDate(invoice.taxDate),
    formatDate(invoice.dueDate),
    invoice.paymentMethod === 'bank' ? 'Bankovní převod' : 'Hotově',
  ];
  const cellWidth = CONTENT_WIDTH / 4;

  labels.forEach((label, index) => {
    const x = MARGIN + index * cellWidth + 4;
    if (index > 0) {
      pdf.setDrawColor(...LINE);
      pdf.setLineWidth(0.25);
      pdf.line(MARGIN + index * cellWidth, top + 4, MARGIN + index * cellWidth, top + boxHeight - 4);
    }
    font(pdf, 7.8, 'normal', MUTED);
    pdf.text(label, x, top + 7.3);
    font(pdf, 9.6, 'bold', INK);
    const maxWidth = cellWidth - 8;
    fitFontSize(pdf, values[index], maxWidth, 9.6, 7.5);
    pdf.text(values[index], x, top + 15.4);
  });

  return top + boxHeight + 9;
}

interface ItemColumns {
  descriptionX: number;
  descriptionWidth: number;
  quantityX: number;
  priceX: number;
  vatX: number;
  totalX: number;
  quantityHeaderX: number;
  priceHeaderX: number;
  vatHeaderX: number;
  totalHeaderX: number;
}

function itemColumns(isVatPayer: boolean): ItemColumns {
  return isVatPayer
    ? { descriptionX: MARGIN, descriptionWidth: 70, quantityX: 110, priceX: 139, vatX: 163, totalX: CONTENT_RIGHT, quantityHeaderX: 98, priceHeaderX: 126, vatHeaderX: 151, totalHeaderX: 181 }
    : { descriptionX: MARGIN, descriptionWidth: 92, quantityX: 133, priceX: 165, vatX: 0, totalX: CONTENT_RIGHT, quantityHeaderX: 120, priceHeaderX: 150, vatHeaderX: 0, totalHeaderX: 182 };
}

function drawTableHeader(pdf: Pdf, y: number, isVatPayer: boolean) {
  const columns = itemColumns(isVatPayer);
  pdf.setFillColor(...LIGHT_GREEN);
  pdf.rect(MARGIN, y, CONTENT_WIDTH, 8, 'F');
  font(pdf, 7.4, 'bold', MUTED);
  pdf.text('POPIS POLOŽKY', columns.descriptionX + 2, y + 5.3);
  pdf.text('MNOŽSTVÍ', columns.quantityHeaderX, y + 5.3, { align: 'center' });
  pdf.text('CENA / JEDN.', columns.priceHeaderX, y + 5.3, { align: 'center' });
  if (isVatPayer) pdf.text('DPH', columns.vatHeaderX, y + 5.3, { align: 'center' });
  pdf.text('CELKEM', columns.totalHeaderX, y + 5.3, { align: 'center' });
  return y + 8;
}

function drawContinuationHeader(pdf: Pdf, invoice: Invoice) {
  pdf.setFillColor(...GREEN);
  pdf.rect(0, 0, PAGE_WIDTH, 2.8, 'F');
  font(pdf, 10.5, 'bold', GREEN);
  pdf.text(invoice.supplier.name || 'Dodavatel', MARGIN, 17);
  font(pdf, 9, 'normal', MUTED);
  pdf.text(`Faktura ${invoice.number}`, CONTENT_RIGHT, 17, { align: 'right' });
  horizontalRule(pdf, 22, LINE);
  return 31;
}

function drawItemsTable(pdf: Pdf, invoice: Invoice, top: number) {
  const isVatPayer = invoice.supplier.vatPayer;
  const columns = itemColumns(isVatPayer);
  let y = drawTableHeader(pdf, top, isVatPayer);
  let rowIndex = 0;

  for (const item of invoice.items) {
    font(pdf, 9.5, 'normal', INK);
    const description = item.description || 'Položka faktury';
    const descriptionLines = pdf.splitTextToSize(description, columns.descriptionWidth) as string[];
    const rowHeight = Math.max(12, descriptionLines.length * 4.7 + 6);

    if (y + rowHeight > CONTENT_BOTTOM) {
      pdf.addPage();
      y = drawContinuationHeader(pdf, invoice);
      y = drawTableHeader(pdf, y, isVatPayer);
    }

    if (rowIndex % 2 === 1) {
      pdf.setFillColor(...LIGHT);
      pdf.rect(MARGIN, y, CONTENT_WIDTH, rowHeight, 'F');
    }

    font(pdf, 9.5, 'normal', INK);
    descriptionLines.forEach((line, index) => pdf.text(line, columns.descriptionX + 2, y + 6.2 + index * 4.7));

    const quantity = `${item.quantity.toLocaleString('cs-CZ')} ${item.unit}`.trim();
    font(pdf, 9.2, 'normal', MUTED);
    pdf.text(quantity, columns.quantityX, y + 6.2, { align: 'right' });
    const base = roundMoney(Math.max(0, item.quantity) * Math.max(0, item.unitPrice));
    font(pdf, 9.2, 'normal', MUTED);
    pdf.text(cleanMoney(item.unitPrice, invoice.currency), columns.priceX, y + 6.2, { align: 'right' });
    if (isVatPayer) {
      pdf.text(`${item.vatRate} %`, columns.vatX, y + 6.2, { align: 'right' });
    }
    font(pdf, 9.5, 'bold', INK);
    pdf.text(cleanMoney(base, invoice.currency), columns.totalX, y + 6.2, { align: 'right' });

    y += rowHeight;
    pdf.setDrawColor(...LINE);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN, y, CONTENT_RIGHT, y);
    rowIndex += 1;
  }

  return y;
}

function drawTotals(pdf: Pdf, invoice: Invoice, top: number) {
  const isVatPayer = invoice.supplier.vatPayer;
  const totals = calculateInvoice(invoice.items.map((item) => isVatPayer ? item : { ...item, vatRate: 0 as const }));
  const x = 123;
  const width = CONTENT_RIGHT - x;
  let currentY = top;

  if (isVatPayer) {
    font(pdf, 8.5, 'normal', MUTED);
    pdf.text('Základ daně', x, currentY);
    font(pdf, 8.5, 'bold', INK);
    pdf.text(cleanMoney(totals.subtotal, invoice.currency), CONTENT_RIGHT, currentY, { align: 'right' });
    currentY += 5.5;

    for (const group of totals.vatGroups.filter((entry) => entry.rate > 0)) {
      font(pdf, 8.5, 'normal', MUTED);
      pdf.text(`DPH ${group.rate} %`, x, currentY);
      font(pdf, 8.5, 'bold', INK);
      pdf.text(cleanMoney(group.vat, invoice.currency), CONTENT_RIGHT, currentY, { align: 'right' });
      currentY += 5.5;
    }
    currentY += 2;
  } else {
    font(pdf, 8.3, 'normal', MUTED);
    pdf.text('Nejsem plátcem DPH.', CONTENT_RIGHT, currentY, { align: 'right' });
    currentY += 5;
  }

  pdf.setFillColor(...GREEN);
  pdf.roundedRect(x, currentY, width, 29, 1.8, 1.8, 'F');
  font(pdf, 8.3, 'normal', WHITE);
  pdf.text('Celkem k úhradě', x + 4.5, currentY + 8);
  const amount = cleanMoney(totals.total, invoice.currency);
  font(pdf, 18, 'bold', WHITE);
  fitFontSize(pdf, amount, width - 9, 18, 10);
  pdf.text(amount, x + width - 4.5, currentY + 21.5, { align: 'right' });

  return currentY + 29;
}

function drawPayment(pdf: Pdf, invoice: Invoice, top: number, qrDataUrl: string | null) {
  let y = top;
  font(pdf, 7.8, 'bold', MUTED);
  pdf.text('PLATEBNÍ ÚDAJE', MARGIN, y);
  y += 7;

  if (invoice.paymentMethod === 'bank') {
    const rows = [
      ['Bankovní účet', invoice.supplier.bankAccount],
      invoice.supplier.iban ? ['IBAN', invoice.supplier.iban] : null,
      ['Variabilní symbol', invoice.variableSymbol],
      invoice.constantSymbol ? ['Konstantní symbol', invoice.constantSymbol] : null,
    ].filter((row): row is string[] => Boolean(row && row[1]));

    for (const [label, value] of rows) {
      font(pdf, 8.1, 'normal', MUTED);
      pdf.text(label, MARGIN, y);
      y += 4.1;
      font(pdf, 9.3, 'bold', INK);
      fitFontSize(pdf, value, 94, 9.3, 7.5);
      pdf.text(value, MARGIN, y);
      y += 5.4;
    }

    if (qrDataUrl) {
      y += 2;
      pdf.addImage(qrDataUrl, 'PNG', MARGIN, y, 29, 29, undefined, 'FAST');
      font(pdf, 9, 'bold', GREEN);
      pdf.text('QR platba', MARGIN + 33, y + 7);
      font(pdf, 8, 'normal', MUTED);
      pdf.text('Naskenujte kód', MARGIN + 33, y + 12);
      pdf.text('v bankovní aplikaci.', MARGIN + 33, y + 16.3);
      y += 29;
    }
  } else {
    font(pdf, 9.5, 'bold', INK);
    pdf.text('Úhrada hotově', MARGIN, y + 1);
    y += 10;
  }

  return y;
}

function wrapNote(pdf: Pdf, note: string, maxWidth: number) {
  font(pdf, 9.5, 'normal', INK);
  return pdf.splitTextToSize(note, maxWidth) as string[];
}

export interface InvoicePdfFile {
  filename: string;
  blob: Blob;
}

export async function createInvoicePdf(invoice: Invoice): Promise<InvoicePdfFile> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  const [regular, bold] = await Promise.all([
    loadFontBase64(regularFontUrl),
    loadFontBase64(boldFontUrl),
  ]);
  pdf.addFileToVFS('Roboto-Regular.ttf', regular);
  pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  pdf.addFileToVFS('Roboto-Bold.ttf', bold);
  pdf.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  pdf.setFont('Roboto', 'normal');

  drawDocumentHeader(pdf, invoice);
  const partiesEnd = drawParties(pdf, invoice);
  let y = drawDates(pdf, invoice, partiesEnd + 6);
  y = drawItemsTable(pdf, invoice, y);

  const qrData = paymentQrString(invoice);
  const qrDataUrl = qrData ? await QRCode.toDataURL(qrData, {
    width: 1000,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#173f35', light: '#ffffff' },
  }) : null;

  if (y + 78 > CONTENT_BOTTOM) {
    pdf.addPage();
    y = drawContinuationHeader(pdf, invoice);
  }
  const paymentTop = y + 11;
  const paymentEnd = drawPayment(pdf, invoice, paymentTop, qrDataUrl);
  const totalsEnd = drawTotals(pdf, invoice, paymentTop);
  y = Math.max(paymentEnd, totalsEnd) + 9;

  if (invoice.note) {
    const noteLines = wrapNote(pdf, invoice.note, CONTENT_WIDTH);
    if (y + 10 + noteLines.length * 4.7 > CONTENT_BOTTOM) {
      pdf.addPage();
      y = drawContinuationHeader(pdf, invoice);
    }
    font(pdf, 7.8, 'bold', MUTED);
    pdf.text('POZNÁMKA', MARGIN, y);
    y += 6;
    font(pdf, 9.5, 'normal', MUTED);
    for (const line of noteLines) {
      if (y > CONTENT_BOTTOM) {
        pdf.addPage();
        y = drawContinuationHeader(pdf, invoice);
        font(pdf, 9.5, 'normal', MUTED);
      }
      pdf.text(line, MARGIN, y);
      y += 4.7;
    }
  }

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    horizontalRule(pdf, FOOTER_Y - 3, LINE);
    const contact = [invoice.supplier.email, invoice.supplier.phone].filter(Boolean).join('   ·   ');
    if (contact) {
      font(pdf, 8, 'normal', MUTED);
      pdf.text(contact, MARGIN, FOOTER_Y + 2);
    }
    font(pdf, 8, 'normal', MUTED);
    pdf.text(`Strana ${page} / ${pageCount}`, CONTENT_RIGHT, FOOTER_Y + 2, { align: 'right' });
  }

  pdf.setProperties({
    title: `Faktura ${invoice.number}`,
    subject: `Faktura pro ${invoice.client.name}`,
    author: invoice.supplier.name,
    creator: 'FakturaGen',
  });

  return {
    filename: invoicePdfFilename(invoice),
    blob: pdf.output('blob') as Blob,
  };
}

export function savePdfFile({ blob, filename }: InvoicePdfFile) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadInvoicePdf(invoice: Invoice) {
  const pdf = await createInvoicePdf(invoice);
  savePdfFile(pdf);
  return pdf.filename;
}
