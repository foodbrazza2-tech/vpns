// Client de l'assistant comptable : envoie le message + l'historique + un
// contexte texte compact (deja en memoire cote app, pas de requete DB
// supplementaire) a la fonction serveur /api/assistant, qui seule detient la
// cle de l'API Gemini.
import { supabase } from './authService';

export interface AssistantChatTurn {
  role: 'user' | 'model';
  text: string;
}

export interface AssistantAction {
  name: string;
  args: Record<string, unknown>;
}

export type AssistantResponse =
  | { type: 'text'; text: string }
  | { type: 'action'; actions: AssistantAction[] }
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
    // La route serveur revalide elle-meme ce jeton (elle est publique, donc
    // n'importe qui pourrait sinon l'appeler et consommer le quota Gemini).
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { type: 'error', error: 'Session expiree - reconnecte-toi.' };
    }

    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ message, history, context, attachment: attachment || null }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { type: 'error', error: (data && data.error) || `Erreur serveur (${res.status}).` };
    }
    if (data?.type === 'action' && Array.isArray(data.actions)) {
      return { type: 'action', actions: data.actions.map((a: any) => ({ name: a.name, args: a.args || {} })) };
    }
    return { type: 'text', text: data?.text || '' };
  } catch (err) {
    return { type: 'error', error: (err as Error).message || "Connexion a l'assistant impossible." };
  }
}
