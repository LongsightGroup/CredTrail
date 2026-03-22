import { describe, expect, it } from "vitest";

import { INSTITUTION_ADMIN_CSS } from "../ui/page-assets/content/institution-admin-css";
import { renderReporting } from "./reporting-visuals";

describe("renderReporting", () => {
  it.each([
    {
      kind: "comparison-bars" as const,
      title: "Template performance",
      description: "Issued badges by template for the selected window.",
    },
    {
      kind: "stacked-summary" as const,
      title: "Engagement mix",
      description: "Claimed and shared badges from the same reporting slice.",
    },
    {
      kind: "trend-series" as const,
      title: "Weekly badge activity",
      description: "Issued badges by week.",
    },
  ])("renders %s visuals with visible labels and numeric values", (input) => {
    const html = renderReporting({
      ...input,
      series: [
        { label: "Engineering", value: 12 },
        { label: "Mathematics", value: 6 },
        { label: "History", value: 3 },
      ],
    });

    expect(html).toContain("<figure");
    expect(html).toContain("<svg");
    expect(html).toContain('role="img"');
    expect(html).toContain("Engineering");
    expect(html).toContain("Mathematics");
    expect(html).toContain("History");
    expect(html).toContain("12");
    expect(html).toContain("6");
    expect(html).toContain("3");
  });

  it("renders legends and text summaries so the visual is understandable without color alone", () => {
    const html = renderReporting({
      kind: "stacked-summary",
      title: "Recipient engagement",
      description: "Breakdown of post-issuance engagement.",
      series: [
        { label: "Claimed", value: 5 },
        { label: "Shared", value: 3 },
      ],
    });

    expect(html).toContain("Legend");
    expect(html).toContain("Claimed");
    expect(html).toContain("Shared");
    expect(html).toContain("Total");
    expect(html).toContain("8");
    expect(html).toContain("aria-describedby");
  });

  it("emits stable reporting-visual hooks for the chart surface, legend, and visible values", () => {
    const html = renderReporting({
      kind: "comparison-bars",
      title: "Program performance",
      description: "Issued badges by program.",
      series: [
        { label: "Computer Science", value: 18 },
        { label: "History", value: 9 },
      ],
    });

    expect(html).toContain('class="ct-reporting-visual"');
    expect(html).toContain('data-reporting-visual-kind="comparison-bars"');
    expect(html).toContain('class="ct-reporting-visual__surface"');
    expect(html).toContain('class="ct-reporting-visual__legend"');
    expect(html).toContain('class="ct-reporting-visual__legend-value"');
    expect(html).toContain('data-reporting-visual-index="0"');
  });

  it("defines reporting visual CSS tokens, responsive surface rules, and non-color emphasis states", () => {
    expect(INSTITUTION_ADMIN_CSS).toContain("--ct-reporting-visual-surface");
    expect(INSTITUTION_ADMIN_CSS).toContain("--ct-reporting-visual-accent");
    expect(INSTITUTION_ADMIN_CSS).toContain(".ct-reporting-visual");
    expect(INSTITUTION_ADMIN_CSS).toContain(".ct-reporting-visual__legend");
    expect(INSTITUTION_ADMIN_CSS).toContain(".ct-reporting-visual__surface");
    expect(INSTITUTION_ADMIN_CSS).toContain("data-reporting-visual-kind");
    expect(INSTITUTION_ADMIN_CSS).toContain("@media (max-width: 960px)");
    expect(INSTITUTION_ADMIN_CSS).toContain("repeating-linear-gradient");
  });

  it("renders a deliberate fallback for empty or zero-data visuals", () => {
    const html = renderReporting({
      kind: "trend-series",
      title: "Credential activity",
      description: "This visual should explain when there is no data to chart yet.",
      series: [
        { label: "Week 1", value: 0 },
        { label: "Week 2", value: 0 },
      ],
    });

    expect(html).toContain("Credential activity");
    expect(html).toContain('data-reporting-visual-state="empty"');
    expect(html).toContain("No reporting data available for this view yet.");
    expect(html).not.toContain("<svg");
  });
});
