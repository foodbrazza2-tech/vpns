# 🤖 Génération Automatique IA de Documents

## 🎯 Vision Générale

La **partie intelligente** de l'application doit être capable de générer **automatiquement et intelligemment** :

- 📄 **Factures** - Basées sur les infos client + modèle
- 📋 **Devis** - Avec articles/services estimés
- ✉️ **Courriers** - Relances, confirmations, etc.
- 📊 **Rapports** - Comptabilité, ventes, dépenses
- 📑 **Documents comptables** - Journaux, bilans, etc.

## 🏗️ Architecture de la Solution

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INPUT                            │
├─────────────────────────────────────────────────────────────┤
│  Client → Sélection Service → Montant → Détails            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  Modals Spécifiques    │
        │  (InvoiceModal, etc.)  │
        └────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────────┐
    │  AI/Smart Generation Engine    │
    ├────────────────────────────────┤
    │ • Récupère les infos client    │
    │ • Applique les modèles         │
    │ • Génère le contenu            │
    │ • Formate le document          │
    └────────┬───────────────────────┘
             │
             ▼
    ┌────────────────────────────────┐
    │  Document Generator            │
    ├────────────────────────────────┤
    │ • PDF generation               │
    │ • Formattage professionnel     │
    │ • Codes QR, numérotation       │
    └────────┬───────────────────────┘
             │
             ▼
    ┌────────────────────────────────┐
    │  Archive & Distribution        │
    ├────────────────────────────────┤
    │ • Sauvegarde du PDF            │
    │ • Email au client              │
    │ • Stockage archivé             │
    └────────────────────────────────┘
```

---

## 📝 1. GÉNÉRATION DE FACTURES

### Données d'Entrée

```typescript
interface FactureGenerationData {
  clientId: string;              // Client associé
  invoiceNumber: string;         // FAC-2026-001
  date: string;                  // 2026-07-05
  dueDate: string;               // 2026-08-05
  items: Array<{
    description: string;         // "Service de conseil"
    quantity: number;             // 5
    unitPrice: number;           // 50000
  }>;
  taxRate?: number;              // 19.25% (TVA OHADA)
  notes?: string;                // Conditions de paiement
  currency?: string;             // FCFA
}
```

### Données Client (depuis DB)

```typescript
{
  company: "EEC Cameroun SARL",
  email: "client@eec.cm",
  phone: "+237 6XX XX XX XX",
  address: "123 Rue de la Paix",
  city: "Douala",
  taxId: "RC/SND/2021/A 12345",
  
  // NOTRE ENTREPRISE
  myCompanyName: "VPNS Consulting",
  myCompanyAddress: "BP 1234 Douala",
  myCompanyTaxId: "RC/SND/2026/B 98765",
  myCompanyBank: "Bank of Cameroon - Account: 123456789"
}
```

### Génération Automatique

**L'IA va:**
1. ✅ Récupérer les infos du client
2. ✅ Appliquer le modèle de facture (en-tête, pied de page)
3. ✅ Calculer les montants (sous-total, TVA, total)
4. ✅ Ajouter conditions de paiement standard
5. ✅ Générer le PDF professionnel
6. ✅ Créer un code QR pour tracabilité
7. ✅ Archiver automatiquement

```typescript
// Exemple de texte généré automatiquement
const facturePDF = await generateFacture({
  ...invoiceData,
  // L'IA ajoute automatiquement:
  generatedAt: new Date(),
  reference: "RÉF: EEC-VPNS-2026-001",  // Auto-numéroté
  paymentTerms: "Paiement à 30 jours fin de mois",
  bankDetails: "Bank of Cameroon - 123456789",
  qrCode: generateQRCode(invoiceNumber),
});
```

---

## 🎯 2. GÉNÉRATION DE DEVIS

### Différence avec Facture

```
DEVIS vs FACTURE:
Devis = Proposition commerciale (non payante)
Facture = Document de facturation (légalement exécutoire)
```

### Génération Automatique

```typescript
interface QuoteGenerationData {
  clientId: string;
  quoteNumber: string;          // DEV-2026-001
  items: Array<{
    service: string;
    description: string;
    estimatedHours?: number;
    hourlyRate?: number;
    flatPrice?: number;
  }>;
  validityDays: number;          // Valable 30 jours
  nextSteps?: string;            // "Envoyez à nouveau avant 05/08"
}
```

**L'IA va:**
1. Générer un numéro de devis auto-incrémenté
2. Ajouter une date de validité
3. Inclure une clause "Acceptation"
4. Proposer un CTA (Call-To-Action) pour conversion en facture
5. Suggérer les conditions de paiement (acompte, etc.)

```typescript
const generatedQuote = `
DEVIS DEV-2026-001

Client: EEC Cameroun
Date: 05/07/2026
Valable jusqu'au: 04/08/2026

SERVICES PROPOSÉS:
- Audit comptable initial: 500,000 FCFA
- Formation OHADA: 300,000 FCFA
- Support annuel: 1,500,000 FCFA

TOTAL: 2,300,000 FCFA

CONDITIONS:
- Acompte 30% requis à la commande
- Solde avant livraison
- Garantie 1 an

Acceptation: client@eec.cm
`;
```

---

## ✉️ 3. GÉNÉRATION DE COURRIERS

### Types de Courriers Automatiques

```
1. RELANCE (Email + Lettre)
   - Relance facture impayée
   - Relance 15j, 30j, 60j, 90j
   - Ton escaladant automatiquement

