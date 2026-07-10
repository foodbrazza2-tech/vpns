// Plan comptable SYSCOHADA revise (OHADA) - comptes usuels.
// Organise par classe. `class` = premier chiffre du numero de compte.
// Utilise pour les listes deroulantes de saisie et pour classer les
// ecritures dans le Grand Livre, la Balance, le Bilan et le Compte de resultat.

export interface CompteOHADA {
  code: string;
  libelle: string;
}

export interface ClasseOHADA {
  classe: number;
  titre: string;
  comptes: CompteOHADA[];
}

export const PLAN_COMPTABLE_SYSCOHADA: ClasseOHADA[] = [
  {
    classe: 1,
    titre: 'Classe 1 - Ressources durables (capitaux)',
    comptes: [
      { code: '101', libelle: 'Capital social' },
      { code: '104', libelle: 'Primes liees au capital social' },
      { code: '105', libelle: 'Ecarts de reevaluation' },
      { code: '106', libelle: 'Reserves' },
      { code: '110', libelle: 'Report a nouveau (solde crediteur)' },
      { code: '119', libelle: 'Report a nouveau (solde debiteur)' },
      { code: '120', libelle: 'Resultat de l\'exercice (benefice)' },
      { code: '129', libelle: 'Resultat de l\'exercice (perte)' },
      { code: '131', libelle: 'Subventions d\'equipement' },
      { code: '151', libelle: 'Provisions pour risques' },
      { code: '161', libelle: 'Emprunts obligataires' },
      { code: '162', libelle: 'Emprunts et dettes aupres des etablissements de credit' },
      { code: '164', libelle: 'Avances recues de l\'Etat' },
      { code: '181', libelle: 'Comptes de liaison des etablissements' },
    ],
  },
  {
    classe: 2,
    titre: 'Classe 2 - Actif immobilise',
    comptes: [
      { code: '211', libelle: 'Frais de developpement' },
      { code: '213', libelle: 'Logiciels et sites internet' },
      { code: '215', libelle: 'Fonds commercial' },
      { code: '221', libelle: 'Terrains' },
      { code: '231', libelle: 'Batiments' },
      { code: '241', libelle: 'Materiel et outillage' },
      { code: '244', libelle: 'Materiel et mobilier de bureau' },
      { code: '245', libelle: 'Materiel de transport' },
      { code: '2183', libelle: 'Materiel informatique' },
      { code: '261', libelle: 'Titres de participation' },
      { code: '275', libelle: 'Depots et cautionnements verses' },
      { code: '281', libelle: 'Amortissements des immobilisations incorporelles' },
      { code: '283', libelle: 'Amortissements des batiments' },
      { code: '284', libelle: 'Amortissements du materiel' },
    ],
  },
  {
    classe: 3,
    titre: 'Classe 3 - Stocks',
    comptes: [
      { code: '311', libelle: 'Marchandises' },
      { code: '321', libelle: 'Matieres premieres' },
      { code: '331', libelle: 'Matieres consommables' },
      { code: '335', libelle: 'Emballages' },
      { code: '361', libelle: 'Produits finis' },
      { code: '371', libelle: 'Stocks de marchandises en cours de route' },
    ],
  },
  {
    classe: 4,
    titre: 'Classe 4 - Tiers',
    comptes: [
      { code: '401', libelle: 'Fournisseurs' },
      { code: '4011', libelle: 'Fournisseurs - dettes en compte' },
      { code: '408', libelle: 'Fournisseurs - factures non parvenues' },
      { code: '409', libelle: 'Fournisseurs debiteurs (avances versees)' },
      { code: '411', libelle: 'Clients' },
      { code: '4111', libelle: 'Clients - ventes de biens ou services' },
      { code: '416', libelle: 'Clients douteux ou litigieux' },
      { code: '418', libelle: 'Clients - factures a etablir' },
      { code: '419', libelle: 'Clients crediteurs (avances recues)' },
      { code: '421', libelle: 'Personnel - avances et acomptes' },
      { code: '422', libelle: 'Personnel - remunerations dues' },
      { code: '431', libelle: 'Securite sociale (CNSS)' },
      { code: '441', libelle: 'Etat - impot sur les benefices' },
      { code: '4431', libelle: 'Etat - TVA facturee (collectee)' },
      { code: '4432', libelle: 'Etat - TVA recuperable sur immobilisations' },
      { code: '4452', libelle: 'Etat - TVA recuperable sur achats' },
      { code: '447', libelle: 'Etat - impots retenus a la source' },
      { code: '4471', libelle: 'Etat - impot sur salaires (IRPP)' },
      { code: '451', libelle: 'Comptes courants associes' },
      { code: '471', libelle: 'Comptes d\'attente' },
      { code: '481', libelle: 'Fournisseurs d\'investissements' },
    ],
  },
  {
    classe: 5,
    titre: 'Classe 5 - Tresorerie',
    comptes: [
      { code: '521', libelle: 'Banques locales' },
      { code: '5211', libelle: 'Banque (compte principal)' },
      { code: '531', libelle: 'Cheques postaux' },
      { code: '561', libelle: 'Credits de tresorerie (decouvert)' },
      { code: '571', libelle: 'Caisse' },
      { code: '5711', libelle: 'Caisse siege social' },
      { code: '585', libelle: 'Virements de fonds internes' },
    ],
  },
  {
    classe: 6,
    titre: 'Classe 6 - Charges d\'exploitation',
    comptes: [
      { code: '601', libelle: 'Achats de marchandises' },
      { code: '602', libelle: 'Achats de matieres premieres' },
      { code: '604', libelle: 'Achats stockes de matieres et fournitures' },
      { code: '605', libelle: 'Autres achats (eau, electricite, fournitures)' },
      { code: '6051', libelle: 'Fournitures non stockables - electricite' },
      { code: '6052', libelle: 'Fournitures non stockables - eau' },
      { code: '6061', libelle: 'Fournitures et energie' },
      { code: '611', libelle: 'Transports sur achats' },
      { code: '6111', libelle: 'Transports (taxi, deplacements)' },
      { code: '621', libelle: 'Sous-traitance generale' },
      { code: '622', libelle: 'Locations et charges locatives' },
      { code: '624', libelle: 'Entretien, reparations et maintenance' },
      { code: '625', libelle: 'Primes d\'assurance' },
      { code: '6265', libelle: 'Frais de telecommunications (MTN, Airtel, internet)' },
      { code: '627', libelle: 'Publicite, publications, relations publiques' },
      { code: '6281', libelle: 'Frais bancaires' },
      { code: '631', libelle: 'Frais de personnel exterieur' },
      { code: '641', libelle: 'Impots et taxes directs' },
      { code: '661', libelle: 'Remunerations du personnel (salaires)' },
      { code: '664', libelle: 'Charges sociales (CNSS employeur)' },
      { code: '671', libelle: 'Interets des emprunts' },
      { code: '681', libelle: 'Dotations aux amortissements d\'exploitation' },
    ],
  },
  {
    classe: 7,
    titre: 'Classe 7 - Produits d\'exploitation',
    comptes: [
      { code: '701', libelle: 'Ventes de marchandises' },
      { code: '702', libelle: 'Ventes de produits finis' },
      { code: '704', libelle: 'Ventes de travaux' },
      { code: '705', libelle: 'Ventes de services (prestations)' },
      { code: '706', libelle: 'Services vendus (commissions, honoraires)' },
      { code: '707', libelle: 'Produits accessoires' },
      { code: '718', libelle: 'Autres produits d\'exploitation' },
      { code: '754', libelle: 'Produits divers de gestion courante' },
      { code: '771', libelle: 'Interets de prets et produits financiers' },
      { code: '781', libelle: 'Reprises d\'amortissements et provisions' },
    ],
  },
  {
    classe: 8,
    titre: 'Classe 8 - Autres charges et produits (HAO)',
    comptes: [
      { code: '811', libelle: 'Valeurs comptables des cessions d\'immobilisations' },
      { code: '821', libelle: 'Produits des cessions d\'immobilisations' },
      { code: '831', libelle: 'Charges hors activites ordinaires (HAO)' },
      { code: '841', libelle: 'Produits hors activites ordinaires (HAO)' },
      { code: '891', libelle: 'Impots sur le resultat' },
    ],
  },
];

// Liste a plat pour recherche rapide et libelles.
export const COMPTES_A_PLAT: CompteOHADA[] = PLAN_COMPTABLE_SYSCOHADA.flatMap((c) => c.comptes);

const LIBELLE_PAR_CODE = new Map(COMPTES_A_PLAT.map((c) => [c.code, c.libelle]));

export function libelleCompte(code: string): string {
  return LIBELLE_PAR_CODE.get(code) || '';
}

export function afficherCompte(code: string): string {
  const lib = libelleCompte(code);
  return lib ? `${code} - ${lib}` : code;
}

// Classe d'un compte = premier chiffre. Sert au Bilan / Compte de resultat.
export function classeDuCompte(code: string): number {
  return Number(code.charAt(0)) || 0;
}
