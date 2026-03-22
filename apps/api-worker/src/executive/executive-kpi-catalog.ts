import type { OrgUnitType } from "@credtrail/validation";

import type { ExecutiveDashboardDefaults } from "./executive-dashboard-contract";
import {
  REPORTING_METRIC_DEFINITIONS,
  type ReportingMetricDefinition,
  type ReportingMetricKey,
} from "../reporting/metric-definitions";

export interface ExecutiveKpiDescriptor extends ReportingMetricDefinition {
  emphasis: "primary" | "supporting";
}

export type ExecutiveDashboardModuleKind =
  | "comparison_summary"
  | "top_movers"
  | "laggards"
  | "focus_summary"
  | "drilldown";

export interface ExecutiveDashboardModuleDescriptor {
  id: string;
  kind: ExecutiveDashboardModuleKind;
  title: string;
  description: string;
  audience: ExecutiveDashboardDefaults["audience"];
  focusOrgUnitId: string;
  comparisonLevel?: OrgUnitType;
  groupBy?: "orgUnit";
  metricKey?: ReportingMetricKey;
  ranking?: "top" | "bottom";
}

export interface ExecutiveKpiCatalog {
  audience: ExecutiveDashboardDefaults["audience"];
  focusOrgUnitId: string;
  comparisonLevel: OrgUnitType;
  kpis: ExecutiveKpiDescriptor[];
  modules: ExecutiveDashboardModuleDescriptor[];
}

const EXECUTIVE_KPI_KEYS: readonly ReportingMetricKey[] = [
  "issued",
  "active",
  "claimRate",
  "shareRate",
];

const ORG_UNIT_LABELS: Record<OrgUnitType, { singular: string; plural: string }> = {
  institution: {
    singular: "institution",
    plural: "institutions",
  },
  college: {
    singular: "college",
    plural: "colleges",
  },
  department: {
    singular: "department",
    plural: "departments",
  },
  program: {
    singular: "program",
    plural: "programs",
  },
};

const getMetricDefinitionOrThrow = (key: ReportingMetricKey): ReportingMetricDefinition => {
  const definition = REPORTING_METRIC_DEFINITIONS.find((candidate) => candidate.key === key);

  if (definition === undefined) {
    throw new Error(`Missing reporting metric definition for executive KPI "${key}"`);
  }

  return definition;
};

const buildExecutiveKpis = (): ExecutiveKpiDescriptor[] => {
  return EXECUTIVE_KPI_KEYS.map((key, index) => {
    const definition = getMetricDefinitionOrThrow(key);

    return {
      ...definition,
      emphasis: index === 0 ? "primary" : "supporting",
    };
  });
};

const labelForLevel = (level: OrgUnitType) => ORG_UNIT_LABELS[level];

const buildComparisonModules = (
  defaults: ExecutiveDashboardDefaults,
): ExecutiveDashboardModuleDescriptor[] => {
  const levelLabel = labelForLevel(defaults.comparisonLevel);

  return [
    {
      id: "comparison-summary",
      kind: "comparison_summary",
      title: `Compare ${levelLabel.plural}`,
      description: `Compare issued volume with claim and share context across visible ${levelLabel.plural}.`,
      audience: defaults.audience,
      focusOrgUnitId: defaults.focusOrgUnitId,
      comparisonLevel: defaults.comparisonLevel,
      groupBy: defaults.comparisonGroupBy,
    },
    {
      id: "top-movers-issued",
      kind: "top_movers",
      title: `Top ${levelLabel.plural} by issued badges`,
      description: `Highlight the visible ${levelLabel.plural} issuing the most badges in the current executive slice.`,
      audience: defaults.audience,
      focusOrgUnitId: defaults.focusOrgUnitId,
      comparisonLevel: defaults.comparisonLevel,
      groupBy: defaults.comparisonGroupBy,
      metricKey: "issued",
      ranking: "top",
    },
    {
      id: "top-movers-claim-rate",
      kind: "top_movers",
      title: `Highest claim rate across ${levelLabel.plural}`,
      description: `Surface the visible ${levelLabel.plural} with the strongest recipient claim behavior.`,
      audience: defaults.audience,
      focusOrgUnitId: defaults.focusOrgUnitId,
      comparisonLevel: defaults.comparisonLevel,
      groupBy: defaults.comparisonGroupBy,
      metricKey: "claimRate",
      ranking: "top",
    },
    {
      id: "lagging-share-rate",
      kind: "laggards",
      title: `Lowest share rate across ${levelLabel.plural}`,
      description: `Call out the visible ${levelLabel.plural} that need stronger outward sharing support.`,
      audience: defaults.audience,
      focusOrgUnitId: defaults.focusOrgUnitId,
      comparisonLevel: defaults.comparisonLevel,
      groupBy: defaults.comparisonGroupBy,
      metricKey: "shareRate",
      ranking: "bottom",
    },
    {
      id: "drilldown",
      kind: "drilldown",
      title: `Drill into ${levelLabel.plural}`,
      description: `Carry the current executive slice into more detailed ${levelLabel.singular}-level review without leaving the executive route family.`,
      audience: defaults.audience,
      focusOrgUnitId: defaults.focusOrgUnitId,
      comparisonLevel: defaults.comparisonLevel,
      groupBy: defaults.comparisonGroupBy,
    },
  ];
};

export const buildExecutiveKpiCatalog = (input: {
  defaults: ExecutiveDashboardDefaults;
}): ExecutiveKpiCatalog => {
  return {
    audience: input.defaults.audience,
    focusOrgUnitId: input.defaults.focusOrgUnitId,
    comparisonLevel: input.defaults.comparisonLevel,
    kpis: buildExecutiveKpis(),
    modules: buildComparisonModules(input.defaults),
  };
};
