// Client de l'assistant comptable : envoie le message + l'historique + un
// contexte texte compact (deja en memoire cote app, pas de requete DB
// supplementaire) a la fonction serveur /api/assistant, qui seule detient la
// cle de l'API Gemini.
export interface AssistantChatTurn {
  role: 'user' | 'model';
  text: string;
}

export type AssistantResponse =
  | { type: 'text'; text: string }
  | { type: 'action'; name: string; args: Record<string, unknown> }
  | { type: 'error'; error: string };

export interface AssistantAttachment {
  mimeType: string;
  data: string; // base64, sans le prefixe data:...;base64,
}

export async function askAssistant(
  message: string,
  history: AssistantChatTurn[],
  context: string,
  attachment?: AssistantAttachment
): Promise<AssistantResponse> {
  try {
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, context, attachment: attachment || null }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { type: 'error', error: (data && data.error) || `Erreur serveur (${res.status}).` };
    }
    if (data?.type === 'action') {
      return { type: 'action', name: data.name, args: data.args || {} };
    }
    return { type: 'text', text: data?.text || '' };
  } catch (err) {
    return { type: 'error', error: (err as Error).message || "Connexion a l'assistant impossible." };
  }
}