2. CONFIRMATION
   - Confirmation de commande
   - Confirmation de réception

3. RAPPEL
   - Rappel RDV
   - Rappel renouvellement contrat

4. NOTIFICATION
   - Nouveau service disponible
   - Promotion spéciale

5. JUSTIFICATION
   - Récapitulatif transactions
   - Attestation de paiement
```

### Exemple: Courrier de Relance Automatique

```typescript
interface ReminderLetterData {
  clientId: string;
  invoiceNumber: string;
  daysOverdue: number;           // 30, 60, 90
  remainingBalance: number;
  dueDate: string;
}

// Génération intelligente
const letter = generateReminderLetter({
  clientName: "EEC Cameroun",
  invoiceAmount: 500000,
  daysOverdue: 30,
  dueDate: "04/07/2026",
});

// Résultat:
`
Douala, le 05/08/2026

À: EEC Cameroun
    123 Rue de la Paix
    Douala

Objet: Rappel de paiement - Facture FAC-2026-001

Cher Partenaire,

Nous vous adressons cette correspondance concernant la facturation 
en suspens depuis 30 jours.

Facture: FAC-2026-001
Montant: 500,000 FCFA
Date d'échéance: 04/07/2026
Montant restant dû: 500,000 FCFA

Nous vous demandons de régulariser cette situation dans les 7 jours.

Coordonnées bancaires:
Bank of Cameroon - Compte: 123456789

Merci de votre attention.

Cordialement,
VPNS Consulting
${generateSignature()}
`;
```

---

## 📊 4. GÉNÉRATION DE RAPPORTS

### Types de Rapports

```
1. RAPPORTS COMPTABLES
   - Journal général
   - Grand livre
   - Balance
   - Bilan de fin d'exercice
   - Compte de résultat

2. RAPPORTS COMMERCIAUX
   - CA par client
   - CA par service
   - Évolution mensuelle

3. RAPPORTS ANALYTIQUES
   - Dépenses par catégorie
   - ROI par projet
   - Rentabilité client

4. RAPPORTS IMPÔTS
   - Déclaration TVA
   - Déclaration impôt sur le revenu
   - Statistiques fiscales
```

### Exemple: Rapport de Synthèse Mensuel

```typescript
interface MonthlyReportData {
  month: string;                 // "Juillet 2026"
  invoiceCount: number;
  invoiceTotal: number;
  expenseCount: number;
  expenseTotal: number;
  clientsActive: number;
  profitMargin: number;
}

// Génération du rapport
const monthlyReport = generateMonthlyReport({
  month: "Juillet 2026",
  data: [
    { date: "01/07", invoices: 5, amount: 1500000, expenses: 300000 },
    { date: "15/07", invoices: 3, amount: 900000, expenses: 200000 },
    { date: "31/07", invoices: 2, amount: 600000, expenses: 150000 },
  ]
});

