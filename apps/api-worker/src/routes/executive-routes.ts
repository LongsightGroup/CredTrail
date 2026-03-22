import type { SessionRecord, SqlDatabase, TenantMembershipRole } from "@credtrail/db";
import { renderPageShell } from "@credtrail/ui-components";
import { parseTenantExecutiveDashboardQuery, parseTenantPathParams } from "@credtrail/validation";
import type { Hono } from "hono";

import type { AppBindings, AppContext, AppEnv } from "../app";
import { buildExecutiveDashboardQueryEntries } from "../executive/executive-dashboard-paths";
import {
  loadTenantExecutiveDashboard,
  type TenantExecutiveDashboardRecord,
} from "../executive/executive-rollup-loader";
import { renderPageAssetTags } from "../ui/page-assets";
import { escapeHtml, formatIsoTimestamp } from "../utils/display-format";

interface RegisterExecutiveRoutesInput {
  app: Hono<AppEnv>;
  resolveDatabase: (bindings: AppBindings) => SqlDatabase;
  requireTenantRole: (
    c: AppContext,
    tenantId: string,
    allowedRoles: readonly TenantMembershipRole[],
  ) => Promise<
    | {
        session: SessionRecord;
        membershipRole: TenantMembershipRole;
      }
    | Response
  >;
  TENANT_MEMBER_ROLES: readonly TenantMembershipRole[];
}

interface ExecutiveMetricSummary {
  issued: number;
  active: number;
  claimRate: number;
  shareRate: number;
}

