import { renderPageShell } from "@credtrail/ui-components";

import type { TenantExecutiveDashboardRecord } from "./executive-rollup-loader";
import { buildExecutiveDashboardQueryEntries } from "./executive-dashboard-paths";
import { renderPageAssetTags } from "../ui/page-assets";
import { escapeHtml, formatIsoTimestamp } from "../utils/display-format";

interface ExecutiveMetricSummary {
  issued: number;
  active: number;
  claimRate: number;
  shareRate: number;
}

const formatCount = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
};

const titleCase = (value: string): string => {
  return value
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

const buildExecutiveApiPath = (
  tenantId: string,
  query: Parameters<typeof buildExecutiveDashboardQueryEntries>[0],
): string => {
  const url = new URL(`/v1/tenants/${encodeURIComponent(tenantId)}/executive`, "https://credtrail.local");

  for (const [key, value] of buildExecutiveDashboardQueryEntries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    url.searchParams.set(key, value);
  }

  return url.searchParams.size === 0 ? url.pathname : `${url.pathname}${url.search}`;
};

const summarizeExecutiveMetrics = (
  dashboard: TenantExecutiveDashboardRecord,
): ExecutiveMetricSummary => {
  if (dashboard.rollup.rows.length === 0) {
    return {
      issued: dashboard.overview.counts.issued,
      active: dashboard.overview.counts.active,
      claimRate: dashboard.overview.counts.claimRate ?? 0,
      shareRate: dashboard.overview.counts.shareRate ?? 0,
    };
  }

  const totals = dashboard.rollup.rows.reduce(
    (accumulator, row) => {
      accumulator.issued += row.issuedCount;
      accumulator.claims += row.learnerClaimCount;
      accumulator.shares += row.shareClickCount;
      return accumulator;
    },
    {
      issued: 0,
      claims: 0,
      shares: 0,
    },
  );

  return {
    issued: totals.issued,
    active: dashboard.overview.counts.active,
    claimRate: totals.issued === 0 ? 0 : (totals.claims / totals.issued) * 100,
    shareRate: totals.issued === 0 ? 0 : (totals.shares / totals.issued) * 100,
  };
};

const renderExecutiveMetrics = (dashboard: TenantExecutiveDashboardRecord): string => {
  const metricSummary = summarizeExecutiveMetrics(dashboard);
  const metricValues = new Map<string, string>([
    ["issued", formatCount(metricSummary.issued)],
    ["active", formatCount(metricSummary.active)],
    ["claimRate", `${formatPercent(metricSummary.claimRate)}%`],
    ["shareRate", `${formatPercent(metricSummary.shareRate)}%`],
  ]);

  return dashboard.kpiCatalog.kpis
    .map((kpi, index) => {
      const value = metricValues.get(kpi.key) ?? "Tracked";
      const cardClass = index === 0 ? "executive-kpi-card executive-kpi-card--primary" : "executive-kpi-card";

      return `<article class="${cardClass}">
        <p class="executive-kpi-label">${escapeHtml(kpi.label)}</p>
        <p class="executive-kpi-value">${escapeHtml(value)}</p>
        <p class="executive-kpi-description">${escapeHtml(kpi.description)}</p>
      </article>`;
    })
    .join("");
};

const renderExecutiveModules = (dashboard: TenantExecutiveDashboardRecord): string => {
  return dashboard.kpiCatalog.modules
    .map((module) => {
      return `<li class="executive-summary-item">
        <strong>${escapeHtml(module.title)}</strong>
        <p>${escapeHtml(module.description)}</p>
      </li>`;
    })
    .join("");
};

const renderExecutiveRollupRows = (dashboard: TenantExecutiveDashboardRecord): string => {
  if (dashboard.rollup.rows.length === 0) {
    return `<li class="executive-summary-item">
      <strong>No deeper comparison slice is visible</strong>
      <p>The current executive focus stays at ${escapeHtml(dashboard.rollup.focusDisplayName)} so the dashboard stays summary-first instead of inventing a ranking story.</p>
    </li>`;
  }

  return dashboard.rollup.rows
    .slice(0, 5)
    .map((row) => {
      return `<li class="executive-summary-item">
        <strong>${escapeHtml(row.displayName)}</strong>
        <p>${escapeHtml(
          `Issued ${formatCount(row.issuedCount)} · Claim ${formatPercent(row.claimRate)}% · Share ${formatPercent(row.shareRate)}%`,
        )}</p>
      </li>`;
    })
    .join("");
};

const renderStoryCards = (dashboard: TenantExecutiveDashboardRecord): string => {
  return [
    {
      label: "Current slice",
      value: titleCase(dashboard.defaults.audience),
      detail: `Focused on ${dashboard.rollup.focusDisplayName}`,
    },
    {
      label: "Compare next",
      value: titleCase(dashboard.rollup.comparisonLevel),
      detail:
        dashboard.rollup.rows.length === 0
          ? "No deeper visible slice is available yet."
          : `${formatCount(dashboard.rollup.rows.length)} visible rows in this slice`,
    },
    {
      label: "Generated",
      value: formatIsoTimestamp(dashboard.rollup.generatedAt),
      detail: "Same reporting truth as the JSON executive payload",
    },
  ]
    .map((item) => {
      return `<article class="executive-story-card">
        <p class="executive-story-card-label">${escapeHtml(item.label)}</p>
        <p class="executive-story-card-value">${escapeHtml(item.value)}</p>
        <p class="executive-story-card-detail">${escapeHtml(item.detail)}</p>
      </article>`;
    })
    .join("");
};

export const renderExecutiveDashboardPage = (dashboard: TenantExecutiveDashboardRecord): string => {
  const jsonPath = buildExecutiveApiPath(dashboard.tenantId, {
    window: dashboard.defaults.window === "custom" ? undefined : dashboard.defaults.window,
    audience: dashboard.defaults.audience,
    issuedFrom: dashboard.defaults.reportingFilters.issuedFrom,
    issuedTo: dashboard.defaults.reportingFilters.issuedTo,
    badgeTemplateId: dashboard.defaults.reportingFilters.badgeTemplateId,
    orgUnitId: dashboard.defaults.reportingFilters.orgUnitId,
    state: dashboard.defaults.reportingFilters.state,
    focusOrgUnitId: dashboard.defaults.focusOrgUnitId,
    comparisonLevel: dashboard.defaults.comparisonLevel,
  });

  return renderPageShell(
    "Executive Dashboard",
    `<section class="executive-dashboard" data-executive-audience="${escapeHtml(dashboard.defaults.audience)}">
      <section class="executive-hero">
        <p class="executive-eyebrow">Read-only executive summary</p>
        <h1>Executive Dashboard</h1>
        <p class="executive-subtitle">System and campus leaders get a summary-first view of issuance, claims, sharing, and hierarchy comparisons without crossing into operational admin work.</p>
        <div class="executive-context">
          <article class="executive-context-item">
            <p class="executive-context-label">Audience</p>
            <p class="executive-context-value">${escapeHtml(titleCase(dashboard.defaults.audience))}</p>
          </article>
          <article class="executive-context-item">
            <p class="executive-context-label">Focus</p>
            <p class="executive-context-value">${escapeHtml(dashboard.rollup.focusDisplayName)}</p>
          </article>
          <article class="executive-context-item">
            <p class="executive-context-label">Comparison level</p>
            <p class="executive-context-value">${escapeHtml(titleCase(dashboard.rollup.comparisonLevel))}</p>
          </article>
          <article class="executive-context-item">
            <p class="executive-context-label">Generated</p>
            <p class="executive-context-value">${escapeHtml(formatIsoTimestamp(dashboard.rollup.generatedAt))}</p>
          </article>
        </div>
        <div class="executive-actions">
          <a class="executive-action-link" href="${escapeHtml(jsonPath)}">View JSON payload</a>
        </div>
      </section>

      <section class="executive-first-screen">
        <article class="executive-story">
          <div class="executive-section-header">
            <div>
              <p class="executive-section-kicker">First read</p>
              <h2>Executive snapshot</h2>
            </div>
            <p class="executive-note">The same filters, focus, and scope flow through the read-only JSON endpoint.</p>
          </div>
          <p class="executive-microcopy">This route keeps the story simple: what is happening in the current slice, what level is comparable next, and where leaders should look before they open deeper detail.</p>
          <div class="executive-story-grid">
            ${renderStoryCards(dashboard)}
          </div>
        </article>

        <section class="executive-kpis" aria-label="Executive KPI summary">
          ${renderExecutiveMetrics(dashboard)}
        </section>
      </section>

      <section class="executive-grid">
        <article class="executive-panel">
          <div class="executive-section-header">
            <div>
              <p class="executive-section-kicker">Compare</p>
              <h2>Executive modules</h2>
            </div>
          </div>
          <p>The route stays inside an executive-only story: comparison, top-mover, and drilldown modules with no extra tenant setup burden.</p>
          <ul class="executive-summary-list">
            ${renderExecutiveModules(dashboard)}
          </ul>
        </article>

        <article class="executive-panel">
          <div class="executive-section-header">
            <div>
              <p class="executive-section-kicker">Next phase</p>
              <h2>Trend signal</h2>
            </div>
          </div>
          <p>Trend visuals land next. This foundation page already carries the same time window, state filter, focus unit, and comparison level the richer dashboard will visualize.</p>
          <div class="executive-chip-row">
            <span class="executive-chip">${escapeHtml(`Window ${titleCase(dashboard.defaults.window)}`)}</span>
            <span class="executive-chip">${escapeHtml(`State ${titleCase(dashboard.defaults.reportingFilters.state ?? "all")}`)}</span>
          </div>
        </article>

        <article class="executive-section executive-panel--full">
          <div class="executive-section-header">
            <div>
              <p class="executive-section-kicker">Visible rows</p>
              <h2>Top comparison rows</h2>
            </div>
          </div>
          <p>These rows prove the dashboard is already grounded in current hierarchy and reporting truth instead of a demo-only executive branch.</p>
          <ul class="executive-summary-list">
            ${renderExecutiveRollupRows(dashboard)}
          </ul>
        </article>
      </section>
    </section>`,
    renderPageAssetTags(["foundationCss", "executiveDashboardCss"]),
    "open",
  );
};

export const renderExecutiveUnavailablePage = (): string => {
  return renderPageShell(
    "Executive dashboard unavailable",
    `<section class="executive-dashboard" data-executive-audience="institution">
      <section class="executive-hero">
        <p class="executive-eyebrow">Executive access</p>
        <h1>Executive dashboard unavailable</h1>
        <p class="executive-subtitle">Your tenant membership does not expose an executive dashboard slice.</p>
      </section>
    </section>`,
    renderPageAssetTags(["foundationCss", "executiveDashboardCss"]),
    "open",
  );
};

export const renderInvalidExecutiveDashboardRequestPage = (): string => {
  return renderPageShell(
    "Invalid executive dashboard request",
    `<section class="executive-dashboard" data-executive-audience="institution">
      <section class="executive-hero">
        <p class="executive-eyebrow">Executive access</p>
        <h1>Invalid executive dashboard request</h1>
        <p class="executive-subtitle">The requested executive dashboard filters could not be understood.</p>
      </section>
    </section>`,
    renderPageAssetTags(["foundationCss", "executiveDashboardCss"]),
    "open",
  );
};
