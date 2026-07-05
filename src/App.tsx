import { useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import PageHeader from './components/PageHeader';
import EmptyState from './components/EmptyState';
import { ArchiveManager } from './components/ArchiveManager';
import { InvoiceModal } from './components/InvoiceModal';
import { ClientModal } from './components/ClientModal';
import { EventModal } from './components/EventModal';
import { ReportModal } from './components/ReportModal';
import { NotificationModal } from './components/NotificationModal';
import { AccountingEntryModal } from './components/AccountingEntryModal';
import { parseAppointmentText, parseQuickEntry } from './utils/helpers';

type SectionKey = 'dashboard' | 'comptabilite' | 'factures' | 'clients' | 'agenda' | 'documents' | 'rapports' | 'notifications' | 'parametres';

type Entry = {
  id: number;
  date: string;
  client: string;
  description: string;
  amount: number;
  status: string;
  category: string;
  type: string;
};

const sectionLabels: Record<SectionKey, string> = {
  dashboard: 'Tableau de bord',
  comptabilite: 'Comptabilité',
  factures: 'Factures',
  clients: 'Clients',
  agenda: 'Agenda',
  documents: 'Documents',
  rapports: 'Rapports',
  notifications: 'Notifications',
  parametres: 'Paramètres',
};

const sectionActions: Record<SectionKey, string> = {
  dashboard: '➕ Nouvelle écriture comptable',
  comptabilite: '➕ Nouvelle écriture comptable',
  factures: '➕ Nouvelle facture',
  clients: '➕ Nouveau client',
  agenda: '➕ Nouvel événement',
  documents: '➕ Ajouter un document',
  rapports: '➕ Nouveau rapport',
  notifications: '➕ Nouvelle notification',
  parametres: '➕ Nouvelle configuration',
};

const entries: Entry[] = [];
const invoices: Array<{ ref: string; client: string; amount: string; status: string }> = [];
const clientsData: Array<{ id: string; name: string }> = [];
const appointments: Array<{ time: string; title: string; client: string }> = [];
const alerts: Array<{ title: string; detail: string }> = [];

function App() {
  const [activeSection, setActiveSection] = useState<SectionKey>('dashboard');
  const [quickText, setQuickText] = useState('');
  const [appointmentText, setAppointmentText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const parsedEntry = useMemo(() => parseQuickEntry(quickText), [quickText]);
  const parsedAppointment = useMemo(() => parseAppointmentText(appointmentText), [appointmentText]);

  const renderSection = () => {
    switch (activeSection) {
      case 'comptabilite':
        return (
          <section className="section-stack">
            <article className="panel-card">
              <div className="panel-top">
                <h4>Journal comptable OHADA</h4>
                <span>Écritures réelles uniquement</span>
              </div>
              {entries.length === 0 ? (
                <EmptyState
                  title="Aucune écriture comptable"
                  description="Ajoutez votre première écriture pour démarrer le suivi OHADA."
                />
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Client</th>
                      <th>Description</th>
                      <th>Montant</th>
                      <th>Catégorie</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.date}</td>
                        <td>{entry.client}</td>
                        <td>{entry.description}</td>
                        <td>{entry.amount.toLocaleString('fr-FR')} FCFA</td>
                        <td>{entry.category}</td>
                        <td>{entry.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </article>

            <article className="panel-card">
              <div className="panel-top">
                <h4>Saisie rapide intelligente</h4>
                <span>Analyse du texte libre</span>
              </div>
              <input
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder="Ex: payer EEC 53390"
              />
              <div className="parsed-box">
                <p><strong>Montant :</strong> {parsedEntry.amount ? `${parsedEntry.amount.toLocaleString('fr-FR')} FCFA` : 'Non détecté'}</p>
                <p><strong>Catégorie :</strong> {parsedEntry.category}</p>
                <p><strong>Compte :</strong> {parsedEntry.account}</p>
                <p><strong>Type :</strong> {parsedEntry.type}</p>
              </div>
            </article>
          </section>
        );
      case 'factures':
        return (
          <section className="section-stack">
            <article className="panel-card">
              <div className="panel-top">
                <h4>Factures</h4>
                <span>Gérez vos documents commerciaux</span>
              </div>
              <EmptyState
                title="Aucune facture"
                description="Créez une nouvelle facture pour commencer votre suivi."
              />
            </article>
          </section>
        );
      case 'clients':
        return (
          <section className="section-stack">
            <article className="panel-card">
              <div className="panel-top">
                <h4>Clients</h4>
                <span>Fiches et historique</span>
              </div>
              <EmptyState
                title="Aucun client enregistré"
                description="Ajoutez vos premiers clients pour démarrer votre activité."
              />
            </article>
          </section>
        );
      case 'agenda':
        return (
          <section className="section-stack">
            <article className="panel-card">
              <div className="panel-top">
                <h4>Agenda</h4>
                <span>Rendez-vous et rappels</span>
              </div>
              <EmptyState
                title="Aucun événement planifié"
                description="Planifiez vos échéances pour garder le contrôle."
              />
            </article>
          </section>
        );
      case 'documents':
        return (
          <section className="section-stack">
            <article className="panel-card">
              <div className="panel-top">
                <h4>Documents</h4>
                <span>Archives et pièces jointes</span>
              </div>
              <ArchiveManager clients={clientsData} />
            </article>
          </section>
        );
      case 'rapports':
        return (
          <section className="section-stack">
            <article className="panel-card">
              <div className="panel-top">
                <h4>Rapports</h4>
                <span>Analyse et performance</span>
              </div>
              <EmptyState
                title="Aucun rapport disponible"
                description="Créez des opérations pour générer des rapports fiables."
              />
            </article>
          </section>
        );
      case 'notifications':
        return (
          <section className="section-stack">
            <article className="panel-card">
              <div className="panel-top">
                <h4>Notifications</h4>
                <span>Alertes importantes</span>
              </div>
              <EmptyState
                title="Aucune notification"
                description="Toutes les actions importantes s'afficheront ici."
              />
            </article>
          </section>
        );
      case 'parametres':
        return (
          <section className="section-stack">
            <article className="panel-card">
              <div className="panel-top">
                <h4>Paramètres</h4>
                <span>Configuration</span>
              </div>
              <div className="setting-grid">
                <div className="mini-card">
                  <strong>Profil</strong>
                  <p>Modifier les informations de l'entreprise.</p>
                </div>
                <div className="mini-card">
                  <strong>Préférences</strong>
                  <p>Personnaliser l'interface et les habitudes.</p>
                </div>
                <div className="mini-card">
                  <strong>Sécurité</strong>
                  <p>Gérer les accès et la confidentialité.</p>
                </div>
              </div>
            </article>
          </section>
        );
      default:
        return (
          <>
            <section className="hero-card">
              <div>
                <p className="eyebrow">Tableau de bord</p>
                <h3>Un logiciel de gestion OHADA moderne et fiable</h3>
                <p>Commencez avec une base propre : aucun client, aucune facture, aucune donnée de démonstration.</p>
              </div>
              <div className="hero-pill">Prêt pour vos données réelles</div>
            </section>

            <section className="stats-grid">
              <article className="stat-card statistic-card">
                <p>Clients enregistrés</p>
                <strong>Aucun client</strong>
              </article>
              <article className="stat-card statistic-card">
                <p>Factures créées</p>
                <strong>Aucune facture</strong>
              </article>
              <article className="stat-card statistic-card">
                <p>Écritures comptables</p>
                <strong>Aucune écriture</strong>
              </article>
              <article className="stat-card statistic-card">
                <p>Documents archivés</p>
                <strong>Aucun document</strong>
              </article>
            </section>

            <section className="content-grid">
              <article className="panel-card">
                <div className="panel-top">
                  <h4>Prise en main</h4>
                  <span>Base propre</span>
                </div>
                <p>Votre instance est prête. Ajoutez un client, une facture ou une écriture pour commencer l'analyse.</p>
              </article>
              <article className="panel-card">
                <div className="panel-top">
                  <h4>Bonnes pratiques</h4>
                  <span>OHADA</span>
                </div>
                <p>Utilisez uniquement les données réelles pour des rapports fiables et conformes.</p>
              </article>
            </section>
          </>
        );
    }
  };

  const handleNavigate = (section: SectionKey) => {
    setActiveSection(section);
    setIsDrawerOpen(false);
  };

  return (
    <div className="app-shell">
      <Sidebar activeSection={activeSection} onSelectSection={handleNavigate} />

      <div className="app-content">
        <TopBar
          title={sectionLabels[activeSection]}
          subtitle="VPNS Consulting - Logiciel professionnel OHADA"
          actionLabel={sectionActions[activeSection]}
          onAction={() => setIsModalOpen(true)}
          onMenuToggle={() => setIsDrawerOpen(true)}
        />

        <main className="main-panel">
          <PageHeader
            title={sectionLabels[activeSection]}
            subtitle="Gestion complète"
            description="Utilisez les fonctionnalités du module pour piloter votre activité avec rigueur."
          />
          <div className="main-content">{renderSection()}</div>
        </main>
      </div>

      <div className={`drawer-overlay ${isDrawerOpen ? 'open' : ''}`} onClick={() => setIsDrawerOpen(false)} />
      <div className={`sidebar sidebar-mobile ${isDrawerOpen ? 'open' : ''}`}>
        <Sidebar activeSection={activeSection} onSelectSection={handleNavigate} onClose={() => setIsDrawerOpen(false)} isMobile />
      </div>

      {isModalOpen && activeSection === 'comptabilite' && (
        <AccountingEntryModal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          onSubmit={(data) => {
            console.log('Écriture comptable créée:', data);
            setIsModalOpen(false);
          }}
        />
      )}

      {isModalOpen && activeSection === 'factures' && (
        <InvoiceModal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          onSubmit={(data) => {
            console.log('Facture créée:', data);
            setIsModalOpen(false);
          }}
          clients={clientsData}
        />
      )}

      {isModalOpen && activeSection === 'clients' && (
        <ClientModal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          onSubmit={(data) => {
            console.log('Client créé:', data);
            setIsModalOpen(false);
          }}
        />
      )}

      {isModalOpen && activeSection === 'agenda' && (
        <EventModal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          onSubmit={(data) => {
            console.log('Événement créé:', data);
            setIsModalOpen(false);
          }}
          clients={clientsData}
        />
      )}

      {isModalOpen && activeSection === 'rapports' && (
        <ReportModal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          onSubmit={(data) => {
            console.log('Rapport créé:', data);
            setIsModalOpen(false);
          }}
          clients={clientsData}
        />
      )}

      {isModalOpen && activeSection === 'notifications' && (
        <NotificationModal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          onSubmit={(data) => {
            console.log('Notification créée:', data);
            setIsModalOpen(false);
          }}
          clients={clientsData}
        />
      )}

      {isModalOpen && activeSection === 'dashboard' && (
        <AccountingEntryModal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          onSubmit={(data) => {
            console.log('Écriture comptable créée:', data);
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
