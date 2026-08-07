// Fonction serveur (Vercel Edge Function) : seul point de passage vers l'API
// Gemini. La cle GEMINI_API_KEY vit uniquement ici (variable d'environnement
// serveur) et n'est jamais exposee au navigateur - le client n'envoie que le
// message de l'utilisateur, l'historique de conversation, et un contexte
// texte compact (clients, factures recentes, soldes) deja en memoire cote app.
export const config = { runtime: 'edge' };

// Runtime Edge : pas de types Node ambiants ici (on evite volontairement
// @types/node pour ne pas laisser fuiter des globals Node qui n'existent pas
// dans ce runtime) - Vercel expose quand meme process.env pour les variables
// declarees dans le dashboard.
declare const process: { env: Record<string, string | undefined> };

// Alias "latest" plutot qu'une version datee : evite de se retrouver avec un
// modele retire pour les nouveaux comptes (ex: gemini-2.5-flash, qui a cesse
// d'etre accessible aux nouvelles cles API).
const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Meme identifiant unique autorise que authService.ts cote client - cette
// route etant publique (n'importe qui connaissant l'URL peut l'appeler), elle
// doit revalider elle-meme que l'appelant est bien Edson connecte, sinon
// n'importe qui pourrait consommer le quota Gemini paye sur son compte.
const ALLOWED_EMAIL = 'edson@gmail.com';

// Verifie le jeton Supabase envoye par le client aupres de l'API Auth de
// Supabase elle-meme (avec la cle publique anon) - pas besoin de cle secrete
// service-role pour ca, juste confirmer que le jeton est valide et associe
// au bon compte.
async function verifyCaller(authHeader: string | null): Promise<boolean> {
  if (!authHeader) return false;
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return false;

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: anonKey },
    });
    if (!res.ok) return false;
    const user = await res.json();
    return typeof user?.email === 'string' && user.email.trim().toLowerCase() === ALLOWED_EMAIL;
  } catch {
    return false;
  }
}

interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

