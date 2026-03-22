import type { TenantReportingOverviewCounts } from "@credtrail/db";

export type ReportingMetricKey = keyof TenantReportingOverviewCounts | "claimRate" | "shareRate";

export interface ReportingMetricDefinition {
  key: ReportingMetricKey;
  label: string;
  description: string;
  source: string;
  available: boolean;
  availabilityNote: string | null;
}

export interface ReportingMetricEntry extends ReportingMetricDefinition {
  value: number | null;
}

export const REPORTING_METRIC_DEFINITIONS: readonly ReportingMetricDefinition[] = [
  {
    key: "issued",
    label: "Issued",
    description: "Badges issued in the selected reporting window.",
    source: "assertions",
    available: true,
    availabilityNote: null,
  },
  {
    key: "active",
    label: "Active",
    description: "Issued badges currently in active standing.",
    source: "assertions + assertion_lifecycle_events",
    available: true,
    availabilityNote: null,
  },
  {
    key: "suspended",
    label: "Suspended",
    description: "Issued badges currently suspended by a lifecycle action.",
    source: "assertions + assertion_lifecycle_events",
    available: true,
    availabilityNote: null,
  },
  {
    key: "revoked",
    label: "Revoked",
    description: "Issued badges that are now revoked.",
    source: "assertions + assertion_lifecycle_events",
    available: true,
    availabilityNote: null,
  },
  {
    key: "pendingReview",
    label: "Pending review",
    description:
      "Issued badges currently suspended for review. This is not a claim or share metric.",
    source: "assertions + assertion_lifecycle_events",
    available: true,
    availabilityNote: null,
  },
  {
    key: "claimRate",
    label: "Claim rate",
    description: "Percent of issued badges that recipients actively claim or accept.",
    source: "assertion_engagement_events + assertions",
    available: true,
    availabilityNote: null,
  },
  {
    key: "shareRate",
    label: "Share rate",
    description: "Percent of issued badges that recipients share outward from CredTrail.",
    source: "assertion_engagement_events + assertions",
    available: true,
    availabilityNote: null,
  },
] as const;

export const buildReportingMetricEntries = (
  counts: TenantReportingOverviewCounts,
): ReportingMetricEntry[] => {
  return REPORTING_METRIC_DEFINITIONS.map((definition) => {
    const value =
      definition.key in counts
        ? counts[definition.key as keyof TenantReportingOverviewCounts]
        : null;

    return {
      ...definition,
      value: definition.available ? (value ?? null) : null,
    };
  });
};