// Résultat: 
`
RAPPORT MENSUEL - JUILLET 2026

RÉSUMÉ EXÉCUTIF:
- Chiffre d'affaires: 3,000,000 FCFA
- Dépenses: 650,000 FCFA
- Bénéfice net: 2,350,000 FCFA
- Marge: 78.3%

FACTURES:
- Nombre: 10 factures
- Montant: 3,000,000 FCFA
- Clients actifs: 5
- Ticket moyen: 300,000 FCFA

DÉPENSES:
- Nombre: 15 entrées
- Montant: 650,000 FCFA
- Principales: Fournitures (300k), Services (350k)

ÉVOLUTION:
- vs Juin 2026: +15%
- vs Juillet 2025: +45%

[GRAPHIQUE: Courbe évolution]
[TABLEAU: Détail par client]
[TABLEAU: Détail par catégorie]

Générée le: 05/08/2026 à 14:32
Par: VPNS Consulting
`;
```

---

## 📑 5. DOCUMENTS COMPTABLES OHADA

### Automatisation Comptable

```
1. JOURNAL QUOTIDIEN
   - Auto-génération à partir des écritures saisies
   - Numérotation séquentielle
   - Date-heure de saisie
   - Références croisées

2. GRAND LIVRE (Par compte)
   - Solde ouverture
   - Mouvements débit/crédit
   - Solde de clôture
   - Balance

3. BALANCE GÉNÉRALE
   - Tous les comptes
   - Soldes débit/crédit
   - Montants en FCFA

4. ÉTATS FINANCIERS
   - Bilan
   - Compte de résultat
   - Flux de trésorerie (simple)

5. DÉCLARATIONS FISCALES
   - TVA mensuelle
   - Résumé comptable annuel
   - Liasse fiscale
```

### Exemple: Grand Livre Généré Automatiquement

```typescript
interface GLGenerationData {
  accountCode: string;           // "401" (Fournisseurs)
  startDate: string;
  endDate: string;
}

const grandLivre = generateGrandLivre({
  account: "401 - Fournisseurs",
  period: "Juillet 2026",
  openingBalance: 1500000,
  entries: [
    { date: "05/07", description: "Facture FNR-0001", debit: 500000, credit: 0 },
    { date: "10/07", description: "Paiement FNR-0001", debit: 0, credit: 500000 },
    { date: "20/07", description: "Facture FNR-0002", debit: 800000, credit: 0 },
  ]
});

// Résultat:
`
GRAND LIVRE - COMPTE 401 - FOURNISSEURS
Période: Juillet 2026

Solde d'ouverture: 1,500,000 FCFA

DATE        REF         DESCRIPTION              DÉBIT        CRÉDIT      SOLDE
----        ---         -----------              -----        ------      -----
           REPORT                                                     1,500,000
05/07      FNR-0001    Facture Fournisseur    500,000                 2,000,000
10/07      CHQ-0125    Paiement FNR-0001                   500,000    1,500,000
20/07      FNR-0002    Facture Fournisseur    800,000                 2,300,000
31/07      BAL         Balance                                        2,300,000

TOTAUX                                         1,300,000    500,000    2,300,000
`;
```

---

## 🔧 Architecture Technique

### Services IA Nécessaires

```typescript
// service/aiDocumentGenerator.ts

interface AIGeneratorService {
  // Factures
  generateInvoice(data: InvoiceData): Promise<PDFBuffer>;
  
  // Devis
  generateQuote(data: QuoteData): Promise<PDFBuffer>;
  
  // Courriers
  generateReminderLetter(data: ReminderData): Promise<string>;
  generateConfirmationLetter(data: ConfirmationData): Promise<string>;
  
  // Rapports
  generateMonthlyReport(data: MonthlyReportData): Promise<PDFBuffer>;
  generateCustomReport(data: CustomReportData): Promise<PDFBuffer>;
  
  // Documents comptables
  generateGrandLivre(data: GLData): Promise<PDFBuffer>;
  generateBalance(data: BalanceData): Promise<PDFBuffer>;
  generateFinancialStatements(data: FSData): Promise<PDFBuffer>;
}

// Implémentation avec Templates + IA
export class AIDocumentGenerator implements AIGeneratorService {
  constructor(
    private templateEngine: TemplateEngine,    // Handlebars/Nunjucks
    private aiModel: OpenAI | Anthropic,       // Claude/GPT
    private pdfGenerator: PDFKit,              // PDF generation
    private archiveService: ArchiveService
  ) {}
  
  async generateInvoice(data: InvoiceData): Promise<PDFBuffer> {
    // 1. Enrichir les données
    const enrichedData = await this.enrichInvoiceData(data);
    
    // 2. Appliquer le template
    const htmlContent = this.templateEngine.render('invoice.html', enrichedData);
    
    // 3. Générer PDF
    const pdf = await this.pdfGenerator.fromHTML(htmlContent);
    
    // 4. Archiver
    await this.archiveService.save(pdf, data.clientId, 'Factures');
    
    return pdf;
  }
  
