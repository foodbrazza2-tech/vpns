const NARROW_NBSP = String.fromCharCode(8239);
const PLAIN_SPACE = String.fromCharCode(32);

export const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// toLocaleString('fr-FR') separe les milliers avec une espace insecable fine
// (U+202F, code 8239) : correcte a l'ecran, mais rendue comme un caractere
// errone ("/") par la police standard de jsPDF dans les PDF exportes - on la
// remplace par une espace normale (code 32), sure dans les deux contextes.
// Utilise pour tout montant affiche a l'ecran ET dans les PDF generes.
export const formatNumberFr = (value: number) => value.toLocaleString('fr-FR').split(NARROW_NBSP).join(PLAIN_SPACE);

export const formatFcfa = (value: number) => `${formatNumberFr(value)} FCFA`;

export const formatDate = (value: string) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('fr-FR');
};

// Extrait l'annee depuis une chaine yyyy-mm-dd sans passer par Date() (evite les
// decalages de fuseau horaire pres du 1er janvier).
export const yearOf = (value: string) => Number(value.slice(0, 4));
