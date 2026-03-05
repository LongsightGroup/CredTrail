import type {
  BadgeIssuanceRuleRecord,
  BadgeIssuanceRuleVersionRecord,
  BadgeTemplateRecord,
  TenantMembershipRole,
  TenantRecord,
} from '@credtrail/db';
import { renderPageShell } from '@credtrail/ui-components';
import { renderPageAssetTags } from '../ui/page-assets';
import { escapeHtml } from '../utils/display-format';

const serializeJsonScriptContent = (value: unknown): string => {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
};

export const institutionAdminRuleBuilderPage = (input: {
  tenant: TenantRecord;
  userId: string;
  userEmail?: string;
  membershipRole: TenantMembershipRole;
  badgeTemplates: readonly BadgeTemplateRecord[];
  badgeRules: readonly BadgeIssuanceRuleRecord[];
  badgeRuleVersions: readonly BadgeIssuanceRuleVersionRecord[];
  ruleBuilderTutorialEmbedUrl?: string;
}): string => {
  const versionsByRuleId = new Map<string, BadgeIssuanceRuleVersionRecord[]>();

  for (const version of input.badgeRuleVersions) {
    const versions = versionsByRuleId.get(version.ruleId);

    if (versions === undefined) {
      versionsByRuleId.set(version.ruleId, [version]);
      continue;
    }

    versions.push(version);
  }

  for (const versions of versionsByRuleId.values()) {
    versions.sort((left, right) => right.versionNumber - left.versionNumber);
  }

  const tenantAdminPath = `/tenants/${encodeURIComponent(input.tenant.id)}/admin`;
  const ruleBuilderPath = `${tenantAdminPath}/rules/new`;
  const manualIssueApiPath = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/assertions/manual-issue`;
  const createApiKeyPath = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/api-keys`;
  const createOrgUnitPath = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/org-units`;
  const badgeTemplateApiPathPrefix = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/badge-templates`;
  const badgeRuleApiPath = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/badge-rules`;
  const assertionsApiPathPrefix = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/assertions`;
  const tenantUsersApiPathPrefix = `/v1/tenants/${encodeURIComponent(input.tenant.id)}/users`;
  const showcasePath = `/showcase/${encodeURIComponent(input.tenant.id)}`;
  const userLabel = input.userEmail ?? input.userId;
  const tutorialEmbedUrl = input.ruleBuilderTutorialEmbedUrl?.trim() ?? '';

  const templateOptions = input.badgeTemplates
    .map((template, index) => {
      return `<option value="${escapeHtml(template.id)}"${index === 0 ? ' selected' : ''}>${escapeHtml(
        `${template.title} (${template.id})`,
      )}</option>`;
    })
    .join('\n');

  const templateSelectOptions =
    templateOptions.length > 0
      ? templateOptions
      : '<option value="">No badge templates available</option>';

  const ruleCloneOptions = input.badgeRules
    .map((rule) => {
      const versions = versionsByRuleId.get(rule.id) ?? [];
      const latestVersion = versions[0] ?? null;

      return `<option value="${escapeHtml(rule.id)}">${escapeHtml(
        `${rule.name} (${rule.id}) · latest ${latestVersion === null ? 'none' : `v${String(
          latestVersion.versionNumber,
        )} ${latestVersion.status}`}`,
      )}</option>`;
    })
    .join('\n');

  const ruleCloneSelectOptions =
    ruleCloneOptions.length > 0
      ? `<option value="">Select rule to clone</option>\n${ruleCloneOptions}`
      : '<option value="">No rules available</option>';

  const adminPageContextJson = serializeJsonScriptContent({
    tenantAdminPath,
    manualIssueApiPath,
    createApiKeyPath,
    createOrgUnitPath,
    badgeTemplateApiPathPrefix,
    badgeRuleApiPath,
    assertionsApiPathPrefix,
    tenantUsersApiPathPrefix,
  });

  const tutorialEmbedMarkup =
    tutorialEmbedUrl.length === 0
      ? `<p class="ct-admin__hint">
          Tutorial video embed is not configured.
          Set <code>RULE_BUILDER_TUTORIAL_EMBED_URL</code> to surface an in-page walkthrough.
        </p>`
      : `<div class="ct-admin__video-frame">
          <iframe
            id="rule-builder-tutorial-embed"
            src="${escapeHtml(tutorialEmbedUrl)}"
            title="Rule builder tutorial video"
            loading="lazy"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen
          ></iframe>
        </div>`;

  return renderPageShell(
    `Rule Builder · ${input.tenant.displayName}`,
    `<section class="ct-admin ct-admin--rule-builder ct-stack">
      <header class="ct-admin__hero ct-stack">
        <h1>Visual Rule Builder</h1>
        <p>Focused workspace for creating, validating, and testing issuance rules before drafting.</p>
        <div class="ct-admin__meta-grid ct-cluster">
          <span class="ct-admin__pill">Tenant: ${escapeHtml(input.tenant.id)}</span>
          <span class="ct-admin__pill">Role: ${escapeHtml(input.membershipRole)}</span>
          <span class="ct-admin__pill" title="User ID: ${escapeHtml(input.userId)}">User: ${escapeHtml(
            userLabel,
          )}</span>
        </div>
        <nav class="ct-admin__quick-links ct-cluster" aria-label="Builder links">
          <a href="${escapeHtml(tenantAdminPath)}">Back to dashboard</a>
          <a href="#builder-step-metadata">Step 1: Metadata</a>
          <a href="#builder-step-conditions">Step 2: Conditions</a>
          <a href="#builder-step-test">Step 3: Test</a>
          <a href="#builder-step-review">Step 4: Review</a>
          <a href="${escapeHtml(showcasePath)}" target="_blank" rel="noopener noreferrer">Public showcase</a>
        </nav>
      </header>

      <article class="ct-admin__panel ct-stack">
        <h2>Five-minute walkthrough</h2>
        <p>Use this video to orient first-time issuers before building or testing draft rules.</p>
        ${tutorialEmbedMarkup}
      </article>

      <section class="ct-admin__builder-layout ct-grid">
        <article id="rule-builder-panel" class="ct-admin__panel ct-stack">
          <h2>Build Rule Draft</h2>
          <p>Use the step flow to define metadata, build condition cards, run dry-run tests, and submit a draft.</p>

          <ol class="ct-admin__builder-steps" aria-label="Rule builder steps">
            <li><button type="button" class="ct-admin__step-button" data-rule-step-target="metadata">1. Metadata</button></li>
            <li><button type="button" class="ct-admin__step-button" data-rule-step-target="conditions">2. Conditions</button></li>
            <li><button type="button" class="ct-admin__step-button" data-rule-step-target="test">3. Test</button></li>
            <li><button type="button" class="ct-admin__step-button" data-rule-step-target="review">4. Review</button></li>
          </ol>
          <p id="rule-builder-step-progress" class="ct-admin__meta ct-admin__builder-progress" aria-live="polite">
            Step 1 of 4 · Metadata
          </p>

          <form id="rule-create-form" class="ct-admin__form ct-stack">
            <section id="builder-step-metadata" class="ct-admin__builder-step" data-rule-step="metadata">
              <header class="ct-admin__step-head ct-stack">
                <p class="ct-admin__step-kicker">Step 1</p>
                <h3>Rule metadata</h3>
                <p>Name the rule and bind it to a badge template and LMS source.</p>
              </header>
              <div class="ct-admin__builder-grid ct-grid">
                <label>
                  Rule name
                  <input name="name" type="text" required placeholder="CS101 Excellence Rule" />
                </label>
                <label>
                  Description (optional)
                  <input
                    name="description"
                    type="text"
                    placeholder="Award when learner completes CS101 with strong performance."
                  />
                </label>
                <label>
                  Badge template
                  <select name="badgeTemplateId" required>
                    ${templateSelectOptions}
                  </select>
                </label>
                <label>
                  LMS provider
                  <select name="lmsProviderKind" required>
                    <option value="canvas">Canvas</option>
                    <option value="sakai">Sakai</option>
                    <option value="moodle">Moodle</option>
                    <option value="blackboard_ultra">Blackboard Ultra</option>
                    <option value="d2l_brightspace">D2L Brightspace</option>
                  </select>
                </label>
              </div>
            </section>

            <section id="builder-step-conditions" class="ct-admin__builder-step" data-rule-step="conditions" hidden>
              <header class="ct-admin__step-head ct-stack">
                <p class="ct-admin__step-kicker">Step 2</p>
                <h3>Condition canvas</h3>
                <p>Compose AND/OR logic using condition cards, then verify the generated JSON.</p>
              </header>
              <label>
                Quick-start template
                <div class="ct-admin__builder-inline ct-cluster">
                  <select id="rule-builder-template-preset" name="templatePreset">
                    <option value="course_completion">Course completion</option>
                    <option value="course_and_grade" selected>Course + grade threshold</option>
                    <option value="program_completion">Program completion</option>
                    <option value="time_limited">Time-limited achievement</option>
                    <option value="prerequisite_chain">Prerequisite badge chain</option>
                    <option value="blank">Blank</option>
                  </select>
                  <button
                    id="rule-builder-apply-template"
                    type="button"
                    class="ct-admin__button ct-admin__button--tiny"
                  >
                    Apply
                  </button>
                </div>
              </label>
              <label>
                Root logic
                <select id="rule-builder-root-logic" name="rootLogic">
                  <option value="all" selected>AND (all conditions must pass)</option>
                  <option value="any">OR (any condition can pass)</option>
                </select>
              </label>
              <div class="ct-admin__builder-toolbar ct-cluster">
                <button
                  type="button"
                  id="rule-builder-add-condition"
                  class="ct-admin__button ct-admin__button--tiny"
                >
                  Add condition card
                </button>
              </div>
              <section class="ct-admin__builder-canvas ct-stack">
                <header class="ct-admin__builder-canvas-header ct-cluster">
                  <strong>Condition Canvas</strong>
                  <span class="ct-admin__meta">Drag cards to reorder. Use Invert for NOT logic.</span>
                </header>
                <div class="ct-admin__builder-canvas-meta ct-cluster">
                  <span id="rule-builder-canvas-count" class="ct-admin__status-pill">0 cards</span>
                  <span id="rule-builder-canvas-logic" class="ct-admin__status-pill">AND logic</span>
                </div>
                <p id="rule-builder-condition-empty" class="ct-admin__builder-canvas-empty">
                  No conditions yet. Apply a template or add your first condition card.
                </p>
                <div id="rule-builder-condition-list" class="ct-admin__builder-condition-list ct-stack"></div>
              </section>

              <details class="ct-admin__builder-guide ct-stack" open>
                <summary>Condition help</summary>
                <dl class="ct-admin__builder-guide-list">
                  <div>
                    <dt>Course completion</dt>
                    <dd>Matches when course completion facts show learner completion and optional minimum percent.</dd>
                  </div>
                  <div>
                    <dt>Grade threshold</dt>
                    <dd>Matches when a learner score is within configured min/max thresholds.</dd>
                  </div>
                  <div>
                    <dt>Program completion</dt>
                    <dd>Matches when enough required courses are completed for a program path.</dd>
                  </div>
                  <div>
                    <dt>Assignment submission</dt>
                    <dd>Matches when assignment submission, score, and workflow-state constraints pass.</dd>
                  </div>
                  <div>
                    <dt>Time window</dt>
                    <dd>Matches only inside optional not-before / not-after timestamps.</dd>
                  </div>
                  <div>
                    <dt>Prerequisite badge</dt>
                    <dd>Matches when learner already has an earned prerequisite badge template.</dd>
                  </div>
                </dl>
              </details>

              <details class="ct-admin__builder-advanced ct-stack">
                <summary>Advanced controls</summary>
                <div class="ct-admin__builder-toolbar ct-cluster">
                  <button
                    type="button"
                    id="rule-builder-save-draft"
                    class="ct-admin__button ct-admin__button--tiny"
                  >
                    Save local draft
                  </button>
                  <button
                    type="button"
                    id="rule-builder-load-draft"
                    class="ct-admin__button ct-admin__button--tiny"
                  >
                    Load local draft
                  </button>
                  <button
                    type="button"
                    id="rule-builder-export-json"
                    class="ct-admin__button ct-admin__button--tiny"
                  >
                    Export JSON
                  </button>
                  <button
                    type="button"
                    id="rule-builder-import-json"
                    class="ct-admin__button ct-admin__button--tiny"
                  >
                    Import JSON
                  </button>
                  <input id="rule-builder-import-file" type="file" accept="application/json" hidden />
                </div>
                <label>
                  Clone existing rule (optional)
                  <div class="ct-admin__builder-inline ct-cluster">
                    <select id="rule-builder-clone-rule" name="cloneRuleId">
                      ${ruleCloneSelectOptions}
                    </select>
                    <button
                      id="rule-builder-clone-load"
                      type="button"
                      class="ct-admin__button ct-admin__button--tiny"
                    >
                      Load rule
                    </button>
                  </div>
                </label>
                <label>
                  Rule JSON (advanced)
                  <textarea
                    id="rule-builder-definition-json"
                    name="definitionJson"
                    rows="12"
                    spellcheck="false"
                  ></textarea>
                </label>
                <div class="ct-admin__builder-inline ct-cluster">
                  <button
                    id="rule-builder-apply-json"
                    type="button"
                    class="ct-admin__button ct-admin__button--tiny"
                  >
                    Apply JSON to builder
                  </button>
                </div>
              </details>
            </section>

            <section id="builder-step-test" class="ct-admin__builder-step" data-rule-step="test" hidden>
              <header class="ct-admin__step-head ct-stack">
                <p class="ct-admin__step-kicker">Step 3</p>
                <h3>Test against sample learner facts</h3>
                <p>Use dry-run evaluation to confirm conditions pass/fail before drafting.</p>
              </header>
              <fieldset class="ct-admin__fieldset ct-stack">
                <legend>Rule Test Mode (Dry Run)</legend>
                <label>
                  Learner ID
                  <input name="testLearnerId" type="text" value="canvas:12345" />
                </label>
                <label>
                  Recipient email
                  <input name="testRecipientIdentity" type="email" value="learner@example.edu" />
                </label>
                <label>
                  Sample course ID
                  <input name="testCourseId" type="text" value="CS101" />
                </label>
                <label>
                  Sample final score
                  <input name="testFinalScore" type="number" min="0" max="100" step="0.01" value="92" />
                </label>
                <label class="ct-admin__checkbox-row ct-checkbox-row">
                  <input name="testCompleted" type="checkbox" checked />
                  Learner completed course
                </label>
                <label>
                  Advanced facts JSON (optional)
                  <textarea
                    name="testFactsJson"
                    rows="5"
                    spellcheck="false"
                    placeholder='{"grades":[{"courseId":"CS101","learnerId":"canvas:12345","finalScore":92}]}'
                  ></textarea>
                </label>
                <div class="ct-admin__builder-inline ct-cluster">
                  <label class="ct-admin__inline-control">
                    Test fact preset
                    <select id="rule-builder-test-preset" name="testPreset">
                      <option value="canvas_course_grade" selected>Canvas course + grade</option>
                      <option value="program_completion">Program completion</option>
                      <option value="assignment_submission">Assignment submission</option>
                      <option value="prerequisite_badge">Prerequisite badge</option>
                    </select>
                  </label>
                  <button
                    id="rule-builder-apply-test-preset"
                    type="button"
                    class="ct-admin__button ct-admin__button--tiny ct-admin__button--secondary"
                  >
                    Apply preset
                  </button>
                </div>
                <button
                  id="rule-builder-test"
                  type="button"
                  class="ct-admin__button ct-admin__button--tiny"
                >
                  Test rule
                </button>
              </fieldset>
              <pre id="rule-builder-test-output" class="ct-admin__code-output" hidden></pre>
            </section>

            <section id="builder-step-review" class="ct-admin__builder-step" data-rule-step="review" hidden>
              <header class="ct-admin__step-head ct-stack">
                <p class="ct-admin__step-kicker">Step 4</p>
                <h3>Governance and release settings</h3>
                <p>Set approval chain and issuance timing before creating the draft version.</p>
              </header>
              <label>
                Approval roles (comma separated)
                <input name="approvalRoles" type="text" value="admin,owner" />
              </label>
              <label>
                Issuance timing
                <select name="issuanceTiming">
                  <option value="immediate">Immediate</option>
                  <option value="manual">Manual review trigger</option>
                  <option value="end_of_term">End of term batch</option>
                </select>
              </label>
              <label>
                Change summary (optional)
                <input
                  name="changeSummary"
                  type="text"
                  placeholder="Initial draft for committee review."
                />
              </label>
            </section>

            <div class="ct-admin__builder-step-nav ct-cluster">
              <button id="rule-builder-step-prev" type="button" class="ct-admin__button ct-admin__button--tiny ct-admin__button--secondary">
                Previous step
              </button>
              <button id="rule-builder-step-next" type="button" class="ct-admin__button ct-admin__button--tiny ct-admin__button--secondary">
                Next step
              </button>
              <button id="rule-builder-submit" type="submit">Create rule draft</button>
            </div>
          </form>
          <p id="rule-create-status" class="ct-admin__status"></p>
        </article>

        <aside class="ct-admin__panel ct-admin__builder-rail ct-stack" aria-live="polite">
          <h2>Validation & Summary</h2>
          <p class="ct-admin__hint">Live health checks for this draft as you edit conditions and test facts.</p>
          <dl class="ct-admin__builder-summary-list">
            <div>
              <dt>Rule name</dt>
              <dd id="rule-builder-summary-rule-name" class="ct-admin__builder-summary-value">-</dd>
            </div>
            <div>
              <dt>Condition cards</dt>
              <dd id="rule-builder-summary-condition-count" class="ct-admin__builder-summary-value">0</dd>
            </div>
            <div>
              <dt>Root logic</dt>
              <dd id="rule-builder-summary-root-logic" class="ct-admin__builder-summary-value">AND</dd>
            </div>
            <div>
              <dt>Definition</dt>
              <dd id="rule-builder-summary-validity" class="ct-admin__builder-summary-value">Drafting</dd>
            </div>
            <div>
              <dt>Last test</dt>
              <dd id="rule-builder-summary-last-test" class="ct-admin__builder-summary-value">Not run</dd>
            </div>
          </dl>
          <p id="rule-builder-summary-message" class="ct-admin__status">Build at least one condition card to create a draft.</p>
          <p class="ct-admin__hint">
            Saved drafts are stored in this browser and scoped to
            <strong>${escapeHtml(ruleBuilderPath)}</strong>.
          </p>
        </aside>
      </section>

      <script id="ct-admin-context" type="application/json">${adminPageContextJson}</script>
    </section>`,
    renderPageAssetTags(['foundationCss', 'institutionAdminCss', 'institutionAdminJs']),
  );
};
