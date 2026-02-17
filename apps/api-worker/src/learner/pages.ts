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
    const didSummaryMarkup =
      learnerDid === null
        ? '<p class="learner-dashboard__subtle">No learner DID is currently configured.</p>'
        : `<p class="learner-dashboard__subtle" style="overflow-wrap:anywhere;">Current DID: <code>${escapeHtml(learnerDid)}</code></p>`;
    const didSettingsCard = `<article class="learner-dashboard__card">
      <h2>Profile settings</h2>
      <p class="learner-dashboard__subtle">
        Set an optional learner DID to issue privacy-preserving badges directly to your wallet identifier.
        Supported methods: <code>did:key</code>, <code>did:web</code>, and <code>did:ion</code>.
      </p>
      ${didNoticeMarkup}
      ${didSummaryMarkup}
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
    </article>`;

    const badgesMarkup =
      badges.length === 0
        ? '<p style="margin:0;">No badges have been issued to this learner account yet.</p>'
        : `<div class="learner-dashboard__badge-grid">${badges
            .map((badge) => {
              const statusLabel = badge.revokedAt === null ? 'Verified' : 'Revoked';
              const statusVariant = badge.revokedAt === null ? 'success' : 'danger';
              const publicBadgeId = badge.assertionPublicId ?? badge.assertionId;
              const publicBadgePath = `/badges/${encodeURIComponent(publicBadgeId)}`;
              const publicBadgeUrl = new URL(publicBadgePath, requestUrl).toString();
              const descriptionMarkup =
                badge.badgeDescription === null
                  ? ''
                  : `<p class="learner-dashboard__subtle">${escapeHtml(badge.badgeDescription)}</p>`;
              const revokedAtMarkup =
                badge.revokedAt === null
                  ? ''
                  : `<p class="learner-dashboard__danger">Revoked at ${escapeHtml(formatIsoTimestamp(badge.revokedAt))} UTC</p>`;

              return `<article class="learner-dashboard__card">
                <div class="learner-dashboard__badge-header">
                  <h3>${escapeHtml(badge.badgeTitle)}</h3>
                  <sl-badge variant="${statusVariant}" pill>${statusLabel}</sl-badge>
                </div>
                ${descriptionMarkup}
                <p class="learner-dashboard__subtle">Issued at ${escapeHtml(formatIsoTimestamp(badge.issuedAt))} UTC</p>
                ${revokedAtMarkup}
                <p class="learner-dashboard__subtle">
                  Public badge page:
                  <a href="${escapeHtml(publicBadgePath)}">${escapeHtml(publicBadgeUrl)}</a>
                </p>
              </article>`;
            })
            .join('')}</div>`;

    return renderPageShell(
      'Learner dashboard | CredTrail',
      `<style>
        .learner-dashboard {
          display: grid;
          gap: 1rem;
          max-width: 62rem;
        }

        .learner-dashboard__hero {
          border: 1px solid rgba(0, 39, 76, 0.18);
          border-radius: 1rem;
          padding: 1rem;
          background:
            radial-gradient(circle at 92% 12%, rgba(255, 203, 5, 0.27), transparent 44%),
            linear-gradient(132deg, rgba(0, 39, 76, 0.94), rgba(12, 83, 158, 0.9));
          color: #f8fcff;
          box-shadow: 0 18px 30px rgba(0, 39, 76, 0.2);
        }

        .learner-dashboard__hero h1 {
          margin: 0;
          color: #f8fcff;
        }

        .learner-dashboard__hero p {
          margin: 0.2rem 0 0 0;
          color: rgba(248, 252, 255, 0.88);
        }

        .learner-dashboard__card {
          display: grid;
          gap: 0.7rem;
          border: 1px solid rgba(0, 39, 76, 0.14);
          border-radius: 1rem;
          padding: 1rem;
          background: linear-gradient(165deg, rgba(255, 255, 255, 0.96), rgba(247, 251, 255, 0.94));
          box-shadow: 0 12px 24px rgba(0, 39, 76, 0.11);
        }

        .learner-dashboard__subtle {
          margin: 0;
          color: #405f82;
        }

        .learner-dashboard__danger {
          margin: 0;
          color: #9c1f15;
          font-weight: 600;
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

        .learner-dashboard__did-label {
          font-weight: 600;
          display: grid;
          gap: 0.3rem;
        }

        .learner-dashboard__did-input {
          padding: 0.6rem 0.68rem;
          border: 1px solid rgba(0, 39, 76, 0.2);
          border-radius: 0.6rem;
          font-size: 0.95rem;
        }

        .learner-dashboard__button-row {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .learner-dashboard__button {
          padding: 0.5rem 0.95rem;
          border-radius: 0.6rem;
          font-weight: 600;
          cursor: pointer;
        }

        .learner-dashboard__button--primary {
          border: 1px solid transparent;
          color: #f9fcff;
          background: linear-gradient(115deg, #00274c 0%, #0b5aa9 85%);
        }

        .learner-dashboard__button--ghost {
          border: 1px solid rgba(0, 39, 76, 0.26);
          color: #12375e;
          background: #ffffff;
        }

        .learner-dashboard__badge-grid {
          display: grid;
          gap: 0.9rem;
        }

        .learner-dashboard__badge-header {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .learner-dashboard__badge-header h3 {
          margin: 0;
        }
      </style>
      <section class="learner-dashboard">
        <header class="learner-dashboard__hero">
          <h1>Your badges</h1>
          <p>Tenant: ${escapeHtml(tenantId)}</p>
        </header>
        ${didSettingsCard}
        ${badgesMarkup}
      </section>`,
    );
  };
};
