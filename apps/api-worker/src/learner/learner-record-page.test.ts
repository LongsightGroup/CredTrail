import { describe, expect, it } from "vitest";

import type { LearnerRecordPresentationModel } from "../learner-record/learner-record-presentation";
import { pageAssetPath } from "../ui/page-assets";
import { createLearnerRecordPage } from "./learner-record-page";

const learnerRecordPage = createLearnerRecordPage({
  escapeHtml: (value) => value,
  formatIsoTimestamp: (value) => value,
});

const samplePresentation = (): LearnerRecordPresentationModel => {
  return {
    tenantId: "tenant_123",
    learnerProfileId: "lpr_123",
    learnerDisplayName: "Learner One",
    learnerSubjectId: "urn:credtrail:learner:tenant_123:lpr_123",
    generatedAt: "2026-03-26T12:00:00.000Z",
    summary: {
      total: 3,
      issuerVerified: 2,
      supplemental: 1,
      active: 2,
      historical: 1,
      badgeAssertions: 1,
      recordEntries: 2,
    },
    sections: [
      {
        key: "issuerVerifiedActive",
        title: "Institution-verified record",
        description: "Verified entries.",
        itemCountLabel: "2 items",
        items: [
          {
            id: "assertion_123",
            kind: "badge_assertion",
            recordType: "badge",
            recordTypeLabel: "Badge",
            title: "Applied Analytics Badge",
            description: "Awarded for applied analytics work.",
            trustLevel: "issuer_verified",
            trustLabel: "Issuer verified",
            status: "active",
            statusLabel: "Active",
            editable: false,
            publicBadgePath: "/badges/public_assertion_123",
            evidenceLinks: [],
            details: [],
            provenanceSummary: "CredTrail University · Badge assertion",
            provenanceDetails: [
              {
                label: "Issued",
                value: "2026-03-24T15:00:00.000Z",
              },
            ],
          },
        ],
      },
      {
        key: "supplementalActive",
        title: "Learner-supplemental record",
        description: "Supplemental entries.",
        itemCountLabel: "1 item",
        items: [
          {
            id: "entry_123",
            kind: "record_entry",
            recordType: "supplemental_artifact",
            recordTypeLabel: "Supplemental artifact",
            title: "Portfolio Reflection",
            description: "Learner-supplied capstone reflection.",
            trustLevel: "learner_supplemental",
            trustLabel: "Learner supplemental",
            status: "active",
            statusLabel: "Active",
            editable: true,
            publicBadgePath: null,
            evidenceLinks: ["https://portfolio.example.edu/learner-one"],
            details: [],
            provenanceSummary: "Learner self report · Learner self-reported",
            provenanceDetails: [],
          },
        ],
      },
    ],
  };
};

describe("createLearnerRecordPage", () => {
  it("renders the unified learner record without admin-only export affordances", () => {
    const html = learnerRecordPage("tenant_123", samplePresentation(), {
      switchOrganizationPath: "/account/organizations?next=%2Ftenants%2Ftenant_123%2Flearner%2Frecord",
    });

    expect(html).toContain("Unified learner record");
    expect(html).toContain("Institution-verified record");
    expect(html).toContain("Learner-supplemental record");
    expect(html).toContain("Applied Analytics Badge");
    expect(html).toContain("Portfolio Reflection");
    expect(html).toContain("/badges/public_assertion_123");
    expect(html).toContain("Return to learner dashboard");
    expect(html).toContain("Switch organization");
    expect(html).not.toContain("standards mapping");
    expect(html).not.toContain("Download export");
    expect(html).toContain(pageAssetPath("learnerRecordCss"));
  });

  it("renders a truthful empty state when the learner record has no items yet", () => {
    const html = learnerRecordPage("tenant_123", {
      ...samplePresentation(),
      summary: {
        total: 0,
        issuerVerified: 0,
        supplemental: 0,
        active: 0,
        historical: 0,
        badgeAssertions: 0,
        recordEntries: 0,
      },
      sections: [],
    });

    expect(html).toContain("Nothing has been added yet");
    expect(html).toContain(
      "This learner account does not have any badge assertions or non-badge learner-record entries yet.",
    );
  });
});
