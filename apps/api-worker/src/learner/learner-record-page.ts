import { renderPageShell } from "@credtrail/ui-components";

import type {
  LearnerRecordPresentationItem,
  LearnerRecordPresentationModel,
  LearnerRecordPresentationSection,
} from "../learner-record/learner-record-presentation";
import { renderPageAssetTags } from "../ui/page-assets";

interface CreateLearnerRecordPageInput {
  escapeHtml: (value: string) => string;
  formatIsoTimestamp: (value: string) => string;
}

const countLabel = (count: number, noun: string): string => {
  return count === 1 ? `1 ${noun}` : `${count} ${noun}s`;
};

const shouldFormatAsTimestamp = (label: string): boolean => {
  return label === "Issued" || label === "Revised" || label === "Revoked";
};

export const createLearnerRecordPage = (input: CreateLearnerRecordPageInput) => {
  const { escapeHtml, formatIsoTimestamp } = input;

  const renderDetailRows = (
    rows: readonly { label: string; value: string }[],
    emptyMessage: string,
  ): string => {
    if (rows.length === 0) {
      return `<p class="learner-record__subtle">${escapeHtml(emptyMessage)}</p>`;
    }

    return `<dl class="learner-record__detail-list">
      ${rows
        .map((row) => {
          const value = shouldFormatAsTimestamp(row.label)
            ? `${formatIsoTimestamp(row.value)} UTC`
            : row.value;

          return `<div class="learner-record__detail-row">
            <dt>${escapeHtml(row.label)}</dt>
            <dd>${escapeHtml(value)}</dd>
          </div>`;
        })
        .join("")}
    </dl>`;
  };

  const renderEvidenceLinks = (item: LearnerRecordPresentationItem): string => {
    if (item.evidenceLinks.length === 0) {
      return "";
    }

    return `<div class="learner-record__meta-block">
      <h4>Evidence</h4>
      <ul class="learner-record__link-list">
        ${item.evidenceLinks
          .map((href) => {
            return `<li><a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
              href,
            )}</a></li>`;
          })
          .join("")}
      </ul>
    </div>`;
  };

  const renderItem = (item: LearnerRecordPresentationItem): string => {
    const descriptionMarkup =
      item.description === null
        ? ""
        : `<p class="learner-record__card-description">${escapeHtml(item.description)}</p>`;
    const publicBadgeMarkup =
      item.publicBadgePath === null
        ? ""
        : `<a class="learner-record__card-action" href="${escapeHtml(item.publicBadgePath)}">Open public badge</a>`;

    return `<article class="learner-record__card">
      <div class="learner-record__card-topline">
        <p class="learner-record__card-kicker">${escapeHtml(item.recordTypeLabel)}</p>
        <div class="learner-record__pill-row">
          <span class="learner-record__pill learner-record__pill--trust">${escapeHtml(item.trustLabel)}</span>
          <span class="learner-record__pill learner-record__pill--status learner-record__pill--status-${escapeHtml(
            item.status,
          )}">${escapeHtml(item.statusLabel)}</span>
        </div>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      ${descriptionMarkup}
      <p class="learner-record__provenance">${escapeHtml(item.provenanceSummary)}</p>
      <div class="learner-record__meta-grid">
        <section class="learner-record__meta-block">
          <h4>Record details</h4>
          ${renderDetailRows(item.details, "No additional record details are attached to this item.")}
        </section>
        <section class="learner-record__meta-block">
          <h4>Provenance</h4>
          ${renderDetailRows(item.provenanceDetails, "No provenance details are available.")}
        </section>
      </div>
      ${renderEvidenceLinks(item)}
      ${publicBadgeMarkup}
    </article>`;
  };

  const renderSection = (section: LearnerRecordPresentationSection): string => {
    return `<section class="learner-record__section" aria-labelledby="section-${escapeHtml(section.key)}">
      <div class="learner-record__section-heading">
        <div>
          <p class="learner-record__section-kicker">${escapeHtml(section.itemCountLabel)}</p>
          <h2 id="section-${escapeHtml(section.key)}">${escapeHtml(section.title)}</h2>
          <p>${escapeHtml(section.description)}</p>
        </div>
      </div>
      <div class="learner-record__card-grid">
        ${section.items.map((item) => renderItem(item)).join("")}
      </div>
    </section>`;
  };

  return (
    tenantId: string,
    presentation: LearnerRecordPresentationModel,
    options: {
      switchOrganizationPath?: string | null;
    } = {},
  ): string => {
    const learnerLabel = presentation.learnerDisplayName ?? "This learner";
    const dashboardPath = `/tenants/${encodeURIComponent(tenantId)}/learner/dashboard`;
    const heroLead =
      presentation.summary.total === 0
        ? "This unified record is ready for its first badge or learner-record entry."
        : `${countLabel(
            presentation.summary.issuerVerified,
            "institution-verified item",
          )} and ${countLabel(
            presentation.summary.supplemental,
            "learner-supplemental item",
          )} now live in one learner-facing record.`;
    const switchOrganizationMarkup =
      options.switchOrganizationPath === undefined ||
      options.switchOrganizationPath === null ||
      options.switchOrganizationPath.trim().length === 0
        ? ""
        : `<a class="learner-record__hero-link learner-record__hero-link--secondary" href="${escapeHtml(
            options.switchOrganizationPath,
          )}">Switch organization</a>`;
    const emptyStateMarkup =
      presentation.sections.length > 0
        ? ""
        : `<section class="learner-record__empty-state">
            <h2>Nothing has been added yet</h2>
            <p>This learner account does not have any badge assertions or non-badge learner-record entries yet.</p>
          </section>`;

    return renderPageShell(
      "Learner record | CredTrail",
      `<main class="learner-record">
        <section class="learner-record__hero">
          <div class="learner-record__hero-copy">
            <p class="learner-record__eyebrow">Unified learner record</p>
            <h1>${escapeHtml(learnerLabel)}</h1>
            <p class="learner-record__hero-lead">${escapeHtml(heroLead)}</p>
            <p class="learner-record__hero-note">
              Badges and non-badge achievements stay together here, with trust and history made explicit instead of hidden in separate tools.
            </p>
            <div class="learner-record__hero-actions">
              <a class="learner-record__hero-link" href="${escapeHtml(dashboardPath)}">Return to learner dashboard</a>
              ${switchOrganizationMarkup}
            </div>
          </div>
          <div class="learner-record__hero-metrics">
            <article class="learner-record__metric-card">
              <p class="learner-record__metric-label">Total record items</p>
              <p class="learner-record__metric-value">${escapeHtml(String(presentation.summary.total))}</p>
              <p class="learner-record__metric-note">${escapeHtml(countLabel(presentation.summary.badgeAssertions, "badge"))} · ${escapeHtml(
                countLabel(presentation.summary.recordEntries, "record entry"),
              )}</p>
            </article>
            <article class="learner-record__metric-card">
              <p class="learner-record__metric-label">Currently active</p>
              <p class="learner-record__metric-value">${escapeHtml(String(presentation.summary.active))}</p>
              <p class="learner-record__metric-note">${escapeHtml(String(presentation.summary.historical))} historical</p>
            </article>
          </div>
        </section>
        ${emptyStateMarkup}
        ${presentation.sections.map((section) => renderSection(section)).join("")}
      </main>`,
      renderPageAssetTags(["foundationCss", "learnerRecordCss"]),
    );
  };
};
