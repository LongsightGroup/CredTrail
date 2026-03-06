import type { LearnerBadgeSummaryRecord } from '@credtrail/db';
import { renderPageShell } from '@credtrail/ui-components';

export type LearnerDidSettingsNotice = 'updated' | 'cleared' | 'conflict' | 'invalid';

export const learnerDidSettingsNoticeFromQuery = (
  value: string | undefined,
): LearnerDidSettingsNotice | null => {
  switch (value) {
    case 'updated':
    case 'cleared':
    case 'conflict':
    case 'invalid':
      return value;
    default:
      return null;
  }
};

interface CreateLearnerDashboardPageInput {
  escapeHtml: (value: string) => string;
  formatIsoTimestamp: (timestampIso: string) => string;
}

export const createLearnerDashboardPage = (input: CreateLearnerDashboardPageInput) => {
  const { escapeHtml, formatIsoTimestamp } = input;

  return (
    requestUrl: string,
    tenantId: string,
    badges: readonly LearnerBadgeSummaryRecord[],
    learnerDid: string | null,
    didNotice: LearnerDidSettingsNotice | null,
  ): string => {
    const totalBadges = badges.length;
    const activeBadges = badges.filter((badge) => badge.revokedAt === null).length;
    const revokedBadges = totalBadges - activeBadges;
    const totalBadgesLabel = String(totalBadges);
    const activeBadgesLabel = String(activeBadges);
    const revokedBadgesLabel = String(revokedBadges);
    const badgeCountLabel =
      totalBadges === 1 ? '1 recorded badge' : `${totalBadgesLabel} recorded badges`;
    const latestIssuedAt = badges.reduce<string | null>(
      (latest, badge) => (latest === null || badge.issuedAt > latest ? badge.issuedAt : latest),
      null,
    );
    const heroLead =
      totalBadges === 0
        ? 'Your credential collection is ready for its first published badge.'
        : activeBadges === totalBadges
          ? activeBadges === 1
            ? '1 verified badge is ready to share and verify.'
            : `${activeBadgesLabel} verified badges are ready to share and verify.`
          : activeBadges > 0
            ? `${activeBadgesLabel} verified badge${activeBadges === 1 ? '' : 's'} remain ready to share, with ${revokedBadgesLabel} historical record${revokedBadges === 1 ? '' : 's'} preserved below.`
            : `${revokedBadgesLabel} revoked record${revokedBadges === 1 ? '' : 's'} remain visible in your collection history.`;
    const heroNote =
      totalBadges === 0
        ? 'When a credential is issued to this learner account, it will appear here with its official public verification page.'
        : 'Each credential includes an official public page you can share with employers and reviewers for verification.';
    const latestIssuedMarkup =
      latestIssuedAt === null
        ? '<p class="learner-dashboard__hero-card-note">Ready for the next published badge.</p>'
        : `<p class="learner-dashboard__hero-card-note">Latest issue: <strong>${escapeHtml(formatIsoTimestamp(latestIssuedAt))} UTC</strong></p>`;
    const didNoticeMarkup =
      didNotice === null
        ? ''
        : didNotice === 'updated'
          ? '<p class="learner-dashboard__notice learner-dashboard__notice--success">Learner DID updated. Newly issued badges will use this DID as credentialSubject.id.</p>'
          : didNotice === 'cleared'
            ? '<p class="learner-dashboard__notice learner-dashboard__notice--info">Learner DID cleared. Badge issuance will fall back to the default learner subject identifier.</p>'
            : didNotice === 'conflict'
              ? '<p class="learner-dashboard__notice learner-dashboard__notice--danger">That DID is already linked to another learner profile in this tenant.</p>'
              : '<p class="learner-dashboard__notice learner-dashboard__notice--danger">DID must use one of the supported methods: did:key, did:web, or did:ion.</p>';
    const didValue = learnerDid ?? '';
    const didDetailsOpenAttribute = didNotice === null ? '' : ' open';
    const didSummaryText =
      learnerDid === null
        ? 'No learner DID is currently configured.'
        : 'A learner DID is configured for future badge issuance.';
    const didSummaryPillClass =
      learnerDid === null
        ? 'learner-dashboard__summary-pill'
        : 'learner-dashboard__summary-pill learner-dashboard__summary-pill--configured';
    const didSummaryPillLabel = learnerDid === null ? 'Optional' : 'Configured';
    const didSummaryMarkup =
      learnerDid === null
        ? '<p class="learner-dashboard__subtle">No learner DID is currently configured.</p>'
        : `<p class="learner-dashboard__subtle learner-dashboard__subtle--break">Current DID: <code>${escapeHtml(learnerDid)}</code></p>`;
    const didSettingsSection = `<section class="learner-dashboard__profile" aria-labelledby="learner-profile-settings">
      <div class="learner-dashboard__section-heading learner-dashboard__section-heading--compact">
        <div>
          <p class="learner-dashboard__eyebrow learner-dashboard__eyebrow--section">Profile settings</p>
          <h2 id="learner-profile-settings">Learner DID and privacy</h2>
          <p class="learner-dashboard__section-copy">
            Add an optional learner DID when you want new credentials issued directly to a wallet-friendly identifier.
          </p>
        </div>
      </div>
      <details class="learner-dashboard__profile-details"${didDetailsOpenAttribute}>
        <summary class="learner-dashboard__details-summary">
          <span class="learner-dashboard__details-copy">
            <span class="learner-dashboard__details-title">Manage learner DID</span>
            <span class="learner-dashboard__details-subtitle">${didSummaryText}</span>
          </span>
          <span class="${didSummaryPillClass}">${didSummaryPillLabel}</span>
        </summary>
        <div class="learner-dashboard__details-panel">
          ${didNoticeMarkup}
          ${didSummaryMarkup}
          <p class="learner-dashboard__subtle">
            Supported methods: <code>did:key</code>, <code>did:web</code>, and <code>did:ion</code>.
          </p>
          <form method="post" action="/tenants/${encodeURIComponent(tenantId)}/learner/settings/did" class="learner-dashboard__did-form">
            <label class="learner-dashboard__did-label">
              Learner DID
              <input
                name="did"
                type="text"
                value="${escapeHtml(didValue)}"
                placeholder="did:key:z6Mk..."
                class="learner-dashboard__did-input"
              />
            </label>
            <div class="learner-dashboard__button-row">
              <button type="submit" class="learner-dashboard__button learner-dashboard__button--primary">Save DID</button>
              <button
                type="submit"
                name="did"
                value=""
                class="learner-dashboard__button learner-dashboard__button--ghost"
              >
                Clear DID
              </button>
            </div>
          </form>
        </div>
      </details>
    </section>`;

    const badgesMarkup =
      badges.length === 0
        ? `<section class="learner-dashboard__collection" aria-labelledby="learner-badges">
            <div class="learner-dashboard__section-heading">
              <div>
                <p class="learner-dashboard__eyebrow learner-dashboard__eyebrow--section">Issued credentials</p>
                <h2 id="learner-badges">Your badges</h2>
                <p class="learner-dashboard__section-copy">
                  Earned credentials will appear here with an official public badge page ready to share and verify.
                </p>
              </div>
            </div>
            <div class="learner-dashboard__empty-state">
              <p class="learner-dashboard__subtle">No badges have been issued to this learner account yet.</p>
              <p class="learner-dashboard__subtle">
                When a credential is published, it will show up here with its verification page for employers and reviewers.
              </p>
            </div>
          </section>`
        : `<section class="learner-dashboard__collection" aria-labelledby="learner-badges">
            <div class="learner-dashboard__section-heading">
              <div>
                <p class="learner-dashboard__eyebrow learner-dashboard__eyebrow--section">Issued credentials</p>
                <h2 id="learner-badges">Your badges</h2>
                <p class="learner-dashboard__section-copy">
                  Every badge below includes its official public page so hiring teams and reviewers can verify the credential directly.
                </p>
              </div>
            </div>
            <div class="learner-dashboard__badge-grid">${badges
              .map((badge) => {
                const statusLabel = badge.revokedAt === null ? 'Verified' : 'Revoked';
                const statusClass =
                  badge.revokedAt === null
                    ? 'learner-dashboard__badge-status learner-dashboard__badge-status--verified'
                    : 'learner-dashboard__badge-status learner-dashboard__badge-status--revoked';
                const badgeCardClass =
                  badge.revokedAt === null
                    ? 'learner-dashboard__badge-card learner-dashboard__badge-card--verified'
                    : 'learner-dashboard__badge-card learner-dashboard__badge-card--revoked';
                const badgeEyebrow =
                  badge.revokedAt === null ? 'Earned credential' : 'Credential history';
                const publicBadgeId = badge.assertionPublicId ?? badge.assertionId;
                const publicBadgePath = `/badges/${encodeURIComponent(publicBadgeId)}`;
                const publicBadgeUrl = new URL(publicBadgePath, requestUrl).toString();
                const descriptionMarkup =
                  badge.badgeDescription === null
                    ? ''
                    : `<p class="learner-dashboard__badge-description">${escapeHtml(badge.badgeDescription)}</p>`;
                const revokedAtMarkup =
                  badge.revokedAt === null
                    ? ''
                    : `<p class="learner-dashboard__danger">Revoked at ${escapeHtml(formatIsoTimestamp(badge.revokedAt))} UTC</p>`;

                return `<article class="${badgeCardClass}">
                  <div class="learner-dashboard__badge-topline">
                    <span class="learner-dashboard__badge-eyebrow">${badgeEyebrow}</span>
                    <span class="${statusClass}">${statusLabel}</span>
                  </div>
                  <h3>${escapeHtml(badge.badgeTitle)}</h3>
                  ${descriptionMarkup}
                  <div class="learner-dashboard__badge-meta">
                    <div>
                      <p class="learner-dashboard__meta-label">Issued</p>
                      <p class="learner-dashboard__meta-value">${escapeHtml(formatIsoTimestamp(badge.issuedAt))} UTC</p>
                    </div>
                    <div>
                      <p class="learner-dashboard__meta-label">Verification page</p>
                      <a class="learner-dashboard__badge-link" href="${escapeHtml(publicBadgePath)}">View public badge</a>
                    </div>
                  </div>
                  ${revokedAtMarkup}
                  <p class="learner-dashboard__badge-url">${escapeHtml(publicBadgeUrl)}</p>
                </article>`;
              })
              .join('')}</div>
          </section>`;

    return renderPageShell(
      'Learner dashboard | CredTrail',
      `<style>
        .learner-dashboard {
          --learner-ink: #12314f;
          --learner-ink-soft: #47627d;
          --learner-line: rgba(0, 39, 76, 0.14);
          --learner-line-strong: rgba(0, 39, 76, 0.2);
          --learner-surface: linear-gradient(180deg, rgba(255, 252, 244, 0.98), rgba(244, 249, 255, 0.96));
          --learner-shadow: 0 16px 32px rgba(0, 39, 76, 0.1);
          display: grid;
          gap: clamp(1.4rem, 1.15rem + 0.95vw, 2.2rem);
          max-width: 70rem;
        }

        .learner-dashboard__hero {
          display: grid;
          gap: 1.2rem;
          border: 1px solid rgba(0, 39, 76, 0.18);
          border-radius: 1.4rem;
          padding: clamp(1.25rem, 1rem + 1vw, 2rem);
          background:
            radial-gradient(circle at 88% 16%, rgba(255, 210, 82, 0.33), transparent 34%),
            linear-gradient(144deg, rgba(8, 32, 53, 0.97), rgba(14, 70, 112, 0.94));
          color: #f8fcff;
          box-shadow: 0 24px 40px rgba(0, 39, 76, 0.2);
        }

        @media (min-width: 48rem) {
          .learner-dashboard__hero {
            grid-template-columns: minmax(0, 1.6fr) minmax(16rem, 0.8fr);
            align-items: end;
          }
        }

        .learner-dashboard__eyebrow {
          margin: 0 0 0.55rem 0;
          color: #f6d87d;
          font-size: 0.77rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .learner-dashboard__eyebrow--section {
          color: #8a6520;
        }

        .learner-dashboard__hero h1 {
          margin: 0;
          max-width: 12ch;
          color: #f8fcff;
          font-size: clamp(2rem, 1.5rem + 1.7vw, 3.15rem);
          line-height: 1.04;
        }

        .learner-dashboard__hero-lead {
          margin: 0.6rem 0 0 0;
          max-width: 42rem;
          color: rgba(248, 252, 255, 0.94);
          font-size: clamp(1rem, 0.93rem + 0.45vw, 1.22rem);
        }

        .learner-dashboard__hero-note {
          margin: 0.75rem 0 0 0;
          max-width: 40rem;
          color: rgba(248, 252, 255, 0.88);
        }

        .learner-dashboard__hero-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
          margin: 1rem 0 0 0;
          padding: 0;
          list-style: none;
        }

        .learner-dashboard__hero-chip {
          display: inline-flex;
          align-items: center;
          min-height: 2.2rem;
          padding: 0.45rem 0.8rem;
          border: 1px solid rgba(246, 216, 125, 0.24);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          color: #f8fcff;
          font-size: 0.88rem;
          font-weight: 600;
        }

        .learner-dashboard__hero-card {
          display: grid;
          gap: 0.45rem;
          align-self: stretch;
          border: 1px solid rgba(245, 198, 75, 0.34);
          border-radius: 1.15rem;
          padding: 1rem;
          background: linear-gradient(180deg, rgba(255, 248, 224, 0.97), rgba(241, 247, 255, 0.93));
          color: var(--learner-ink);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
        }

        .learner-dashboard__hero-card-label {
          margin: 0;
          color: #73511a;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .learner-dashboard__hero-card-value {
          margin: 0;
          color: var(--learner-ink);
          font-size: 1.22rem;
          font-weight: 700;
          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .learner-dashboard__hero-card-note {
          margin: 0;
          color: #415f7c;
        }

        .learner-dashboard__subtle {
          margin: 0;
          color: var(--learner-ink-soft);
        }

        .learner-dashboard__subtle--break {
          overflow-wrap: anywhere;
        }

        .learner-dashboard__danger {
          margin: 0;
          color: #9c1f15;
          font-weight: 600;
        }

        .learner-dashboard__collection,
        .learner-dashboard__profile {
          display: grid;
          gap: 1rem;
        }

        .learner-dashboard__section-heading {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: end;
        }

        .learner-dashboard__section-heading--compact {
          align-items: start;
        }

        .learner-dashboard__section-heading h2 {
          margin: 0;
          color: var(--learner-ink);
        }

        .learner-dashboard__section-copy {
          margin: 0.35rem 0 0 0;
          max-width: 44rem;
          color: var(--learner-ink-soft);
        }

        .learner-dashboard__empty-state {
          display: grid;
          gap: 0.55rem;
          border: 1px dashed rgba(0, 39, 76, 0.18);
          border-radius: 1.15rem;
          padding: 1.15rem;
          background: linear-gradient(180deg, rgba(255, 252, 244, 0.86), rgba(247, 250, 255, 0.92));
        }

        .learner-dashboard__notice {
          margin: 0;
          font-weight: 600;
          border-radius: 0.7rem;
          padding: 0.55rem 0.65rem;
        }

        .learner-dashboard__notice--success {
          color: #0a6f47;
          background: #eafbf1;
          border: 1px solid #bfead0;
        }

        .learner-dashboard__notice--info {
          color: #214363;
          background: #edf6ff;
          border: 1px solid #c7dff9;
        }

        .learner-dashboard__notice--danger {
          color: #932618;
          background: #fff1ef;
          border: 1px solid #f7ccc7;
        }

        .learner-dashboard__did-form {
          display: grid;
          gap: 0.6rem;
        }

        .learner-dashboard__profile-details {
          border: 1px solid var(--learner-line);
          border-radius: 1.15rem;
          background: linear-gradient(180deg, rgba(251, 252, 255, 0.98), rgba(244, 248, 252, 0.96));
          box-shadow: var(--learner-shadow);
        }

        .learner-dashboard__details-summary {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
          padding: 1rem 1.05rem;
          cursor: pointer;
          list-style: none;
        }

        .learner-dashboard__details-summary::-webkit-details-marker {
          display: none;
        }

        .learner-dashboard__details-copy {
          display: grid;
          gap: 0.18rem;
        }

        .learner-dashboard__details-title {
          color: var(--learner-ink);
          font-weight: 700;
        }

        .learner-dashboard__details-subtitle {
          color: var(--learner-ink-soft);
        }

        .learner-dashboard__summary-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 2rem;
          padding: 0.3rem 0.7rem;
          border: 1px solid rgba(11, 90, 169, 0.16);
          border-radius: 999px;
          background: rgba(237, 246, 255, 0.9);
          color: #20476c;
          font-size: 0.82rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .learner-dashboard__summary-pill--configured {
          border-color: #bfead0;
          background: #eafbf1;
          color: #0a6f47;
        }

        .learner-dashboard__details-panel {
          display: grid;
          gap: 0.75rem;
          padding: 0 1.05rem 1.05rem;
          border-top: 1px solid rgba(0, 39, 76, 0.08);
        }

        .learner-dashboard__did-label {
          font-weight: 600;
          display: grid;
          gap: 0.3rem;
          color: var(--learner-ink);
        }

        .learner-dashboard__did-input {
          min-height: 2.9rem;
          padding: 0.72rem 0.82rem;
          border: 1px solid var(--learner-line-strong);
          border-radius: 0.6rem;
          font-size: 0.95rem;
          color: var(--learner-ink);
          background: rgba(255, 255, 255, 0.96);
        }

        .learner-dashboard__button-row {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .learner-dashboard__button {
          min-height: 2.75rem;
          padding: 0.55rem 0.95rem;
          border: 1px solid transparent;
          border-radius: 0.6rem;
          font-weight: 600;
          cursor: pointer;
        }

        .learner-dashboard__button--primary {
          color: #f9fcff;
          background: linear-gradient(115deg, #00274c 0%, #0b5aa9 85%);
        }

        .learner-dashboard__button--ghost {
          border-color: rgba(0, 39, 76, 0.18);
          color: #12375e;
          background: rgba(255, 255, 255, 0.92);
        }

        .learner-dashboard__badge-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fit, minmax(min(19rem, 100%), 1fr));
        }

        .learner-dashboard__badge-card {
          position: relative;
          display: grid;
          gap: 0.8rem;
          border: 1px solid var(--learner-line);
          border-radius: 1.2rem;
          padding: 1.15rem;
          background: var(--learner-surface);
          box-shadow: var(--learner-shadow);
          overflow: hidden;
        }

        .learner-dashboard__badge-card::before {
          content: '';
          position: absolute;
          inset: 0 0 auto 0;
          height: 0.32rem;
          background: linear-gradient(90deg, rgba(236, 183, 43, 0.96), rgba(73, 118, 176, 0.82));
        }

        .learner-dashboard__badge-card--revoked {
          background: linear-gradient(180deg, rgba(255, 245, 243, 0.98), rgba(249, 247, 247, 0.96));
          border-color: rgba(148, 38, 24, 0.16);
        }

        .learner-dashboard__badge-card--revoked::before {
          background: linear-gradient(90deg, rgba(173, 70, 52, 0.82), rgba(120, 45, 33, 0.96));
        }

        .learner-dashboard__badge-topline {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .learner-dashboard__badge-eyebrow {
          color: #7b5a22;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.11em;
          text-transform: uppercase;
        }

        .learner-dashboard__badge-card--revoked .learner-dashboard__badge-eyebrow {
          color: #8a463d;
        }

        .learner-dashboard__badge-card h3 {
          margin: 0;
          color: var(--learner-ink);
          line-height: 1.2;
        }

        .learner-dashboard__badge-description {
          margin: 0;
          color: var(--learner-ink-soft);
        }

        .learner-dashboard__badge-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 1.9rem;
          padding: 0.35rem 0.8rem;
          border: 1px solid transparent;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .learner-dashboard__badge-status--verified {
          color: #0a6f47;
          background: #eafbf1;
          border-color: #bfead0;
        }

        .learner-dashboard__badge-status--revoked {
          color: #932618;
          background: #fff1ef;
          border-color: #f7ccc7;
        }

        .learner-dashboard__badge-meta {
          display: grid;
          gap: 0.8rem;
          grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
        }

        .learner-dashboard__meta-label {
          margin: 0;
          color: #7a5c24;
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .learner-dashboard__badge-card--revoked .learner-dashboard__meta-label {
          color: #8a463d;
        }

        .learner-dashboard__meta-value {
          margin: 0.18rem 0 0 0;
          color: var(--learner-ink);
          font-weight: 600;
        }

        .learner-dashboard__badge-link {
          display: inline-flex;
          align-items: center;
          min-height: 2.75rem;
          padding: 0.2rem 0;
          color: #0e4f87;
          font-weight: 700;
          text-decoration: none;
        }

        .learner-dashboard__badge-link:hover {
          text-decoration: underline;
        }

        .learner-dashboard__badge-url {
          margin: 0;
          color: #577089;
          font-size: 0.87rem;
          overflow-wrap: anywhere;
        }
      </style>
      <section class="learner-dashboard">
        <header class="learner-dashboard__hero">
          <div>
            <p class="learner-dashboard__eyebrow">Learner dashboard</p>
            <h1>Your credential collection</h1>
            <p class="learner-dashboard__hero-lead">${heroLead}</p>
            <p class="learner-dashboard__hero-note">${heroNote}</p>
            <ul class="learner-dashboard__hero-chips">
              <li class="learner-dashboard__hero-chip">${badgeCountLabel}</li>
              <li class="learner-dashboard__hero-chip">Public verification ready</li>
              <li class="learner-dashboard__hero-chip">${learnerDid === null ? 'Optional DID available' : 'Learner DID configured'}</li>
            </ul>
          </div>
          <div class="learner-dashboard__hero-card">
            <p class="learner-dashboard__hero-card-label">Tenant record</p>
            <p class="learner-dashboard__hero-card-value">${escapeHtml(tenantId)}</p>
            ${latestIssuedMarkup}
          </div>
        </header>
        ${badgesMarkup}
        ${didSettingsSection}
      </section>`,
    );
  };
};
