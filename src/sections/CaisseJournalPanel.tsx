import { formatFcfa, formatDate } from '../utils/format';
import type { JournalCaisse } from '../utils/comptaReports';

interface CaisseJournalPanelProps {
  selectedExercise: number;
  availableExercises: number[];
  onExerciseChange: (year: number) => void;
  journal: JournalCaisse;
  conseils: string[];
  isImportingCahier: boolean;
  onImportCahier: (file: File) => void;
}

export function CaisseJournalPanel({
  selectedExercise,
  availableExercises,
  onExerciseChange,
  journal,
  conseils,
  isImportingCahier,
  onImportCahier,
}: CaisseJournalPanelProps) {
  return (
    <div className="section-stack">
      <div className="exercise-bar">
        <span>Exercice comptable (1er janvier - 31 decembre)</span>
        <select value={selectedExercise} onChange={(e) => onExerciseChange(Number(e.target.value))}>
          {availableExercises.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <div className="skpi-row">
        <div className="skpi-card">
          <span className="skpi-icon" style={{ background: 'rgba(16,185,129,0.14)' }}>+</span>
          <div><p>Total encaisse (chiffre d'affaires encaisse)</p><strong>{formatFcfa(journal.totalEntrees)}</strong></div>
        </div>
        <div className="skpi-card">
          <span className="skpi-icon" style={{ background: 'rgba(239,68,68,0.14)' }}>-</span>
          <div><p>Total decaisse (depenses)</p><strong>{formatFcfa(journal.totalSorties)}</strong></div>
        </div>
        <div className="skpi-card">
          <span className="skpi-icon" style={{ background: journal.soldeFinal >= 0 ? 'rgba(79,70,229,0.14)' : 'rgba(239,68,68,0.14)' }}>Σ</span>
          <div><p>Reste en caisse</p><strong>{formatFcfa(journal.soldeFinal)}</strong></div>
        </div>
      </div>

      <article className="panel-card">
        <div className="panel-top">
          <h4>Conseils financiers</h4>
          <span>Analyse automatique</span>
        </div>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {conseils.map((conseil, i) => (
            <li key={i} style={{ marginBottom: 6 }}>{conseil}</li>
          ))}
        </ul>
      </article>

      <article className="panel-card">
        <div className="panel-top">
          <h4>Journal de caisse - Exercice {selectedExercise}</h4>
          <div className="panel-top-actions">
            <span>{journal.jours.length} jour(s) mouvemente(s)</span>
            <label className="file-import-label" title="Photo d'un cahier journal papier : chaque ligne avec un montant sera proposee comme operation de caisse a valider">
              {isImportingCahier ? 'Analyse OCR en cours...' : 'Importer un cahier journal (photo)'}
              <input
                type="file"
                className="file-import-input"
                accept=".png,.jpg,.jpeg,.pdf"
                disabled={isImportingCahier}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportCahier(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>

        {journal.jours.length === 0 ? (
          <p className="chart-empty-hint">Aucun mouvement de caisse sur cet exercice. Enregistrez une vente/achat en especes, ou importez une photo de votre cahier journal.</p>
        ) : (
          journal.jours.map((jour) => (
            <div key={jour.date} className="grandlivre-compte">
              <div className="grandlivre-head">
                <strong>{formatDate(jour.date)}</strong>
                <span>Ouverture {formatFcfa(jour.soldeOuverture)} - Cloture {formatFcfa(jour.soldeCloture)}</span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>Libelle</th><th>Entree</th><th>Sortie</th></tr>
                  </thead>
                  <tbody>
                    {jour.mouvements.map((m, i) => (
                      <tr key={i}>
                        <td>{m.description}</td>
                        <td>{m.entree ? formatFcfa(m.entree) : '-'}</td>
                        <td>{m.sortie ? formatFcfa(m.sortie) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td><strong>Total du jour</strong></td>
                      <td><strong>{formatFcfa(jour.totalEntrees)}</strong></td>
                      <td><strong>{formatFcfa(jour.totalSorties)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))
        )}
      </article>
    </div>
  );
}

export default CaisseJournalPanel;