const EXECUTIVE_PAGE_HEAD = `${renderPageAssetTags(["foundationCss"])}
<style>
  .executive-dashboard {
    display: grid;
    gap: 1.5rem;
  }

  .executive-hero,
  .executive-panel,
  .executive-kpi-card {
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(13, 46, 84, 0.14);
    border-radius: 1.25rem;
    box-shadow: 0 18px 36px rgba(7, 27, 51, 0.12);
  }

  .executive-hero {
    padding: 1.5rem;
  }

  .executive-eyebrow {
    margin: 0 0 0.75rem;
    color: var(--ct-theme-text-muted);
    font-size: 0.86rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .executive-hero h1 {
    margin: 0;
    font-family: var(--ct-font-display);
    font-size: clamp(2rem, 3vw, 3rem);
    line-height: 1.04;
  }

  .executive-subtitle {
    margin: 0.85rem 0 0;
    max-width: 56rem;
    color: var(--ct-theme-text-body);
    font-size: 1rem;
    line-height: 1.6;
  }

  .executive-context {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 0.85rem;
    margin-top: 1.25rem;
  }

  .executive-context-item {
    padding: 0.9rem 1rem;
    border-radius: 1rem;
    background: linear-gradient(180deg, rgba(237, 244, 252, 0.95), rgba(255, 255, 255, 0.95));
    border: 1px solid rgba(13, 46, 84, 0.1);
  }

  .executive-context-label {
    margin: 0;
    color: var(--ct-theme-text-subtle);
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .executive-context-value {
    margin: 0.4rem 0 0;
    color: var(--ct-theme-text-title);
    font-size: 1rem;
    font-weight: 700;
  }

  .executive-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 1.25rem;
  }

  .executive-action-link {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.72rem 1rem;
    border-radius: 999px;
    background: linear-gradient(120deg, rgba(11, 39, 72, 0.96), rgba(31, 116, 187, 0.96));
    color: #f7fcff;
    font-weight: 700;
    text-decoration: none;
  }

  .executive-grid {
    display: grid;
    gap: 1.2rem;
    grid-template-columns: minmax(0, 1.4fr) minmax(18rem, 1fr);
  }

  .executive-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 0.9rem;
  }

  .executive-kpi-card {
    padding: 1rem 1.05rem;
  }

  .executive-kpi-label {
    margin: 0;
    color: var(--ct-theme-text-muted);
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .executive-kpi-value {
    margin: 0.55rem 0 0;
    color: var(--ct-theme-text-title);
    font-size: 1.8rem;
    font-weight: 700;
  }

  .executive-kpi-description {
    margin: 0.45rem 0 0;
    color: var(--ct-theme-text-muted);
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .executive-panel {
    padding: 1.2rem;
  }

  .executive-panel h2 {
    margin: 0 0 0.35rem;
    font-size: 1.15rem;
  }

  .executive-panel p {
    margin: 0;
    color: var(--ct-theme-text-muted);
    line-height: 1.55;
  }

  .executive-panel + .executive-panel {
    margin-top: 0;
  }

  .executive-module-list,
  .executive-rollup-list {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0;
    display: grid;
    gap: 0.75rem;
  }

  .executive-module-item,
  .executive-rollup-item {
    padding: 0.95rem 1rem;
    border-radius: 1rem;
    background: rgba(244, 248, 253, 0.95);
    border: 1px solid rgba(13, 46, 84, 0.1);
  }

  .executive-module-item strong,
  .executive-rollup-item strong {
    display: block;
    color: var(--ct-theme-text-title);
  }

  .executive-rollup-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 0.45rem;
    color: var(--ct-theme-text-muted);
    font-size: 0.92rem;
  }

  .executive-trend-highlight {
    margin-top: 1rem;
    padding: 0.95rem 1rem;
    border-radius: 1rem;
    background: linear-gradient(180deg, rgba(238, 246, 255, 0.96), rgba(255, 255, 255, 0.96));
    border: 1px solid rgba(15, 95, 166, 0.14);
  }

  @media (max-width: 900px) {
    .executive-grid {
      grid-template-columns: 1fr;
    }
  }
</style>`;

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
    .map((kpi) => {
      const value = metricValues.get(kpi.key) ?? "Tracked";
      return `<article class="executive-kpi-card">
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
      return `<li class="executive-module-item">
        <strong>${escapeHtml(module.title)}</strong>
        <p>${escapeHtml(module.description)}</p>
      </li>`;
    })
    .join("");
};

const renderExecutiveRollupRows = (dashboard: TenantExecutiveDashboardRecord): string => {
  if (dashboard.rollup.rows.length === 0) {
    return `<li class="executive-rollup-item">
      <strong>No deeper comparison slice is visible</strong>
      <p>The current executive focus stays at ${escapeHtml(dashboard.rollup.focusDisplayName)} for an honest summary-first view.</p>
    </li>`;
  }

  return dashboard.rollup.rows
    .slice(0, 5)
    .map((row) => {
      return `<li class="executive-rollup-item">
        <strong>${escapeHtml(row.displayName)}</strong>
        <div class="executive-rollup-meta">
          <span>Issued ${escapeHtml(formatCount(row.issuedCount))}</span>
          <span>Claim ${escapeHtml(formatPercent(row.claimRate))}%</span>
          <span>Share ${escapeHtml(formatPercent(row.shareRate))}%</span>
        </div>
      </li>`;
    })
    .join("");
};

const renderTrendHighlight = (dashboard: TenantExecutiveDashboardRecord): string => {
  const latest = dashboard.trends.series.at(-1) ?? null;
  const previous = dashboard.trends.series.at(-2) ?? null;

  if (latest === null) {
    return `<div class="executive-trend-highlight"><strong>No trend buckets yet.</strong><p>Trend visualization lands in the next phase once the first executive buckets are available.</p></div>`;
  }

  const deltaIssued =
    previous === null ? latest.issuedCount : latest.issuedCount - previous.issuedCount;
  const direction =
    deltaIssued > 0 ? "up" : deltaIssued < 0 ? "down" : "flat";
  const deltaLabel =
    direction === "flat"
      ? "holding steady"
      : `${Math.abs(deltaIssued)} issued ${direction}`;

  return `<div class="executive-trend-highlight">
    <strong>Latest bucket: ${escapeHtml(latest.bucketStart)}</strong>
    <p>${escapeHtml(
      `${formatCount(latest.issuedCount)} issued badges, ${formatCount(latest.learnerClaimCount)} claims, ${formatCount(latest.shareClickCount)} shares. Trend is ${deltaLabel} versus the prior bucket.`,
    )}</p>
  </div>`;
};

const renderExecutiveDashboardPage = (dashboard: TenantExecutiveDashboardRecord): string => {
  const jsonPath = buildExecutiveApiPath(dashboard.tenantId, {
    window:
      dashboard.defaults.window === "custom"
        ? undefined
        : dashboard.defaults.window,
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
    `<main class="executive-dashboard">
      <section class="executive-hero">
        <p class="executive-eyebrow">Read-only executive summary</p>
        <h1>Executive Dashboard</h1>
        <p class="executive-subtitle">System and campus leaders get a summary-first view of issuance, claims, sharing, and rollup comparisons without dropping into operational admin work.</p>
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

      <section class="executive-kpis">
        ${renderExecutiveMetrics(dashboard)}
      </section>

      <section class="executive-grid">
        <article class="executive-panel">
          <h2>Executive modules</h2>
          <p>The route stays inside an executive-only story: summary, comparison, and drilldown modules with no admin setup burden.</p>
          <ul class="executive-module-list">
            ${renderExecutiveModules(dashboard)}
          </ul>
        </article>

        <article class="executive-panel">
          <h2>Trend signal</h2>
          <p>Trend visuals land in the next phase. This read-only shell already carries the same filters and slice defaults the visual dashboard will use.</p>
          ${renderTrendHighlight(dashboard)}
        </article>
      </section>

      <article class="executive-panel">
        <h2>Top visible comparison rows</h2>
        <p>These rows prove the dashboard is already using current hierarchy and reporting truth instead of a demo-only branch.</p>
        <ul class="executive-rollup-list">
          ${renderExecutiveRollupRows(dashboard)}
        </ul>
      </article>
    </main>`,
    EXECUTIVE_PAGE_HEAD,
  );
};

const renderExecutiveUnavailablePage = (): string => {
  return renderPageShell(
    "Executive dashboard unavailable",
    `<main class="executive-dashboard">
      <section class="executive-hero">
        <p class="executive-eyebrow">Executive access</p>
        <h1>Executive dashboard unavailable</h1>
        <p class="executive-subtitle">Your tenant membership does not expose an executive dashboard slice.</p>
      </section>
    </main>`,
    EXECUTIVE_PAGE_HEAD,
  );
};

export const registerExecutiveRoutes = (input: RegisterExecutiveRoutesInput): void => {
  const { app, resolveDatabase, requireTenantRole, TENANT_MEMBER_ROLES } = input;

  const loadExecutiveDashboardFromRequest = async (
    c: AppContext,
  ): Promise<
    | {
        tenantId: string;
        membershipRole: TenantMembershipRole;
        dashboard: TenantExecutiveDashboardRecord | null;
      }
    | Response
  > => {
    const { tenantId } = parseTenantPathParams(c.req.param());
    const tenantAccess = await requireTenantRole(c, tenantId, TENANT_MEMBER_ROLES);

    if (tenantAccess instanceof Response) {
      return tenantAccess;
    }

    let query;

    try {
      query = parseTenantExecutiveDashboardQuery(c.req.query());
    } catch {
      return c.json(
        {
          error: "Invalid executive dashboard query",
        },
        400,
      );
    }

    const dashboard = await loadTenantExecutiveDashboard({
      db: resolveDatabase(c.env),
      tenantId,
      userId: tenantAccess.session.userId,
      membershipRole: tenantAccess.membershipRole,
      query,
    });

    return {
      tenantId,
      membershipRole: tenantAccess.membershipRole,
      dashboard,
    };
  };

  app.get("/v1/tenants/:tenantId/executive", async (c) => {
    const result = await loadExecutiveDashboardFromRequest(c);

    if (result instanceof Response) {
      return result;
    }

    if (result.dashboard === null) {
      return c.json(
        {
          error: "Executive dashboard access is unavailable for this tenant scope",
        },
        403,
      );
    }

    return c.json({
      status: "ok",
      dashboard: result.dashboard,
    });
  });

  app.get("/tenants/:tenantId/executive", async (c) => {
    const result = await loadExecutiveDashboardFromRequest(c);

    if (result instanceof Response) {
      if (result.status !== 400) {
        return result;
      }

      return c.html(
        renderPageShell(
          "Invalid executive dashboard request",
          `<main class="executive-dashboard"><section class="executive-hero"><p class="executive-eyebrow">Executive access</p><h1>Invalid executive dashboard request</h1><p class="executive-subtitle">The requested executive dashboard filters could not be understood.</p></section></main>`,
          EXECUTIVE_PAGE_HEAD,
        ),
        400,
      );
    }

    if (result.dashboard === null) {
      return c.html(renderExecutiveUnavailablePage(), 403);
    }

    return c.html(renderExecutiveDashboardPage(result.dashboard));
  });
};