// Chaque outil correspond a une action reelle deja geree par businessDataService
// cote client (createClient, createInvoice, createAccountingEntry, createEvent).
// Le modele ne touche jamais la base directement : il decide QUOI faire, le
// client execute avec le code deja teste du reste de l'application.
const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'create_client',
        description: 'Cree une nouvelle fiche client (ou fournisseur) dans VPNS Consulting.',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING', description: 'Nom du contact' },
            company: { type: 'STRING', description: "Nom de l'entreprise/societe" },
            email: { type: 'STRING' },
            phone: { type: 'STRING' },
            address: { type: 'STRING' },
            city: { type: 'STRING' },
            taxId: { type: 'STRING', description: 'NIU ou numero fiscal si connu' },
          },
          required: ['name'],
        },
      },
      {
        name: 'create_invoice',
        description:
          "Redige et enregistre une facture, comptabilisee automatiquement dans le bon journal. type='vente' si VPNS facture un client, type='achat' si c'est une depense/facture recue d'un fournisseur.",
        parameters: {
          type: 'OBJECT',
          properties: {
            clientName: { type: 'STRING', description: 'Nom du client ou fournisseur (recherche approximative dans la liste fournie en contexte)' },
            type: { type: 'STRING', enum: ['vente', 'achat'] },
            amountHt: { type: 'NUMBER', description: 'Montant hors taxes en FCFA' },
            vatRate: { type: 'NUMBER', description: 'Taux de TVA en pourcentage : 18 par defaut, 0 si exonere' },
            description: { type: 'STRING', description: 'Motif / objet de la facture' },
            date: { type: 'STRING', description: "Date au format AAAA-MM-JJ (aujourd'hui par defaut si non precisee)" },
          },
          required: ['clientName', 'type', 'amountHt', 'description'],
        },
      },
      {
        name: 'record_expense',
        description: "Enregistre rapidement une depense/charge (ticket, frais divers) sans creer de facture formelle.",
        parameters: {
          type: 'OBJECT',
          properties: {
            amount: { type: 'NUMBER', description: 'Montant en FCFA' },
            description: { type: 'STRING' },
            method: { type: 'STRING', enum: ['especes', 'virement'], description: 'especes par defaut' },
            date: { type: 'STRING', description: "AAAA-MM-JJ, aujourd'hui par defaut" },
          },
          required: ['amount', 'description'],
        },
      },
      {
        name: 'create_appointment',
        description: "Planifie un rendez-vous ou un rappel dans l'agenda.",
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            date: { type: 'STRING', description: 'AAAA-MM-JJ' },
            time: { type: 'STRING', description: 'HH:MM, 09:00 par defaut' },
            clientName: { type: 'STRING' },
            type: { type: 'STRING', enum: ['meeting', 'call', 'reminder', 'followup'] },
          },
          required: ['title', 'date'],
        },
      },
      {
        name: 'record_payslip',
        description: "Enregistre une fiche de paye (bulletin de salaire) en charge de personnel - PAS une facture.",
        parameters: {
          type: 'OBJECT',
          properties: {
            amount: { type: 'NUMBER', description: 'Montant net paye en FCFA' },
            description: { type: 'STRING', description: 'Ex: Salaire juin 2026 - nom employe' },
            method: { type: 'STRING', enum: ['especes', 'virement'] },
            date: { type: 'STRING', description: "AAAA-MM-JJ, aujourd'hui par defaut" },
          },
          required: ['amount', 'description'],
        },
      },
      {
        name: 'import_bank_statement',
        description:
          "Un releve bancaire ou un cahier journal contient PLUSIEURS operations (pas une seule) - extrait-les TOUTES dans ce seul appel plutot que d'en traiter une par une. Les operations sont presentees a Edson pour validation rapide avant enregistrement (jamais postees directement, une erreur sur un releve entier serait couteuse a corriger).",
        parameters: {
          type: 'OBJECT',
          properties: {
            transactions: {
              type: 'ARRAY',
              description: 'Une entree par ligne/operation du releve, dans l\'ordre du document',
              items: {
                type: 'OBJECT',
                properties: {
                  date: { type: 'STRING', description: 'AAAA-MM-JJ' },
                  description: { type: 'STRING', description: 'Libelle de l\'operation' },
                  amount: { type: 'NUMBER', description: 'Montant en FCFA, toujours positif' },
                  sens: { type: 'STRING', enum: ['entree', 'sortie'], description: 'entree = credit du compte (encaissement), sortie = debit (decaissement)' },
                },
                required: ['date', 'description', 'amount', 'sens'],
              },
            },
          },
          required: ['transactions'],
        },
      },
    ],
  },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Methode non autorisee.' }, 405);
  }

  // Cette route est publique (n'importe qui connaissant l'URL peut l'appeler) -
  // elle doit donc revalider elle-meme la session Supabase avant de depenser
  // le moindre appel Gemini, sinon le quota/la facturation d'Edson seraient a
  // la merci de n'importe qui.
  const isAuthorized = await verifyCaller(req.headers.get('authorization'));
  if (!isAuthorized) {
    return jsonResponse({ error: 'Non autorise.' }, 401);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: "L'assistant n'est pas configure (cle API manquante cote serveur)." }, 500);
  }

  let body: { message?: string; history?: ChatTurn[]; context?: string; attachment?: { mimeType?: string; data?: string } | null };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Corps de requete invalide.' }, 400);
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const history = Array.isArray(body.history) ? body.history : [];
  const context = typeof body.context === 'string' ? body.context : '';
  const attachment =
    body.attachment && typeof body.attachment.mimeType === 'string' && typeof body.attachment.data === 'string'
      ? { mimeType: body.attachment.mimeType, data: body.attachment.data }
      : null;

  if (!message && !attachment) {
    return jsonResponse({ error: 'Message vide.' }, 400);
  }

  const todayLocal = new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Brazzaville' });

  const systemInstruction = {
    parts: [
      {
        text: `Tu es l'assistant comptable integre de VPNS Consulting, un cabinet de conseil a Brazzaville (Congo), qui applique la comptabilite SYSCOHADA/OHADA en FCFA avec une TVA a 18%. Tu aides Edson (le gerant) a gerer sa comptabilite au quotidien directement depuis l'application : rediger des factures, enregistrer des depenses, gerer ses clients, planifier des rendez-vous, et repondre a ses questions sur ses propres donnees.

Reponds toujours en francais, de maniere concise et directe (pas de formules de politesse superflues). Quand la demande correspond a une action concrete (facture, client, depense, rendez-vous, fiche de paye), appelle directement l'outil correspondant plutot que de decrire ce qu'il faudrait faire - Edson veut de l'efficacite, pas des instructions a suivre lui-meme. S'il manque une information essentielle qui ne peut pas etre deduite raisonnablement du contexte (ex: montant d'une facture), pose une question precise au lieu d'inventer un chiffre. Pour toute question qui ne demande pas d'action (soldes, liste de clients, conseils), reponds simplement en texte en te basant sur le contexte fourni.

TU PEUX RECEVOIR DES PHOTOS/SCANS/PDF DE DOCUMENTS directement dans la conversation (facture recue, ticket de caisse, fiche de paye, carte de visite...). Lis-les toi-meme comme un comptable le ferait et agis en consequence, sans qu'Edson ait besoin de retaper quoi que ce soit :
- Un document photographie/importe est presque TOUJOURS une piece RECUE (une depense), jamais une facture qu'Edson redige lui-meme - celles-ci se creent directement en discutant avec toi, pas en les photographiant. Un document au format "facture" d'une autre entreprise doit etre enregistre comme type='achat' (create_invoice) ou record_expense, PAS comme une vente.
- Ne classe un document en vente (type='vente') QUE s'il porte les signes propres au modele VPNS lui-meme : son propre en-tete "VPNS", un numero de facture au format "NN/DG/VPNS/AAAA", ou son NIU/RCCM. Dans ce cas, c'est probablement une facture qu'Edson a deja emise et qu'il reimporte - verifie qu'elle n'est pas deja dans les factures recentes du contexte avant de la recreer en double.
- Une fiche de paye/bulletin de salaire : utilise record_payslip, jamais create_invoice.
- Un releve bancaire ou une photo de cahier journal papier (PLUSIEURS operations listees) : utilise import_bank_statement avec toutes les lignes extraites en une seule fois, jamais create_invoice/record_expense ligne par ligne.
- Une carte de visite ou un contact : utilise create_client si Edson veut l'ajouter.
- Si le document est illisible ou ambigu, dis-le et demande une precision plutot que d'inventer un montant.

Contexte actuel de l'entreprise (clients, factures recentes, soldes) :
${context || 'Aucune donnee chargee.'}

Date du jour a Brazzaville : ${todayLocal}.`,
      },
    ],
  };

  const lastUserParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { text: message || 'Analyse ce document et agis en consequence.' },
  ];
  if (attachment) {
    lastUserParts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
  }

  const contents = [
    ...history
      .filter((h) => h && typeof h.text === 'string' && (h.role === 'user' || h.role === 'model'))
      .map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: 'user', parts: lastUserParts },
  ];

  let geminiRes: Response;
  try {
    geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, systemInstruction, tools: TOOLS }),
    });
  } catch {
    return jsonResponse({ error: "Impossible de joindre le service IA. Reessaie dans un instant." }, 502);
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text().catch(() => '');
    return jsonResponse({ error: `Erreur du service IA (${geminiRes.status}). ${errText.slice(0, 200)}` }, 502);
  }

  const data = await geminiRes.json();
  const candidate = data?.candidates?.[0];
  const parts: Array<{ text?: string; functionCall?: { name: string; args?: Record<string, unknown> } }> = candidate?.content?.parts || [];
  const functionCallPart = parts.find((p) => p.functionCall);

  if (functionCallPart?.functionCall) {
    return jsonResponse({
      type: 'action',
      name: functionCallPart.functionCall.name,
      args: functionCallPart.functionCall.args || {},
    });
  }

  const text = parts.map((p) => p.text || '').join('').trim();
  return jsonResponse({ type: 'text', text: text || "Je n'ai pas compris, peux-tu reformuler ?" });
}