  private async enrichInvoiceData(data: InvoiceData) {
    // IA enrichit les données
    const suggestions = await this.aiModel.complete(`
      Basé sur cette facture:
      - Client: ${data.clientId}
      - Services: ${data.items}
      
      Suggère:
      1. Conditions de paiement appropriées
      2. Clauses standard
      3. Termes commerciaux
    `);
    
    return {
      ...data,
      suggestedTerms: suggestions,
      generatedAt: new Date(),
    };
  }
}
```

---

## 🎯 Étapes d'Implémentation

### Phase 1: Factures & Devis
1. [ ] Créer templates Handlebars
2. [ ] Implémenter PDF generation
3. [ ] Intégrer avec InvoiceModal
4. [ ] Archivage automatique
5. [ ] Tests

### Phase 2: Courriers
1. [ ] Templates de courriers (relance, confirmation)
2. [ ] IA pour personnalisation
3. [ ] Email integration
4. [ ] Historique des envois

### Phase 3: Rapports
1. [ ] Extraction de données
2. [ ] Templates de rapports
3. [ ] Graphiques et visualisations
4. [ ] Export (PDF, Excel)

### Phase 4: Documents Comptables
1. [ ] Génération grand livre
2. [ ] Balance automatique
3. [ ] États financiers
4. [ ] Déclarations fiscales

---

## 📦 Dépendances Recommandées

```json
{
  "dependencies": {
    "pdfkit": "^0.14.0",                    // PDF generation
    "handlebars": "^4.7.0",                 // Templates
    "chart.js": "^4.4.0",                   // Graphiques
    "jspdf": "^2.5.0",                      // PDF alternative
    "docx": "^8.10.0",                      // Document generation
    "node-xlsx": "^0.18.0",                 // Excel export
    "openai": "^4.0.0",                     // OpenAI API (optional)
    "@anthropic-ai/sdk": "^0.8.0"           // Claude API (optional)
  }
}
```

---

## 🚀 Mockup: Interface IA

```
┌─────────────────────────────────────────────────┐
│ 🤖 GÉNÉRATEUR INTELLIGENT DE DOCUMENTS          │
├─────────────────────────────────────────────────┤
│                                                  │
│ Sélectionner un document à générer:             │
│ ○ Facture                                        │
│ ○ Devis                                          │
│ ○ Courrier de relance                           │
│ ○ Rapport mensuel                               │
│ ○ Grand livre                                    │
│                                                  │
│ [Continuer →]                                   │
│                                                  │
└─────────────────────────────────────────────────┘

↓ (après sélection)

┌─────────────────────────────────────────────────┐
│ 🤖 FACTURE INTELLIGENTE                         │
├─────────────────────────────────────────────────┤
│                                                  │
│ Informations pré-remplies:                      │
│ ✓ Client: EEC Cameroun                          │
│ ✓ Numéro: FAC-2026-001 (auto)                  │
│ ✓ Date: 05/07/2026                            │
│ ✓ Conditions: 30 jours (suggéré)               │
│                                                  │
│ Aperçu:                                         │
│ ┌────────────────────────────────────┐         │
│ │ FACTURE FAC-2026-001               │         │
│ │                                    │         │
│ │ Client: EEC Cameroun               │         │
│ │ Date: 05/07/2026                  │         │
│ │ Échéance: 04/08/2026              │         │
│ │                                    │         │
│ │ Services: 5 items                 │         │
│ │ Total: 2,300,000 FCFA             │         │
│ │ TVA (19.25%): 442,750 FCFA        │         │
│ │ TOTAL: 2,742,750 FCFA             │         │
│ │                                    │         │
│ └────────────────────────────────────┘         │
│                                                  │
│ [Éditer]  [Générer PDF]  [Envoyer Email]       │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## ✅ Checklist

- [ ] IA sélectionne les bonnes données
- [ ] Templates sont modulables
- [ ] Documents générés automatiquement
- [ ] PDFs professionnels
- [ ] Archivage automatique
- [ ] Email d'envoi auto
- [ ] Numérotation séquentielle
- [ ] Codes QR pour traçabilité
- [ ] Export Excel possible
- [ ] Signature numérique (optionnel)

---

**État d'implémentation:** 🟡 Prêt pour phase 1 (Factures & Devis)
