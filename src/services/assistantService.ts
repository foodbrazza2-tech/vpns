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
  // La route serveur revalide elle-meme ce jeton (elle est publique, donc
  // n'importe qui pourrait sinon l'appeler et consommer le quota Gemini).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { type: 'error', error: 'Session expiree - reconnecte-toi.' };
  }

  const body = JSON.stringify({ message, history, context, attachment: attachment || null });
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` };

  // Une coupure reseau mobile d'une seconde ne devrait pas obliger Edson a
  // retaper sa demande - une seule tentative supplementaire suffit pour les
  // vrais blips (pas pour une vraie panne, qui echouerait pareil deux fois).
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch('/api/assistant', { method: 'POST', headers, body });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return { type: 'error', error: (data && data.error) || `Erreur serveur (${res.status}).` };
      }
      if (data?.type === 'action' && Array.isArray(data.actions)) {
        return { type: 'action', actions: data.actions.map((a: any) => ({ name: a.name, args: a.args || {} })) };
      }
      return { type: 'text', text: data?.text || '' };
    } catch (err) {
      if (attempt === 2) {
        return { type: 'error', error: (err as Error).message || "Connexion a l'assistant impossible." };
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  // Inatteignable (la boucle renvoie toujours dans un des deux cas ci-dessus),
  // necessaire uniquement pour que TypeScript voie un retour sur tous les chemins.
  return { type: 'error', error: "Connexion a l'assistant impossible." };
}
