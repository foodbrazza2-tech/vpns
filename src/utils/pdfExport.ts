import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { montantEnLettresFcfa } from './numberToWordsFr';
import { formatNumberFr } from './format';

const BRAND = '#4f46e5';
const BRAND_DARK = '#1e1b4b';
const TEXT = '#0f172a';
const MUTED = '#64748b';

// Identite visuelle du modele de facture officiel VPNS Consulting (calquee sur
// le modele papier fourni par l'utilisateur : bandeau violet, barre "FACTURE"
// bleu marine, encadre client, tableau LIBELLE/P.U/Total, montant en lettres).
const INVOICE_PURPLE = '#7c5fc7';
const INVOICE_NAVY = '#173355';
const INVOICE_LOGO_BLUE = '#a9d6f5';

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

// Reproduit le modele de facture officiel VPNS Consulting (bandeau violet,
// barre "FACTURE N°..." bleu marine, encadre "DOIT", tableau LIBELLE/P.U/Total,
// montant en toutes lettres, bloc signature "LE GERANT").
export function exportInvoiceToPdf(invoice: {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  amountHt?: number;
  vatRate?: number;
  vatAmount?: number;
  description: string;
  status: string;
}, client: { name: string; company: string; email: string; phone: string; address: string; city: string; taxId?: string } | undefined) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - 14;

  // ── Bandeau d'en-tete (violet) : logo + coordonnees legales ──
  doc.setFillColor(...hexToRgb(INVOICE_PURPLE));
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(...hexToRgb(INVOICE_LOGO_BLUE));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.text('VPNS', 14, 20);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 24, 62, 6, 1, 1, 'F');
  doc.setTextColor(...hexToRgb(INVOICE_NAVY));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Suivi & Accompagnement des PME', 17, 28.2);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('E-MAIL :', rightX - 55, 9);
  doc.setFont('helvetica', 'normal');
  doc.text('vpnscontacts@gmail.com', rightX, 9, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text('TEL :', rightX - 55, 15);
  doc.setFont('helvetica', 'normal');
  doc.text('06 613 53 11 / 06 537 07 38', rightX, 15, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text('NIU :', rightX - 55, 21);
  doc.setFont('helvetica', 'normal');
  doc.text('P2018110005078220', rightX, 21, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text('RCCM :', rightX - 55, 27);
  doc.setFont('helvetica', 'normal');
  doc.text('CG /BZV/18 A 23443', rightX, 27, { align: 'right' });

  // ── Barre de titre (bleu marine) ──
  doc.setFillColor(...hexToRgb(INVOICE_NAVY));
  doc.rect(0, 32, pageWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`FACTURE N°${invoice.invoiceNumber}`, 14, 39);

  // ── Date / DOIT (gauche) + encadre client (droite) ──
  doc.setTextColor(...hexToRgb(TEXT));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`DU : ${new Date(invoice.date).toLocaleDateString('fr-FR')}`, 14, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('DOIT :', 30, 62);

  const boxX = 100;
  const boxWidth = pageWidth - 14 - boxX;
  doc.setDrawColor(...hexToRgb(TEXT));
  doc.rect(boxX, 47, boxWidth, 22);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`CLIENT: ${(client?.company || client?.name || 'Client').toUpperCase()}`, boxX + 3, 53);
  doc.text(`TEL: ${client?.phone || '-'}`, boxX + 3, 59);
  doc.text(`${(client?.city || 'BRAZZAVILLE').toUpperCase()} REP. DU CONGO`, boxX + 3, 65);

  // ── Motif ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Motif :', 14, 78);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.description || 'Prestation de services', 30, 78);

  // ── Tableau LIBELLE / P.U / Total (+ TVA si applicable) ──
  const ht = invoice.amountHt != null ? invoice.amountHt : invoice.amount;
  const vat = invoice.vatAmount != null ? invoice.vatAmount : 0;
  const rate = invoice.vatRate != null ? invoice.vatRate : 0;

  const body: (string | number)[][] = [[invoice.description || 'Prestation de services', formatNumberFr(ht), formatNumberFr(ht)]];
  if (vat > 0) {
    body.push([`TVA (${rate}%)`, '-', formatNumberFr(vat)]);
  }

  autoTable(doc, {
    startY: 86,
    head: [['LIBELLE', 'P. U', 'Total']],
    body,
    foot: [['TOTAL', '', formatNumberFr(invoice.amount)]],
    theme: 'grid',
    headStyles: { fillColor: [216, 216, 216], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [255, 255, 255], textColor: [15, 23, 42], fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'center', cellWidth: 30 }, 2: { halign: 'center', cellWidth: 30 } },
    styles: { fontSize: 9, cellPadding: 5, lineColor: [15, 23, 42], lineWidth: 0.2 },
  });

  const afterTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // autoTable laisse parfois l'espacement des caracteres (Tc) altere dans
  // l'etat graphique du document - on le remet a zero avant tout texte libre.
  (doc as unknown as { setCharSpace: (space: number) => void }).setCharSpace(0);

  // ── Montant en toutes lettres ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...hexToRgb(TEXT));
  const prefix = 'Arretee la presente facture a la somme de : ';
  doc.text(prefix, 14, afterTableY);
  doc.setFont('helvetica', 'bold');
  doc.text(montantEnLettresFcfa(invoice.amount), 14 + doc.getTextWidth(prefix), afterTableY);

  // ── Signature (ligne vierge pour signature manuscrite - jamais generee) ──
  const sigY = afterTableY + 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('LE GERANT', rightX, sigY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Edson KIMANI', rightX, sigY + 18, { align: 'right' });

  // ── Pied de page ──
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...hexToRgb(INVOICE_PURPLE));
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);

  doc.save(`${invoice.invoiceNumber.replace(/\//g, '-')}.pdf`);
}
