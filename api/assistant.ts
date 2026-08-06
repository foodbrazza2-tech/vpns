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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: "L'assistant n'est pas configure (cle API manquante cote serveur)." }, 500);
  }

  let body: { message?: string; history?: ChatTurn[]; context?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Corps de requete invalide.' }, 400);
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const history = Array.isArray(body.history) ? body.history : [];
  const context = typeof body.context === 'string' ? body.context : '';

  if (!message) {
    return jsonResponse({ error: 'Message vide.' }, 400);
  }

  const todayLocal = new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Brazzaville' });

  const systemInstruction = {
    parts: [
      {
        text: `Tu es l'assistant comptable integre de VPNS Consulting, un cabinet de conseil a Brazzaville (Congo), qui applique la comptabilite SYSCOHADA/OHADA en FCFA avec une TVA a 18%. Tu aides Edson (le gerant) a gerer sa comptabilite au quotidien directement depuis l'application : rediger des factures, enregistrer des depenses, gerer ses clients, planifier des rendez-vous, et repondre a ses questions sur ses propres donnees.

Reponds toujours en francais, de maniere concise et directe (pas de formules de politesse superflues). Quand la demande correspond a une action concrete (facture, client, depense, rendez-vous), appelle directement l'outil correspondant plutot que de decrire ce qu'il faudrait faire - Edson veut de l'efficacite, pas des instructions a suivre lui-meme. S'il manque une information essentielle qui ne peut pas etre deduite raisonnablement du contexte (ex: montant d'une facture), pose une question precise au lieu d'inventer un chiffre. Pour toute question qui ne demande pas d'action (soldes, liste de clients, conseils), reponds simplement en texte en te basant sur le contexte fourni.

Contexte actuel de l'entreprise (clients, factures recentes, soldes) :
${context || 'Aucune donnee chargee.'}

Date du jour a Brazzaville : ${todayLocal}.`,
      },
    ],
  };

  const contents = [
    ...history
      .filter((h) => h && typeof h.text === 'string' && (h.role === 'user' || h.role === 'model'))
      .map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: message }] },
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
