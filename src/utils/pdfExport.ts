import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const BRAND = '#4f46e5';
const BRAND_DARK = '#1e1b4b';
const TEXT = '#0f172a';
const MUTED = '#64748b';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function drawLetterhead(doc: jsPDF, title: string, subtitle: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...hexToRgb(BRAND_DARK));
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('VPNS Consulting', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Gestion comptable OHADA - vpns-eight.vercel.app', 14, 21);

  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString('fr-FR'), pageWidth - 14, 14, { align: 'right' });

  doc.setTextColor(...hexToRgb(TEXT));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(title, 14, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...hexToRgb(MUTED));
  doc.text(subtitle, 14, 49);
}

function drawFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);
    doc.setFontSize(8);
    doc.setTextColor(...hexToRgb(MUTED));
    doc.text('Document genere automatiquement par VPNS Consulting', 14, pageHeight - 10);
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
  }
}

export function exportTableToPdf(options: {
  title: string;
  subtitle: string;
  columns: string[];
  rows: (string | number)[][];
  fileName: string;
  summary?: Array<{ label: string; value: string }>;
}) {
  const { title, subtitle, columns, rows, fileName, summary } = options;
  const doc = new jsPDF();
  drawLetterhead(doc, title, subtitle);

  let startY = 56;

  if (summary && summary.length > 0) {
    const boxWidth = (doc.internal.pageSize.getWidth() - 28 - (summary.length - 1) * 6) / summary.length;
    summary.forEach((item, i) => {
      const x = 14 + i * (boxWidth + 6);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, startY, boxWidth, 18, 2, 2, 'FD');
      doc.setFontSize(8);
      doc.setTextColor(...hexToRgb(MUTED));
      doc.text(item.label, x + 4, startY + 7);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...hexToRgb(TEXT));
      doc.text(item.value, x + 4, startY + 14);
      doc.setFont('helvetica', 'normal');
    });
    startY += 26;
  }

  autoTable(doc, {
    startY,
    head: [columns],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: hexToRgb(BRAND), textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 4 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  if (rows.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(...hexToRgb(MUTED));
    doc.text('Aucune donnee disponible pour le moment.', 14, startY + 12);
  }

  drawFooter(doc);
  doc.save(fileName);
}

export function exportInvoiceToPdf(invoice: {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  description: string;
  status: string;
}, client: { name: string; company: string; email: string; phone: string; address: string; city: string; taxId?: string } | undefined) {
  const doc = new jsPDF();
  drawLetterhead(doc, `Facture ${invoice.invoiceNumber}`, 'Facture professionnelle OHADA');

  doc.setFontSize(10);
  doc.setTextColor(...hexToRgb(TEXT));
  doc.setFont('helvetica', 'bold');
  doc.text('Facture a :', 14, 62);
  doc.setFont('helvetica', 'normal');
  doc.text(client?.company || 'Client', 14, 68);
  doc.text(client?.name || '-', 14, 73);
  doc.text(client?.address ? `${client.address}${client.city ? ', ' + client.city : ''}` : (client?.city || '-'), 14, 78);
  doc.text(client?.email || '-', 14, 83);
  doc.text(client?.phone || '-', 14, 88);
  if (client?.taxId) {
    doc.text(`IFU/RC : ${client.taxId}`, 14, 93);
  }

  const rightX = doc.internal.pageSize.getWidth() - 14;
  doc.setFont('helvetica', 'bold');
  doc.text('Details facture', rightX, 62, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Date : ${new Date(invoice.date).toLocaleDateString('fr-FR')}`, rightX, 68, { align: 'right' });
  doc.text(`Echeance : ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}`, rightX, 73, { align: 'right' });
  doc.text(`Statut : ${invoice.status}`, rightX, 78, { align: 'right' });

  autoTable(doc, {
    startY: 102,
    head: [['Description', 'Montant (FCFA)']],
    body: [[invoice.description || 'Prestation de services', invoice.amount.toLocaleString('fr-FR')]],
    theme: 'striped',
    headStyles: { fillColor: hexToRgb(BRAND), textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 6 },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total : ${invoice.amount.toLocaleString('fr-FR')} FCFA`, rightX, finalY, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb(MUTED));
  doc.text('Paiement a effectuer avant la date d\'echeance indiquee ci-dessus.', 14, finalY + 16);
  doc.text('Merci de votre confiance.', 14, finalY + 22);

  drawFooter(doc);
  doc.save(`${invoice.invoiceNumber}.pdf`);
}
