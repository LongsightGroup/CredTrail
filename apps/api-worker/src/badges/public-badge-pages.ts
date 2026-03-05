import type { JsonObject } from '@credtrail/core-domain';
import {
  parseBadgeIssuanceRuleDefinition,
  type BadgeIssuanceRuleCondition,
} from '@credtrail/validation';
import type {
  AssertionRecord,
  BadgeIssuanceRuleApprovalEventRecord,
  BadgeIssuanceRuleApprovalStepRecord,
  BadgeIssuanceRuleRecord,
  BadgeIssuanceRuleVersionRecord,
  BadgeTemplateOwnershipEventRecord,
  BadgeTemplateRecord,
  PublicBadgeWallEntryRecord,
  ResolveAssertionLifecycleStateResult,
  TenantOrgUnitRecord,
} from '@credtrail/db';
import { renderPageShell } from '@credtrail/ui-components';
import type { VerificationViewModel } from './public-badge-model';

interface AchievementDetails {
  badgeClassUri: string | null;
  description: string | null;
  criteriaUri: string | null;
  imageUri: string | null;
}

interface EvidenceDetails {
  uri: string;
  name: string | null;
  description: string | null;
}

interface CreatePublicBadgePageRenderersInput {
  asString: (value: unknown) => string | null;
  achievementDetailsFromCredential: (credential: JsonObject) => AchievementDetails;
  badgeHeroImageMarkup: (
    badgeName: string,
    imageUri: string | null,
    fallbackImageUri?: string | null,
  ) => string;
  badgeNameFromCredential: (credential: JsonObject) => string;
  evidenceDetailsFromCredential: (credential: JsonObject) => EvidenceDetails[];
  escapeHtml: (value: string) => string;
  formatIsoTimestamp: (timestampIso: string) => string;
  githubAvatarUrlForUsername: (username: string) => string;
  githubUsernameFromUrl: (value: string) => string | null;
  imsOb3ValidatorUrl: (targetUrl: string) => string;
  isWebUrl: (value: string) => boolean;
  issuerIdentifierFromCredential: (credential: JsonObject) => string | null;
  issuerNameFromCredential: (credential: JsonObject) => string;
  issuerUrlFromCredential: (credential: JsonObject) => string | null;
  linkedInAddToProfileUrl: (input: {
    badgeName: string;
    issuerName: string;
    issuedAtIso: string;
    credentialUrl: string;
    credentialId: string;
  }) => string;
  publicBadgePathForAssertion: (assertion: AssertionRecord) => string;
  recipientAvatarUrlFromAssertion: (assertion: AssertionRecord) => string | null;
  recipientDisplayNameFromAssertion: (assertion: AssertionRecord) => string | null;
  recipientFromCredential: (credential: JsonObject) => string;
}

interface PublicBadgePageRenderers {
  publicBadgeNotFoundPage: (requestUrl: string) => string;
  publicBadgePage: (requestUrl: string, model: VerificationViewModel) => string;
  tenantBadgeWallPage: (
    requestUrl: string,
    tenantId: string,
    entries: readonly PublicBadgeWallEntryViewRecord[],
    filterBadgeTemplateId: string | null,
  ) => string;
  tenantBadgeCriteriaRegistryPage: (
    requestUrl: string,
    tenantId: string,
    model: PublicBadgeCriteriaRegistryViewModel,
    filterBadgeTemplateId: string | null,
  ) => string;
}

export interface PublicBadgeWallEntryViewRecord extends PublicBadgeWallEntryRecord {
  lifecycle: ResolveAssertionLifecycleStateResult;
}

export interface PublicBadgeCriteriaRuleViewRecord {
  rule: BadgeIssuanceRuleRecord;
  latestVersion: BadgeIssuanceRuleVersionRecord | null;
  activeVersion: BadgeIssuanceRuleVersionRecord | null;
  approvalSteps: readonly BadgeIssuanceRuleApprovalStepRecord[];
  approvalEvents: readonly BadgeIssuanceRuleApprovalEventRecord[];
}

export interface PublicBadgeCriteriaTemplateViewRecord {
  template: BadgeTemplateRecord;
  ownerOrgUnit: TenantOrgUnitRecord | null;
  ownershipEvents: readonly BadgeTemplateOwnershipEventRecord[];
  rules: readonly PublicBadgeCriteriaRuleViewRecord[];
}

export interface PublicBadgeCriteriaRegistryViewModel {
  orgUnits: readonly TenantOrgUnitRecord[];
  templates: readonly PublicBadgeCriteriaTemplateViewRecord[];
}

export const createPublicBadgePageRenderers = (
  input: CreatePublicBadgePageRenderersInput,
): PublicBadgePageRenderers => {
  const {
    asString,
    achievementDetailsFromCredential,
    badgeHeroImageMarkup,
    badgeNameFromCredential,
    evidenceDetailsFromCredential,
    escapeHtml,
    formatIsoTimestamp,
    githubAvatarUrlForUsername,
    githubUsernameFromUrl,
    imsOb3ValidatorUrl,
    isWebUrl,
    issuerIdentifierFromCredential,
    issuerNameFromCredential,
    issuerUrlFromCredential,
    linkedInAddToProfileUrl,
    publicBadgePathForAssertion,
    recipientAvatarUrlFromAssertion,
    recipientDisplayNameFromAssertion,
    recipientFromCredential,
  } = input;
  const VC_DATA_MODEL_V2_CONTEXT_URL = 'https://www.w3.org/ns/credentials/v2';
  const nonEmptyText = (value: string | null): string | null => {
    if (value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  };

  const toAbsoluteWebUrl = (requestUrl: string, value: string | null): string | null => {
    const text = nonEmptyText(value);

    if (text === null) {
      return null;
    }

    try {
      const absoluteUrl = new URL(text, requestUrl).toString();
      return isWebUrl(absoluteUrl) ? absoluteUrl : null;
    } catch {
      return null;
    }
  };
  const hasContextUrl = (contextValue: unknown, expectedContextUrl: string): boolean => {
    if (typeof contextValue === 'string') {
      return contextValue === expectedContextUrl;
    }

    if (!Array.isArray(contextValue)) {
      return false;
    }

    return contextValue.some((entry) => typeof entry === 'string' && entry === expectedContextUrl);
  };

  const buildSeoHeadContent = (options: {
    title: string;
    description: string;
    canonicalUrl: string;
    ogType: 'article' | 'website';
    imageUrl?: string | null;
    robots?: string;
    extraHeadContent?: string;
  }): string => {
    const imageUrl = options.imageUrl ?? null;
    const extraHeadContent = options.extraHeadContent?.trim();

    return [
      `<meta name="description" content="${escapeHtml(options.description)}" />`,
      `<meta name="robots" content="${escapeHtml(options.robots ?? 'index, follow')}" />`,
      `<link rel="canonical" href="${escapeHtml(options.canonicalUrl)}" />`,
      `<meta property="og:site_name" content="CredTrail" />`,
      `<meta property="og:type" content="${escapeHtml(options.ogType)}" />`,
      `<meta property="og:title" content="${escapeHtml(options.title)}" />`,
      `<meta property="og:description" content="${escapeHtml(options.description)}" />`,
      `<meta property="og:url" content="${escapeHtml(options.canonicalUrl)}" />`,
      ...(imageUrl === null
        ? []
        : [`<meta property="og:image" content="${escapeHtml(imageUrl)}" />`]),
      `<meta name="twitter:card" content="${imageUrl === null ? 'summary' : 'summary_large_image'}" />`,
      `<meta name="twitter:title" content="${escapeHtml(options.title)}" />`,
      `<meta name="twitter:description" content="${escapeHtml(options.description)}" />`,
      ...(imageUrl === null ? [] : [`<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`]),
      ...(extraHeadContent === undefined || extraHeadContent.length === 0 ? [] : [extraHeadContent]),
    ].join('\n      ');
  };

  const publicBadgeNotFoundPage = (requestUrl: string): string => {
    const canonicalUrl = new URL(requestUrl).toString();

    return renderPageShell(
      'Badge not found',
      `<style>
        .public-badge-not-found {
          display: grid;
          gap: 1rem;
          max-width: 42rem;
        }

        .public-badge-not-found__card {
          display: grid;
          gap: 0.8rem;
          padding: 1.25rem;
          border: 1px solid var(--ct-theme-border-default);
          border-radius: 1rem;
          background: linear-gradient(
            155deg,
            var(--ct-theme-surface-card-strong),
            var(--ct-theme-surface-soft)
          );
          box-shadow: var(--ct-theme-shadow-card);
        }

        .public-badge-not-found__eyebrow {
          margin: 0;
          font-size: 0.8rem;
          letter-spacing: 0.11em;
          text-transform: uppercase;
          color: var(--ct-theme-link);
          font-weight: 700;
        }

        .public-badge-not-found__title {
          margin: 0;
        }

        .public-badge-not-found__copy {
          margin: 0;
          color: var(--ct-theme-text-muted);
        }
      </style>
      <section class="public-badge-not-found">
        <article class="public-badge-not-found__card">
          <p class="public-badge-not-found__eyebrow">Public Badge Lookup</p>
          <h1 class="public-badge-not-found__title">Badge not found</h1>
          <p class="public-badge-not-found__copy">The shared badge URL is invalid or the credential does not exist.</p>
        </article>
      </section>`,
      buildSeoHeadContent({
        title: 'Badge not found | CredTrail',
        description: 'The shared badge URL is invalid or the credential does not exist.',
        canonicalUrl,
        ogType: 'website',
        robots: 'noindex, nofollow',
      }),
    );
  };

  const ruleConditionMarkup = (condition: BadgeIssuanceRuleCondition): string => {
    if ('all' in condition) {
      return `<li><strong>All of:</strong><ul>${condition.all
        .map((entry) => ruleConditionMarkup(entry))
        .join('')}</ul></li>`;
    }

    if ('any' in condition) {
      return `<li><strong>Any of:</strong><ul>${condition.any
        .map((entry) => ruleConditionMarkup(entry))
        .join('')}</ul></li>`;
    }

    if ('not' in condition) {
      return `<li><strong>Not:</strong><ul>${ruleConditionMarkup(condition.not)}</ul></li>`;
    }

    switch (condition.type) {
      case 'grade_threshold': {
        const scoreField = condition.scoreField ?? 'final_score';
        const range =
          condition.minScore !== undefined && condition.maxScore !== undefined
            ? `between ${String(condition.minScore)} and ${String(condition.maxScore)}`
            : condition.minScore !== undefined
              ? `at least ${String(condition.minScore)}`
              : `at most ${String(condition.maxScore)}`;
        return `<li>Grade threshold for course ${escapeHtml(
          condition.courseId,
        )}: ${escapeHtml(scoreField)} ${escapeHtml(range)}</li>`;
      }
      case 'course_completion': {
        const completionTarget =
          condition.minCompletionPercent === undefined
            ? ''
            : ` with completion percent >= ${String(condition.minCompletionPercent)}`;
        const completionRequirement =
          condition.requireCompleted === false ? 'Completion flag not required' : 'Must be completed';
        return `<li>Course completion for ${escapeHtml(condition.courseId)}: ${escapeHtml(
          completionRequirement,
        )}${escapeHtml(completionTarget)}</li>`;
      }
      case 'program_completion': {
        const minimumCompleted =
          condition.minimumCompleted === undefined
            ? `all listed courses (${String(condition.courseIds.length)})`
            : `${String(condition.minimumCompleted)} of ${String(condition.courseIds.length)} courses`;
        return `<li>Program completion: ${escapeHtml(minimumCompleted)} required (${escapeHtml(
          condition.courseIds.join(', '),
        )})</li>`;
      }
      case 'assignment_submission': {
        const scoreClause =
          condition.minScore === undefined ? '' : ` with minimum score ${String(condition.minScore)}`;
        const submissionClause =
          condition.requireSubmitted === false ? 'submission optional' : 'submission required';
        const workflowClause =
          condition.workflowStates === undefined
            ? ''
            : ` and workflow state in (${escapeHtml(condition.workflowStates.join(', '))})`;
        return `<li>Assignment submission for ${escapeHtml(
          condition.courseId,
        )}/${escapeHtml(condition.assignmentId)}: ${escapeHtml(
          submissionClause,
        )}${escapeHtml(scoreClause)}${workflowClause}</li>`;
      }
      case 'time_window': {
        const notBefore =
          condition.notBefore === undefined
            ? ''
            : ` not before ${escapeHtml(formatIsoTimestamp(condition.notBefore))} UTC`;
        const notAfter =
          condition.notAfter === undefined
            ? ''
            : ` not after ${escapeHtml(formatIsoTimestamp(condition.notAfter))} UTC`;
        return `<li>Time window:${notBefore}${notAfter}</li>`;
      }
      case 'prerequisite_badge':
        return `<li>Requires prerequisite badge template ${escapeHtml(
          condition.badgeTemplateId,
        )}</li>`;
    }
  };

  const ruleDefinitionSummaryMarkup = (ruleJson: string | null): string => {
    if (ruleJson === null) {
      return '<p class="criteria-registry__muted">Rule definition unavailable.</p>';
    }

    try {
      const parsed = parseBadgeIssuanceRuleDefinition(JSON.parse(ruleJson));
      return `<ul class="criteria-registry__conditions">${ruleConditionMarkup(parsed.conditions)}</ul>`;
    } catch {
      return '<p class="criteria-registry__muted">Rule definition could not be parsed.</p>';
    }
  };
  
  const publicBadgePage = (requestUrl: string, model: VerificationViewModel): string => {
    const badgeName = badgeNameFromCredential(model.credential);
    const issuerName = issuerNameFromCredential(model.credential);
    const issuerUrl = issuerUrlFromCredential(model.credential);
    const issuerIdentifier = issuerIdentifierFromCredential(model.credential);
    const recipientIdentifier = recipientFromCredential(model.credential);
    const recipientName =
      model.recipientDisplayName ??
      recipientDisplayNameFromAssertion(model.assertion) ??
      'Badge recipient';
    const recipientAvatarUrl = recipientAvatarUrlFromAssertion(model.assertion);
    const achievementDetails = achievementDetailsFromCredential(model.credential);
    const evidenceDetails = evidenceDetailsFromCredential(model.credential);
    const displayBadgeImageUri = model.badgeTemplateImageUri ?? achievementDetails.imageUri;
    const fallbackBadgeImageUri =
      model.badgeTemplateImageUri === null ? null : achievementDetails.imageUri;
    const achievementImage = badgeHeroImageMarkup(
      badgeName,
      displayBadgeImageUri,
      fallbackBadgeImageUri,
    );
    const credentialUri = asString(model.credential.id) ?? model.assertion.id;
    const lifecycleState = model.lifecycle.state;
    const verificationLabel =
      lifecycleState === 'active'
        ? 'Verified'
        : lifecycleState.slice(0, 1).toUpperCase() + lifecycleState.slice(1);
    const verificationStatusClass = lifecycleState === 'active' ? 'verified' : lifecycleState;
    const publicBadgePath = publicBadgePathForAssertion(model.assertion);
    const publicBadgeUrl = new URL(publicBadgePath, requestUrl).toString();
    const summaryPath = `${publicBadgePath}/summary`;
    const summaryUrl = new URL(summaryPath, requestUrl).toString();
    const verificationApiPath = `/credentials/v1/${encodeURIComponent(model.assertion.id)}`;
    const verificationApiUrl = new URL(verificationApiPath, requestUrl).toString();
    const ob3JsonPath = `/credentials/v1/${encodeURIComponent(model.assertion.id)}/jsonld`;
    const ob3JsonUrl = new URL(ob3JsonPath, requestUrl).toString();
    const credentialDownloadPath = `/credentials/v1/${encodeURIComponent(model.assertion.id)}/download`;
    const credentialDownloadUrl = new URL(credentialDownloadPath, requestUrl).toString();
    const credentialPdfDownloadPath = `/credentials/v1/${encodeURIComponent(model.assertion.id)}/download.pdf`;
    const credentialPdfDownloadUrl = new URL(credentialPdfDownloadPath, requestUrl).toString();
    const walletOfferBadgeIdentifier = model.assertion.publicId ?? model.assertion.id;
    const walletOfferPath = `/credentials/v1/offers/${encodeURIComponent(walletOfferBadgeIdentifier)}`;
    const walletOfferUrl = new URL(walletOfferPath, requestUrl).toString();
    const walletDeepLinkUrl = new URL('openid-credential-offer://');
    walletDeepLinkUrl.searchParams.set('credential_offer_uri', walletOfferUrl);
    const dccExchangePath = `/credentials/v1/dcc/exchanges/${encodeURIComponent(walletOfferBadgeIdentifier)}`;
    const dccExchangeUrl = new URL(dccExchangePath, requestUrl).toString();
    const dccInvitationRequest = {
      credentialRequestOrigin: new URL(requestUrl).origin,
      protocols: {
        vcapi: dccExchangeUrl,
      },
    };
    const dccWalletDeepLinkUrl = new URL('https://lcw.app/request');
    dccWalletDeepLinkUrl.searchParams.set('request', JSON.stringify(dccInvitationRequest));
    const isVcV2Credential = hasContextUrl(model.credential['@context'], VC_DATA_MODEL_V2_CONTEXT_URL);
    const assertionValidationTargetUrl = ob3JsonUrl;
    const badgeClassValidationTargetUrl =
      achievementDetails.badgeClassUri !== null && isWebUrl(achievementDetails.badgeClassUri)
        ? achievementDetails.badgeClassUri
        : null;
    const issuerValidationTargetUrlFromIdentifier =
      issuerIdentifier !== null && isWebUrl(issuerIdentifier) ? issuerIdentifier : null;
    const issuerValidationTargetUrl = issuerUrl ?? issuerValidationTargetUrlFromIdentifier;
    const assertionValidatorUrl = isVcV2Credential
      ? null
      : imsOb3ValidatorUrl(assertionValidationTargetUrl);
    const badgeClassValidatorUrl =
      isVcV2Credential || badgeClassValidationTargetUrl === null
        ? null
        : imsOb3ValidatorUrl(badgeClassValidationTargetUrl);
    const issuerValidatorUrl =
      isVcV2Credential || issuerValidationTargetUrl === null
        ? null
        : imsOb3ValidatorUrl(issuerValidationTargetUrl);
    const validatorLinks =
      assertionValidatorUrl === null
        ? ''
        : [
            `<a
        class="public-badge__button"
        href="${escapeHtml(assertionValidatorUrl)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        Validate Assertion (IMS)
      </a>`,
            ...(badgeClassValidatorUrl === null
              ? []
              : [
                  `<a
              class="public-badge__button"
              href="${escapeHtml(badgeClassValidatorUrl)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              Validate Badge Class (IMS)
            </a>`,
                ]),
            ...(issuerValidatorUrl === null
              ? []
              : [
                  `<a
              class="public-badge__button"
              href="${escapeHtml(issuerValidatorUrl)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              Validate Issuer (IMS)
            </a>`,
                ]),
          ].join('');
    const imsValidatorDetailsSection =
      assertionValidatorUrl === null
        ? ''
        : `<details class="public-badge__actions-details">
              <summary>Validate with IMS tools</summary>
              <div class="public-badge__validator-links">${validatorLinks}</div>
              <p class="public-badge__validator-note">
                IMS validator expects JSON/image targets. Validate using the Open Badges 3.0 JSON URL, not this HTML page URL.
              </p>
            </details>`;
    const badgeClassValidationTechnicalDetail =
      badgeClassValidatorUrl === null
        ? '<span>Not available (badge class URI is not a web URL).</span>'
        : `<a href="${escapeHtml(badgeClassValidatorUrl)}">${escapeHtml(badgeClassValidatorUrl)}</a>`;
    const issuerValidationTechnicalDetail =
      issuerValidatorUrl === null
        ? '<span>Not available (issuer URL is not published).</span>'
        : `<a href="${escapeHtml(issuerValidatorUrl)}">${escapeHtml(issuerValidatorUrl)}</a>`;
    const imsTechnicalDetailRows =
      assertionValidatorUrl === null
        ? ''
        : `<dt>IMS assertion validation</dt>
            <dd><a href="${escapeHtml(assertionValidatorUrl)}">${escapeHtml(assertionValidatorUrl)}</a></dd>
            <dt>IMS badge class validation</dt>
            <dd>${badgeClassValidationTechnicalDetail}</dd>
            <dt>IMS issuer validation</dt>
            <dd>${issuerValidationTechnicalDetail}</dd>`;
    const qrCodeImageUrl = new URL('https://api.qrserver.com/v1/create-qr-code/');
    qrCodeImageUrl.searchParams.set('size', '220x220');
    qrCodeImageUrl.searchParams.set('format', 'svg');
    qrCodeImageUrl.searchParams.set('margin', '0');
    qrCodeImageUrl.searchParams.set('data', walletOfferUrl);
    const linkedInAddProfileUrl = linkedInAddToProfileUrl({
      badgeName,
      issuerName,
      issuedAtIso: model.assertion.issuedAt,
      credentialUrl: publicBadgeUrl,
      credentialId: credentialUri,
    });
    const linkedInShareUrl = new URL('https://www.linkedin.com/sharing/share-offsite/');
    linkedInShareUrl.searchParams.set('url', publicBadgeUrl);
    const issuedAt = `${formatIsoTimestamp(model.assertion.issuedAt)} UTC`;
    const issuerLine =
      issuerUrl === null
        ? `<span>${escapeHtml(issuerName)}</span>`
        : `<a href="${escapeHtml(issuerUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
            issuerName,
          )}</a>`;
    const pageTitle = `${badgeName} | CredTrail`;
    const pageDescription =
      nonEmptyText(achievementDetails.description) ?? `${badgeName} credential issued by ${issuerName}.`;
    const socialImageUrl = toAbsoluteWebUrl(requestUrl, displayBadgeImageUri);
    const recipientIdentifierLine = '';
    const recipientAvatarSection =
      recipientAvatarUrl === null
        ? ''
        : `<img
            class="public-badge__recipient-avatar"
            src="${escapeHtml(recipientAvatarUrl)}"
            alt="${escapeHtml(`${recipientName} GitHub avatar`)}"
            loading="lazy"
          />`;
    const criteriaSection =
      achievementDetails.criteriaUri === null
        ? ''
        : `<p class="public-badge__achievement-copy">
            Criteria:
            <a href="${escapeHtml(achievementDetails.criteriaUri)}" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(achievementDetails.criteriaUri)}
            </a>
          </p>`;
    const criteriaRegistryPath = `/showcase/${encodeURIComponent(
      model.assertion.tenantId,
    )}/criteria?badgeTemplateId=${encodeURIComponent(model.assertion.badgeTemplateId)}`;
    const criteriaRegistrySection = `<p class="public-badge__achievement-copy">
      Governance:
      <a href="${escapeHtml(criteriaRegistryPath)}">View public criteria registry entry</a>
    </p>`;
    const lifecycleDetails = (() => {
      if (lifecycleState === 'active') {
        return '';
      }

      if (lifecycleState === 'revoked' && model.lifecycle.revokedAt !== null) {
        return `<p class="public-badge__status-note public-badge__status-note--revoked">Revoked at ${escapeHtml(
          formatIsoTimestamp(model.lifecycle.revokedAt),
        )} UTC</p>`;
      }

      const transitionedAt =
        model.lifecycle.transitionedAt === null
          ? ''
          : ` since ${escapeHtml(formatIsoTimestamp(model.lifecycle.transitionedAt))} UTC`;
      const reasonLine =
        model.lifecycle.reason === null
          ? ''
          : `<p class="public-badge__status-note public-badge__status-note--${escapeHtml(
              lifecycleState,
            )}">${escapeHtml(model.lifecycle.reason)}</p>`;
      const stateLabel = verificationLabel;

      return `<p class="public-badge__status-note public-badge__status-note--${escapeHtml(
        lifecycleState,
      )}">${escapeHtml(stateLabel)}${transitionedAt}</p>${reasonLine}`;
    })();
    const achievementDescriptionSection =
      achievementDetails.description === null
        ? '<p class="public-badge__achievement-copy">No additional description provided.</p>'
        : `<p class="public-badge__achievement-copy">${escapeHtml(achievementDetails.description)}</p>`;
    const evidenceSection =
      evidenceDetails.length === 0
        ? ''
        : `<section class="public-badge__card public-badge__stack-sm">
            <h2 class="public-badge__section-title">Evidence</h2>
            <ul class="public-badge__evidence-list">
              ${evidenceDetails
                .map((entry) => {
                  const label = entry.name ?? entry.uri;
                  const description =
                    entry.description === null
                      ? ''
                      : `<p class="public-badge__evidence-description">${escapeHtml(
                          entry.description,
                        )}</p>`;
  
                  return `<li class="public-badge__evidence-item">
                    <a href="${escapeHtml(entry.uri)}" target="_blank" rel="noopener noreferrer">
                      ${escapeHtml(label)}
                    </a>
                    ${description}
                  </li>`;
                })
                .join('')}
            </ul>
          </section>`;
  
    return renderPageShell(
      pageTitle,
      `<style>
        .public-badge {
          display: grid;
          gap: 1rem;
          color: var(--ct-theme-text-title);
        }
  
        .public-badge__card {
          position: relative;
          overflow: hidden;
          background: linear-gradient(
            165deg,
            var(--ct-theme-surface-card-strong),
            var(--ct-theme-surface-soft)
          );
          border: 1px solid var(--ct-theme-border-soft);
          border-radius: 1rem;
          box-shadow: var(--ct-theme-shadow-soft);
          padding: 1.25rem;
          animation: public-badge-enter 420ms ease-out both;
        }

        .public-badge__card::after {
          content: '';
          position: absolute;
          inset: auto -16% -70% auto;
          width: 14rem;
          height: 14rem;
          background: radial-gradient(circle, var(--ct-theme-accent-glow-1), transparent 70%);
          pointer-events: none;
        }

        .public-badge__card:nth-child(2) {
          animation-delay: 45ms;
        }

        .public-badge__card:nth-child(3) {
          animation-delay: 95ms;
        }

        .public-badge__card:nth-child(4) {
          animation-delay: 140ms;
        }
  
        .public-badge__stack-sm {
          display: grid;
          gap: 0.65rem;
        }
  
        .public-badge__status {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
          color: var(--ct-theme-text-on-brand);
          font-weight: 700;
          letter-spacing: 0.015em;
        }
  
        .public-badge__status--verified {
          background: var(--ct-theme-gradient-success);
        }
  
        .public-badge__status--revoked {
          background: var(--ct-theme-gradient-danger);
        }

        .public-badge__status--suspended {
          background: var(--ct-theme-gradient-warning);
        }

        .public-badge__status--expired {
          background: var(--ct-theme-gradient-neutral);
        }

        .public-badge__status-note {
          margin: 0;
          color: var(--ct-theme-text-body);
          font-size: 0.95rem;
        }

        .public-badge__status-note--revoked {
          color: var(--ct-theme-state-danger);
        }

        .public-badge__status-note--suspended {
          color: var(--ct-theme-state-warning);
        }

        .public-badge__status-note--expired {
          color: var(--ct-theme-text-muted);
        }
  
        .public-badge__hero {
          display: grid;
          gap: 1.1rem;
        }

        .public-badge__hero-image-frame {
          position: relative;
          width: 100%;
          max-width: 420px;
        }

        .public-badge__hero-image-frame::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 1rem;
          border: 1px solid var(--ct-theme-border-soft);
          box-shadow: var(--ct-theme-shadow-card);
          pointer-events: none;
        }
  
        .public-badge__hero-image {
          display: block;
          width: 100%;
          border-radius: 1rem;
          aspect-ratio: 21 / 16;
          object-fit: cover;
          background: var(--ct-theme-surface-info);
        }

        .public-badge__hero-image-fallback {
          position: absolute;
          inset: 0;
          display: none;
          align-items: center;
          justify-content: center;
          border-radius: 1rem;
          background:
            radial-gradient(circle at 88% 12%, var(--ct-theme-accent-glow-1), transparent 45%),
            var(--ct-theme-gradient-hero);
          color: var(--ct-theme-text-on-brand);
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .public-badge__hero-image-frame[data-fallback='true'] .public-badge__hero-image-fallback {
          display: flex;
        }
  
        .public-badge__hero-meta {
          display: grid;
          gap: 0.5rem;
        }
  
        .public-badge__eyebrow {
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.11em;
          font-size: 0.8rem;
          color: var(--ct-theme-link);
          font-weight: 700;
        }
  
        .public-badge__title {
          margin: 0;
          font-size: clamp(1.65rem, 3.7vw, 2.45rem);
          line-height: 1.15;
        }
  
        .public-badge__issuer,
        .public-badge__issued-at,
        .public-badge__recipient-meta {
          margin: 0;
          color: var(--ct-theme-text-muted);
        }
  
        .public-badge__recipient-name {
          margin: 0;
          font-size: 1.35rem;
          font-weight: 700;
        }
  
        .public-badge__recipient-header {
          display: flex;
          gap: 0.8rem;
          align-items: center;
        }
  
        .public-badge__recipient-avatar {
          width: 3rem;
          height: 3rem;
          border-radius: 999px;
          border: 2px solid var(--ct-theme-border-soft);
          object-fit: cover;
          background: var(--ct-theme-surface-soft);
        }
  
        .public-badge__section-title {
          margin: 0;
          font-size: 1.12rem;
        }

        .public-badge__share {
          gap: 0.72rem;
        }

        .public-badge__share-main {
          display: grid;
          gap: 0.62rem;
        }
  
        .public-badge__achievement-copy {
          margin: 0;
          color: var(--ct-theme-text-muted);
        }
  
        .public-badge__action-group {
          display: grid;
          gap: 0.44rem;
        }

        .public-badge__action-label {
          margin: 0;
          font-size: 0.76rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--ct-theme-text-muted);
          font-weight: 700;
        }

        .public-badge__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.52rem;
          align-items: center;
        }

        .public-badge__actions--primary .public-badge__button {
          font-weight: 700;
        }

        .public-badge__actions--secondary {
          margin-top: 0.48rem;
        }

        .public-badge__button {
          border: 1px solid var(--ct-theme-border-default);
          border-radius: 0.7rem;
          padding: 0.44rem 0.74rem;
          text-decoration: none;
          font-size: 0.84rem;
          line-height: 1.2;
          font-weight: 600;
          color: var(--ct-theme-text-body);
          background: linear-gradient(
            180deg,
            var(--ct-theme-surface-card-strong),
            var(--ct-theme-surface-info)
          );
          cursor: pointer;
          transition:
            transform var(--ct-duration-fast) var(--ct-ease-standard),
            box-shadow var(--ct-duration-fast) var(--ct-ease-standard),
            border-color var(--ct-duration-fast) var(--ct-ease-standard);
        }

        .public-badge__button:hover {
          color: var(--ct-theme-text-body);
          transform: translateY(-1px);
          box-shadow: var(--ct-theme-shadow-soft);
          border-color: var(--ct-theme-border-strong);
        }
  
        .public-badge__button--primary {
          border-color: transparent;
          background: var(--ct-theme-gradient-action);
          color: var(--ct-theme-text-on-brand);
        }

        .public-badge__button--primary:hover {
          background: var(--ct-theme-gradient-action-hover);
          color: var(--ct-theme-text-on-brand);
        }

        .public-badge__button--wallet {
          box-shadow: var(--ct-theme-shadow-card);
        }
  
        .public-badge__button--accent {
          border-color: var(--ct-theme-border-warning);
          background: var(--ct-theme-surface-warning);
          color: var(--ct-theme-state-warning);
        }

        .public-badge__button--accent:hover {
          color: var(--ct-theme-state-warning);
        }
  
        .public-badge__copy-status {
          margin: 0;
          color: var(--ct-theme-text-muted);
          font-size: 0.88rem;
        }

        .public-badge__actions-details {
          border: 1px solid var(--ct-theme-border-soft);
          border-radius: 0.74rem;
          padding: 0.56rem 0.66rem;
          background: var(--ct-theme-surface-info);
        }

        .public-badge__actions-details[open] {
          border-color: var(--ct-theme-border-default);
          box-shadow: var(--ct-theme-shadow-soft);
        }

        .public-badge__actions-details summary {
          cursor: pointer;
          font-weight: 700;
          color: var(--ct-theme-text-body);
          font-size: 0.92rem;
        }
  
        .public-badge__validator-links {
          margin-top: 0.5rem;
          display: grid;
          gap: 0.48rem;
        }
  
        .public-badge__validator-note {
          margin: 0;
          color: var(--ct-theme-text-muted);
          font-size: 0.88rem;
          line-height: 1.35;
        }
  
        .public-badge__qr {
          margin: 0.08rem 0 0;
          display: grid;
          justify-items: start;
          gap: 0.4rem;
          border: 1px solid var(--ct-theme-border-soft);
          border-radius: 0.8rem;
          padding: 0.62rem;
          background: var(--ct-theme-surface-soft);
        }
  
        .public-badge__qr-image {
          width: 11.5rem;
          height: 11.5rem;
          border-radius: 0.9rem;
          border: 1px solid var(--ct-theme-border-default);
          background: var(--ct-theme-surface-card-strong);
        }
  
        .public-badge__qr-caption {
          color: var(--ct-theme-text-muted);
          font-size: 0.84rem;
          line-height: 1.35;
        }
  
        .public-badge__evidence-list {
          margin: 0;
          padding-left: 1.2rem;
          display: grid;
          gap: 0.5rem;
        }
  
        .public-badge__evidence-item a {
          font-weight: 600;
        }
  
        .public-badge__evidence-description {
          margin: 0.2rem 0 0 0;
          color: var(--ct-theme-text-muted);
        }
  
        .public-badge__technical summary {
          cursor: pointer;
          font-weight: 700;
        }
  
        .public-badge__technical-grid {
          margin: 0.85rem 0 0 0;
          display: grid;
          grid-template-columns: minmax(9rem, max-content) 1fr;
          gap: 0.45rem 0.8rem;
        }
  
        .public-badge__technical-grid dt {
          font-weight: 600;
          color: var(--ct-theme-text-body);
        }
  
        .public-badge__technical-grid dd {
          margin: 0;
          overflow-wrap: anywhere;
        }

        @keyframes public-badge-enter {
          from {
            opacity: 0;
            transform: translateY(7px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
  
        @media (min-width: 760px) {
          .public-badge__hero {
            grid-template-columns: minmax(260px, 340px) 1fr;
            align-items: start;
          }
        }

        @media (min-width: 980px) {
          .public-badge__share {
            grid-template-columns: minmax(0, 1fr) auto;
            column-gap: 1rem;
            align-items: start;
          }

          .public-badge__share .public-badge__section-title {
            grid-column: 1 / -1;
          }

          .public-badge__share-main {
            grid-column: 1;
          }

          .public-badge__share .public-badge__qr {
            grid-column: 2;
            grid-row: 2;
          }
        }

        @media (max-width: 759px) {
          .public-badge__status {
            flex-direction: column;
            align-items: flex-start;
          }

          .public-badge__share .public-badge__qr {
            justify-items: center;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .public-badge__card {
            animation: none;
          }
          .public-badge__button {
            transition: none;
          }
        }
      </style>
      <article class="public-badge">
        <section class="public-badge__card public-badge__status public-badge__status--${
          verificationStatusClass
        }">
          <span>${escapeHtml(verificationLabel)}</span>
          <span>${escapeHtml(issuedAt)}</span>
        </section>
  
        <section class="public-badge__card public-badge__hero">
          ${achievementImage}
          <div class="public-badge__hero-meta">
            <p class="public-badge__eyebrow">Open Badges 3.0 Credential</p>
            <h1 class="public-badge__title">${escapeHtml(badgeName)}</h1>
            <p class="public-badge__issuer">Issued by ${issuerLine}</p>
            <p class="public-badge__issued-at">Issued ${escapeHtml(issuedAt)}</p>
            ${lifecycleDetails}
          </div>
        </section>
  
        <section class="public-badge__card public-badge__stack-sm">
          <h2 class="public-badge__section-title">Recipient</h2>
          <div class="public-badge__recipient-header">
            ${recipientAvatarSection}
            <p class="public-badge__recipient-name">${escapeHtml(recipientName)}</p>
          </div>
          ${recipientIdentifierLine}
        </section>
  
        <section class="public-badge__card public-badge__stack-sm">
          <h2 class="public-badge__section-title">Achievement</h2>
          ${achievementDescriptionSection}
          ${criteriaSection}
          ${criteriaRegistrySection}
        </section>
  
        ${evidenceSection}
  
        <section class="public-badge__card public-badge__stack-sm public-badge__share">
          <h2 class="public-badge__section-title">Share and verify</h2>
          <div class="public-badge__share-main">
            <div class="public-badge__action-group">
              <p class="public-badge__action-label">Primary actions</p>
              <div class="public-badge__actions public-badge__actions--primary">
                <a
                  class="public-badge__button public-badge__button--accent"
                  href="${escapeHtml(linkedInAddProfileUrl)}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Add to LinkedIn Profile
                </a>
                <a
                  class="public-badge__button"
                  href="${escapeHtml(linkedInShareUrl.toString())}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Share on LinkedIn Feed
                </a>
                <a
                  class="public-badge__button public-badge__button--primary public-badge__button--wallet"
                  href="${escapeHtml(walletDeepLinkUrl.toString())}"
                >
                  Open in Wallet App
                </a>
                <a
                  class="public-badge__button public-badge__button--wallet"
                  href="${escapeHtml(dccWalletDeepLinkUrl.toString())}"
                >
                  Open in DCC Learner Wallet
                </a>
                <a class="public-badge__button public-badge__button--primary" href="${escapeHtml(ob3JsonPath)}">
                  Open Badges 3.0 JSON
                </a>
                <button
                  id="copy-badge-url-button"
                  class="public-badge__button"
                  type="button"
                  data-copy-value="${escapeHtml(publicBadgeUrl)}"
                >
                  Copy URL
                </button>
              </div>
            </div>
            <details class="public-badge__actions-details">
              <summary>More share/download options</summary>
              <div class="public-badge__actions public-badge__actions--secondary">
                <a class="public-badge__button" href="${escapeHtml(summaryPath)}">Summary JSON</a>
                <a class="public-badge__button" href="${escapeHtml(credentialDownloadPath)}">Download .jsonld VC</a>
                <a class="public-badge__button" href="${escapeHtml(credentialPdfDownloadPath)}">Download PDF</a>
                <a class="public-badge__button" href="${escapeHtml(walletOfferPath)}">OpenID4VCI Offer</a>
                <button
                  id="chapi-store-button"
                  class="public-badge__button"
                  type="button"
                  data-credential-json-url="${escapeHtml(ob3JsonPath)}"
                >
                  Add to Browser Wallet
                </button>
              </div>
            </details>
            <p id="copy-badge-url-status" class="public-badge__copy-status" aria-live="polite"></p>
            <p id="chapi-store-status" class="public-badge__copy-status" aria-live="polite"></p>
            ${imsValidatorDetailsSection}
          </div>
          <figure class="public-badge__qr">
            <img
              class="public-badge__qr-image"
              src="${escapeHtml(qrCodeImageUrl.toString())}"
              alt="QR code for OpenID4VCI credential offer endpoint"
              loading="lazy"
            />
            <figcaption class="public-badge__qr-caption">
              Scan to claim this credential in a compatible wallet.
            </figcaption>
          </figure>
        </section>
  
        <details class="public-badge__card public-badge__technical">
          <summary>Technical details</summary>
          <dl class="public-badge__technical-grid">
            <dt>Issuer ID</dt>
            <dd>${escapeHtml(issuerIdentifier ?? 'Not available')}</dd>
            <dt>Recipient identity</dt>
            <dd>${escapeHtml(model.assertion.recipientIdentity)}</dd>
            <dt>Recipient identity type</dt>
            <dd>${escapeHtml(model.assertion.recipientIdentityType)}</dd>
            <dt>Credential ID</dt>
            <dd>${escapeHtml(credentialUri)}</dd>
            <dt>Assertion ID</dt>
            <dd>${escapeHtml(model.assertion.id)}</dd>
            <dt>Recipient ID</dt>
            <dd>${escapeHtml(recipientIdentifier)}</dd>
            <dt>Verification JSON</dt>
            <dd><a href="${escapeHtml(verificationApiPath)}">${escapeHtml(verificationApiUrl)}</a></dd>
            <dt>Summary JSON</dt>
            <dd><a href="${escapeHtml(summaryPath)}">${escapeHtml(summaryUrl)}</a></dd>
            <dt>Open Badges 3.0 JSON</dt>
            <dd><a href="${escapeHtml(ob3JsonPath)}">${escapeHtml(ob3JsonUrl)}</a></dd>
            <dt>Credential download</dt>
            <dd><a href="${escapeHtml(credentialDownloadPath)}">${escapeHtml(credentialDownloadUrl)}</a></dd>
            <dt>OpenID4VCI offer</dt>
            <dd><a href="${escapeHtml(walletOfferPath)}">${escapeHtml(walletOfferUrl)}</a></dd>
            <dt>DCC VC-API exchange</dt>
            <dd><a href="${escapeHtml(dccExchangePath)}">${escapeHtml(dccExchangeUrl)}</a></dd>
            <dt>Credential PDF download</dt>
            <dd><a href="${escapeHtml(credentialPdfDownloadPath)}">${escapeHtml(credentialPdfDownloadUrl)}</a></dd>
            ${imsTechnicalDetailRows}
          </dl>
        </details>
  
        <script>
          (() => {
            const button = document.getElementById('copy-badge-url-button');
            const status = document.getElementById('copy-badge-url-status');
  
            if (!(button instanceof HTMLButtonElement) || !(status instanceof HTMLElement)) {
              return;
            }
  
            const value = button.dataset.copyValue;
  
            if (typeof value !== 'string' || value.length === 0) {
              return;
            }
  
            button.addEventListener('click', async () => {
              try {
                await navigator.clipboard.writeText(value);
                status.textContent = 'Badge URL copied';
              } catch {
                status.textContent = 'Unable to copy URL automatically';
              }
            });

            const chapiButton = document.getElementById('chapi-store-button');
            const chapiStatus = document.getElementById('chapi-store-status');

            if (!(chapiButton instanceof HTMLButtonElement) || !(chapiStatus instanceof HTMLElement)) {
              return;
            }

            const credentialJsonUrl = chapiButton.dataset.credentialJsonUrl;

            if (typeof credentialJsonUrl !== 'string' || credentialJsonUrl.length === 0) {
              return;
            }

            chapiButton.addEventListener('click', async () => {
              const credentialsApi = navigator.credentials;

              if (credentialsApi === undefined || typeof credentialsApi.store !== 'function') {
                chapiStatus.textContent = 'Browser wallet API unavailable; use Download .jsonld VC.';
                return;
              }

              try {
                const response = await fetch(credentialJsonUrl, {
                  headers: {
                    accept: 'application/ld+json, application/json',
                  },
                });

                if (!response.ok) {
                  chapiStatus.textContent = 'Unable to load credential for browser wallet import.';
                  return;
                }

                const credential = await response.json();

                await credentialsApi.store({
                  type: 'OpenBadgeCredential',
                  credential,
                });
                chapiStatus.textContent = 'Credential sent to browser wallet.';
              } catch {
                chapiStatus.textContent = 'Browser wallet import failed; use Download .jsonld VC.';
              }
            });
          })();
        </script>
      </article>`,
      buildSeoHeadContent({
        title: pageTitle,
        description: pageDescription,
        canonicalUrl: publicBadgeUrl,
        ogType: 'article',
        imageUrl: socialImageUrl,
        extraHeadContent: `<link rel="alternate" type="application/ld+json" href="${escapeHtml(
          ob3JsonUrl,
        )}" />
      <link rel="alternate" type="application/json" href="${escapeHtml(summaryUrl)}" />`,
      }),
    );
  };

  const tenantBadgeWallPage = (
    requestUrl: string,
    tenantId: string,
    entries: readonly PublicBadgeWallEntryViewRecord[],
    filterBadgeTemplateId: string | null,
  ): string => {
    const title =
      filterBadgeTemplateId === null ? `Badge Wall · ${tenantId}` : `Badge Wall · ${tenantId}`;
    const badgeWallPath =
      filterBadgeTemplateId === null
        ? `/showcase/${encodeURIComponent(tenantId)}`
        : `/showcase/${encodeURIComponent(tenantId)}?badgeTemplateId=${encodeURIComponent(
            filterBadgeTemplateId,
          )}`;
    const canonicalUrl = new URL(badgeWallPath, requestUrl).toString();
    const subtitle =
      filterBadgeTemplateId === null
        ? `Public badge URLs issued under tenant "${tenantId}".`
        : `Public badge URLs issued under tenant "${tenantId}" for badge template "${filterBadgeTemplateId}".`;
    const criteriaRegistryPath =
      filterBadgeTemplateId === null
        ? `/showcase/${encodeURIComponent(tenantId)}/criteria`
        : `/showcase/${encodeURIComponent(tenantId)}/criteria?badgeTemplateId=${encodeURIComponent(
            filterBadgeTemplateId,
          )}`;
    const cards =
      entries.length === 0
        ? ''
        : entries
            .map((entry) => {
              const username = githubUsernameFromUrl(entry.recipientIdentity);
              const recipientLabel = username === null ? entry.recipientIdentity : `@${username}`;
              const avatarUrl = username === null ? null : githubAvatarUrlForUsername(username);
              const badgePath = `/badges/${encodeURIComponent(entry.assertionPublicId)}`;
              const badgeUrl = new URL(badgePath, requestUrl).toString();
              const issuedAt = `${formatIsoTimestamp(entry.issuedAt)} UTC`;
              const lifecycleState = entry.lifecycle.state;
              const statusLabel =
                lifecycleState === 'active'
                  ? 'Verified'
                  : lifecycleState.slice(0, 1).toUpperCase() + lifecycleState.slice(1);
              const statusClass = lifecycleState === 'active' ? 'verified' : lifecycleState;
              const transitionedAt =
                lifecycleState === 'revoked'
                  ? entry.lifecycle.revokedAt ?? entry.lifecycle.transitionedAt
                  : entry.lifecycle.transitionedAt;
              const transitionLine =
                transitionedAt === null || lifecycleState === 'active'
                  ? ''
                  : `<p class="badge-wall__meta badge-wall__meta--${escapeHtml(statusClass)}">${escapeHtml(
                      statusLabel,
                    )} ${escapeHtml(formatIsoTimestamp(transitionedAt))} UTC</p>`;
              const reasonText = entry.lifecycle.reason ?? entry.lifecycle.reasonCode;
              const reasonLine =
                reasonText === null || lifecycleState === 'active'
                  ? ''
                  : `<p class="badge-wall__meta badge-wall__meta--reason">${escapeHtml(reasonText)}</p>`;
              const avatarMarkup =
                avatarUrl === null
                  ? ''
                  : `<img
                      class="badge-wall__avatar"
                      src="${escapeHtml(avatarUrl)}"
                      alt="${escapeHtml(`${recipientLabel} GitHub avatar`)}"
                      loading="lazy"
                    />`;
              const badgeInitial = entry.badgeTitle.trim().slice(0, 1).toUpperCase() || 'B';
              const badgeImageMarkup =
                entry.badgeImageUri === null
                  ? `<span class="badge-wall__badge-image badge-wall__badge-image--placeholder" aria-hidden="true">${escapeHtml(
                      badgeInitial,
                    )}</span>`
                  : `<img
                      class="badge-wall__badge-image"
                      src="${escapeHtml(entry.badgeImageUri)}"
                      alt="${escapeHtml(`${entry.badgeTitle} image`)}"
                      loading="lazy"
                    />`;
  
              return `<li class="badge-wall__item">
                <div class="badge-wall__summary">
                  ${badgeImageMarkup}
                  <div class="badge-wall__recipient">
                    ${avatarMarkup}
                    <div class="badge-wall__stack">
                      <p class="badge-wall__name">${escapeHtml(recipientLabel)}</p>
                      <p class="badge-wall__badge-title">${escapeHtml(entry.badgeTitle)}</p>
                      <p class="badge-wall__meta badge-wall__meta--${escapeHtml(statusClass)}">${escapeHtml(
                        statusLabel,
                      )} · Issued ${escapeHtml(issuedAt)}</p>
                      ${transitionLine}
                      ${reasonLine}
                    </div>
                  </div>
                </div>
                <div class="badge-wall__actions">
                  <a class="badge-wall__button badge-wall__button--primary" href="${escapeHtml(badgePath)}">View badge</a>
                  <button class="badge-wall__button" type="button" data-copy-value="${escapeHtml(
                    badgeUrl,
                  )}">Copy link</button>
                  <p class="badge-wall__copy-status" aria-live="polite"></p>
                </div>
                <details class="badge-wall__url-details">
                  <summary>Show raw badge URL</summary>
                  <p class="badge-wall__url" title="${escapeHtml(badgeUrl)}">${escapeHtml(badgeUrl)}</p>
                </details>
              </li>`;
            })
            .join('');
    const listMarkup =
      entries.length === 0
        ? '<p class="badge-wall__empty">No public badges found for this showcase.</p>'
        : `<ol class="badge-wall__list">${cards}</ol>`;
    const pageTitle = `${title} | CredTrail`;
    const socialImageUrl =
      entries
        .map((entry) => toAbsoluteWebUrl(requestUrl, entry.badgeImageUri))
        .find((value): value is string => value !== null) ?? null;
  
    return renderPageShell(
      pageTitle,
      `<style>
        .badge-wall {
          display: grid;
          gap: 1rem;
          color: var(--ct-theme-text-title);
        }

        .badge-wall__hero {
          border: 1px solid var(--ct-theme-border-default);
          border-radius: 1rem;
          padding: 1rem;
          background:
            radial-gradient(circle at 88% 8%, var(--ct-theme-accent-glow-1), transparent 42%),
            var(--ct-theme-gradient-hero);
          color: var(--ct-theme-text-on-brand);
          box-shadow: var(--ct-theme-shadow-card);
        }

        .badge-wall__hero h1 {
          color: var(--ct-theme-text-on-brand);
        }
  
        .badge-wall__lead {
          margin: 0;
          color: var(--ct-theme-text-inverse);
        }
  
        .badge-wall__count {
          margin: 0;
          font-weight: 600;
          color: var(--ct-brand-sun-400);
        }

        .badge-wall__hero-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          border: 1px solid var(--ct-theme-surface-brand-chip-strong);
          border-radius: 0.65rem;
          padding: 0.35rem 0.62rem;
          color: var(--ct-theme-text-on-brand);
          text-decoration: none;
          font-weight: 700;
          background: var(--ct-theme-surface-brand-chip);
          transition:
            background-color var(--ct-duration-fast) var(--ct-ease-standard),
            border-color var(--ct-duration-fast) var(--ct-ease-standard),
            color var(--ct-duration-fast) var(--ct-ease-standard);
        }

        .badge-wall__hero-link:hover,
        .badge-wall__hero-link:focus-visible {
          color: var(--ct-theme-text-on-brand);
          background: var(--ct-theme-surface-brand-chip-strong);
          border-color: var(--ct-theme-text-inverse);
        }
  
        .badge-wall__list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 0.75rem;
        }
  
        .badge-wall__item {
          border: 1px solid var(--ct-theme-border-soft);
          border-radius: 0.9rem;
          background: linear-gradient(
            165deg,
            var(--ct-theme-surface-card-strong),
            var(--ct-theme-surface-soft)
          );
          box-shadow: var(--ct-theme-shadow-soft);
          padding: 0.78rem;
          display: grid;
          gap: 0.5rem;
          animation: badge-wall-item-enter 420ms ease-out both;
        }

        .badge-wall__item:nth-child(2n) {
          animation-delay: 60ms;
        }
  
        .badge-wall__recipient {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .badge-wall__summary {
          display: grid;
          gap: 0.62rem;
          grid-template-columns: auto 1fr;
          align-items: center;
        }

        .badge-wall__badge-image {
          width: 3rem;
          height: 3rem;
          border-radius: 0.52rem;
          border: 1px solid var(--ct-theme-border-default);
          object-fit: cover;
          background: var(--ct-theme-surface-info);
        }

        .badge-wall__badge-image--placeholder {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--ct-theme-text-on-brand);
          font-weight: 700;
          font-size: 1.3rem;
          text-transform: uppercase;
          background:
            radial-gradient(circle at 82% 10%, var(--ct-theme-accent-glow-1), transparent 42%),
            var(--ct-theme-gradient-hero);
        }
  
        .badge-wall__avatar {
          width: 2.25rem;
          height: 2.25rem;
          border-radius: 999px;
          border: 2px solid var(--ct-theme-border-soft);
          object-fit: cover;
          background: var(--ct-theme-surface-info);
        }
  
        .badge-wall__stack {
          display: grid;
          gap: 0.2rem;
        }
  
        .badge-wall__name {
          margin: 0;
          font-weight: 700;
        }
  
        .badge-wall__badge-title {
          margin: 0;
          color: var(--ct-theme-text-body);
        }
  
        .badge-wall__meta {
          margin: 0;
          color: var(--ct-theme-text-muted);
          font-size: 0.88rem;
        }

        .badge-wall__meta--verified {
          color: var(--ct-theme-text-body);
        }

        .badge-wall__meta--suspended {
          color: var(--ct-theme-state-warning);
        }

        .badge-wall__meta--revoked {
          color: var(--ct-theme-state-danger);
        }

        .badge-wall__meta--expired {
          color: var(--ct-theme-text-muted);
        }

        .badge-wall__meta--reason {
          color: var(--ct-theme-text-subtle);
          font-size: 0.82rem;
        }
  
        .badge-wall__url {
          margin: 0.42rem 0 0 0;
          font-size: 0.83rem;
          color: var(--ct-theme-text-subtle);
          font-family: var(--ct-font-mono);
          display: block;
          max-width: 100%;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .badge-wall__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.42rem;
          align-items: center;
        }

        .badge-wall__button {
          border: 1px solid var(--ct-theme-border-default);
          border-radius: 0.62rem;
          padding: 0.36rem 0.66rem;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--ct-theme-text-body);
          background: linear-gradient(
            180deg,
            var(--ct-theme-surface-card-strong),
            var(--ct-theme-surface-info)
          );
          cursor: pointer;
          text-decoration: none;
          transition:
            transform var(--ct-duration-fast) var(--ct-ease-standard),
            box-shadow var(--ct-duration-fast) var(--ct-ease-standard),
            border-color var(--ct-duration-fast) var(--ct-ease-standard),
            color var(--ct-duration-fast) var(--ct-ease-standard);
        }

        .badge-wall__button:hover {
          color: var(--ct-theme-text-body);
          transform: translateY(-1px);
          box-shadow: var(--ct-theme-shadow-soft);
          border-color: var(--ct-theme-border-strong);
        }

        .badge-wall__button--primary {
          border-color: transparent;
          color: var(--ct-theme-text-on-brand);
          background: var(--ct-theme-gradient-action);
        }

        .badge-wall__button--primary:hover {
          color: var(--ct-theme-text-on-brand);
          background: var(--ct-theme-gradient-action-hover);
        }

        .badge-wall__copy-status {
          margin: 0;
          font-size: 0.78rem;
          color: var(--ct-theme-text-subtle);
          min-height: 1rem;
        }

        .badge-wall__url-details {
          border: 1px solid var(--ct-theme-border-soft);
          border-radius: 0.58rem;
          padding: 0.34rem 0.5rem;
          background: var(--ct-theme-surface-soft);
        }

        .badge-wall__url-details summary {
          cursor: pointer;
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--ct-theme-text-muted);
        }
  
        .badge-wall__empty {
          margin: 0;
          color: var(--ct-theme-text-muted);
        }

        @keyframes badge-wall-item-enter {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .badge-wall__item {
            animation: none;
          }
        }

        @media (max-width: 640px) {
          .badge-wall__summary {
            grid-template-columns: 1fr;
            align-items: start;
          }
        }
      </style>
      <section class="badge-wall">
        <header class="badge-wall__hero">
          <h1 style="margin:0;">${escapeHtml(title)}</h1>
          <p class="badge-wall__lead">${escapeHtml(subtitle)}</p>
          <p class="badge-wall__count">${escapeHtml(String(entries.length))} issued badges</p>
          <a class="badge-wall__hero-link" href="${escapeHtml(criteriaRegistryPath)}">
            View criteria registry
          </a>
        </header>
        ${listMarkup}
        <script>
          (() => {
            const copyButtons = document.querySelectorAll('.badge-wall__button[data-copy-value]');

            for (const button of copyButtons) {
              if (!(button instanceof HTMLButtonElement)) {
                continue;
              }

              const copyValue = button.dataset.copyValue;
              const status = button.closest('.badge-wall__item')?.querySelector('.badge-wall__copy-status');

              if (typeof copyValue !== 'string' || copyValue.length === 0 || !(status instanceof HTMLElement)) {
                continue;
              }

              button.addEventListener('click', async () => {
                try {
                  await navigator.clipboard.writeText(copyValue);
                  status.textContent = 'Copied link';
                } catch {
                  status.textContent = 'Unable to copy automatically';
                }
              });
            }
          })();
        </script>
      </section>`,
      buildSeoHeadContent({
        title: pageTitle,
        description: subtitle,
        canonicalUrl,
        ogType: 'website',
        imageUrl: socialImageUrl,
      }),
    );
  };

  const tenantBadgeCriteriaRegistryPage = (
    requestUrl: string,
    tenantId: string,
    model: PublicBadgeCriteriaRegistryViewModel,
    filterBadgeTemplateId: string | null,
  ): string => {
    const title = `Badge Criteria Registry · ${tenantId}`;
    const criteriaRegistryPath =
      filterBadgeTemplateId === null
        ? `/showcase/${encodeURIComponent(tenantId)}/criteria`
        : `/showcase/${encodeURIComponent(tenantId)}/criteria?badgeTemplateId=${encodeURIComponent(
            filterBadgeTemplateId,
          )}`;
    const canonicalUrl = new URL(criteriaRegistryPath, requestUrl).toString();
    const subtitle =
      filterBadgeTemplateId === null
        ? `Public criteria and governance metadata for badge templates under tenant "${tenantId}".`
        : `Public criteria and governance metadata for tenant "${tenantId}" badge template "${filterBadgeTemplateId}".`;
    const badgeWallPath =
      filterBadgeTemplateId === null
        ? `/showcase/${encodeURIComponent(tenantId)}`
        : `/showcase/${encodeURIComponent(tenantId)}?badgeTemplateId=${encodeURIComponent(
            filterBadgeTemplateId,
          )}`;
    const orgUnitById = new Map(model.orgUnits.map((orgUnit) => [orgUnit.id, orgUnit]));
    const templateCards =
      model.templates.length === 0
        ? '<p class="criteria-registry__empty">No badge templates matched this criteria registry view.</p>'
        : model.templates
            .map((entry) => {
              const template = entry.template;
              const ownerOrgUnit = entry.ownerOrgUnit;
              const ownerLabel =
                ownerOrgUnit === null
                  ? template.ownerOrgUnitId
                  : `${ownerOrgUnit.displayName} (${ownerOrgUnit.unitType})`;
              const templateShowcasePath = `/showcase/${encodeURIComponent(
                tenantId,
              )}?badgeTemplateId=${encodeURIComponent(template.id)}`;
              const criteriaLink =
                template.criteriaUri === null
                  ? '<span class="criteria-registry__muted">No external criteria URL published.</span>'
                  : `<a href="${escapeHtml(template.criteriaUri)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                      template.criteriaUri,
                    )}</a>`;
              const governanceMetadataSection =
                template.governanceMetadataJson === null
                  ? ''
                  : `<details class="criteria-registry__details">
                      <summary>Governance metadata</summary>
                      <pre class="criteria-registry__pre">${escapeHtml(template.governanceMetadataJson)}</pre>
                    </details>`;
              const ownershipTimeline =
                entry.ownershipEvents.length === 0
                  ? '<p class="criteria-registry__muted">No ownership transfer events recorded.</p>'
                  : `<ol class="criteria-registry__timeline">
                      ${entry.ownershipEvents
                        .map((event) => {
                          const fromOrgUnit =
                            event.fromOrgUnitId === null
                              ? null
                              : (orgUnitById.get(event.fromOrgUnitId) ?? null);
                          const toOrgUnit = orgUnitById.get(event.toOrgUnitId) ?? null;
                          const fromLabel = fromOrgUnit === null ? 'Unassigned' : fromOrgUnit.displayName;
                          const toLabel = toOrgUnit === null ? event.toOrgUnitId : toOrgUnit.displayName;
                          const actor = event.transferredByUserId ?? 'system';
                          const reason =
                            event.reason === null
                              ? event.reasonCode
                              : `${event.reasonCode}: ${event.reason}`;
                          return `<li>
                            <p><strong>${escapeHtml(fromLabel)}</strong> → <strong>${escapeHtml(
                            toLabel,
                          )}</strong></p>
                            <p class="criteria-registry__muted">Reason: ${escapeHtml(
                              reason,
                            )} · Actor: ${escapeHtml(actor)} · ${escapeHtml(
                              formatIsoTimestamp(event.transferredAt),
                            )} UTC</p>
                          </li>`;
                        })
                        .join('')}
                    </ol>`;
              const rulesSection =
                entry.rules.length === 0
                  ? '<p class="criteria-registry__muted">No issuance rules are linked to this template.</p>'
                  : entry.rules
                      .map((ruleEntry) => {
                        const latestVersion = ruleEntry.latestVersion;
                        const activeVersion = ruleEntry.activeVersion;
                        const effectiveVersion = activeVersion ?? latestVersion;
                        const latestVersionLabel =
                          latestVersion === null
                            ? 'none'
                            : `v${String(latestVersion.versionNumber)} (${latestVersion.status})`;
                        const activeVersionLabel =
                          activeVersion === null ? 'none' : `v${String(activeVersion.versionNumber)}`;
                        const changeSummary =
                          effectiveVersion?.changeSummary === null ||
                          effectiveVersion?.changeSummary === undefined
                            ? '<span class="criteria-registry__muted">No change summary provided.</span>'
                            : escapeHtml(effectiveVersion.changeSummary);
                        const approvalStepsMarkup =
                          ruleEntry.approvalSteps.length === 0
                            ? '<p class="criteria-registry__muted">No approval steps recorded for this version.</p>'
                            : `<ol class="criteria-registry__approval-steps">
                                ${ruleEntry.approvalSteps
                                  .map((step) => {
                                    const actor = step.decidedByUserId ?? 'pending';
                                    const decidedAt =
                                      step.decidedAt === null
                                        ? 'awaiting decision'
                                        : `${formatIsoTimestamp(step.decidedAt)} UTC`;
                                    return `<li>
                                      <p>Step ${String(step.stepNumber)} · required role <strong>${escapeHtml(
                                      step.requiredRole,
                                    )}</strong> · status <strong>${escapeHtml(step.status)}</strong></p>
                                      <p class="criteria-registry__muted">Actor: ${escapeHtml(
                                        actor,
                                      )} · ${escapeHtml(decidedAt)}</p>
                                    </li>`;
                                  })
                                  .join('')}
                              </ol>`;
                        const approvalEventsMarkup =
                          ruleEntry.approvalEvents.length === 0
                            ? '<p class="criteria-registry__muted">No approval events recorded.</p>'
                            : `<ol class="criteria-registry__approval-events">
                                ${ruleEntry.approvalEvents
                                  .map((event) => {
                                    const actor = event.actorUserId ?? 'system';
                                    const role = event.actorRole ?? 'unknown_role';
                                    const comment =
                                      event.comment === null
                                        ? ''
                                        : ` · ${escapeHtml(event.comment)}`;
                                    return `<li>${escapeHtml(event.action)} by ${escapeHtml(
                                      actor,
                                    )} (${escapeHtml(role)}) at ${escapeHtml(
                                      formatIsoTimestamp(event.occurredAt),
                                    )} UTC${comment}</li>`;
                                  })
                                  .join('')}
                              </ol>`;

                        return `<article class="criteria-registry__rule">
                          <header>
                            <h3>${escapeHtml(ruleEntry.rule.name)}</h3>
                            <p class="criteria-registry__muted">
                              Rule ID: ${escapeHtml(ruleEntry.rule.id)} · LMS: ${escapeHtml(
                                ruleEntry.rule.lmsProviderKind,
                              )}
                            </p>
                            <p class="criteria-registry__muted">
                              Active version: ${escapeHtml(activeVersionLabel)} · Latest version: ${escapeHtml(
                                latestVersionLabel,
                              )}
                            </p>
                          </header>
                          <div class="criteria-registry__stack-sm">
                            <p><strong>What qualifies a learner</strong></p>
                            ${ruleDefinitionSummaryMarkup(effectiveVersion?.ruleJson ?? null)}
                            <p><strong>Change summary</strong></p>
                            <p class="criteria-registry__muted">${changeSummary}</p>
                            <details class="criteria-registry__details">
                              <summary>Approval chain and sign-off</summary>
                              ${approvalStepsMarkup}
                            </details>
                            <details class="criteria-registry__details">
                              <summary>Approval event history</summary>
                              ${approvalEventsMarkup}
                            </details>
                          </div>
                        </article>`;
                      })
                      .join('');

              return `<article class="criteria-registry__template-card">
                <header class="criteria-registry__template-header">
                  ${
                    template.imageUri === null
                      ? '<span class="criteria-registry__template-image criteria-registry__template-image--placeholder" aria-hidden="true">B</span>'
                      : `<img class="criteria-registry__template-image" src="${escapeHtml(
                          template.imageUri,
                        )}" alt="${escapeHtml(`${template.title} image`)}" loading="lazy" />`
                  }
                  <div class="criteria-registry__template-meta">
                    <h2>${escapeHtml(template.title)}</h2>
                    <p class="criteria-registry__muted">Template ID: ${escapeHtml(template.id)}</p>
                    <p class="criteria-registry__muted">Slug: ${escapeHtml(template.slug)}</p>
                  </div>
                </header>
                <p class="criteria-registry__description">${escapeHtml(
                  template.description ?? 'No description published.',
                )}</p>
                <dl class="criteria-registry__facts">
                  <div class="criteria-registry__fact">
                    <dt>Criteria URL</dt>
                    <dd>${criteriaLink}</dd>
                  </div>
                  <div class="criteria-registry__fact">
                    <dt>Governance owner</dt>
                    <dd>${escapeHtml(ownerLabel)}</dd>
                  </div>
                  <div class="criteria-registry__fact">
                    <dt>Last updated</dt>
                    <dd>${escapeHtml(formatIsoTimestamp(template.updatedAt))} UTC</dd>
                  </div>
                </dl>
                <p class="criteria-registry__actions">
                  <a href="${escapeHtml(templateShowcasePath)}">View badge wall entries for this template</a>
                </p>
                <section class="criteria-registry__section">
                  <h3>Issuance rules</h3>
                  ${rulesSection}
                </section>
                <section class="criteria-registry__section">
                  <h3>Ownership history</h3>
                  ${ownershipTimeline}
                </section>
                ${governanceMetadataSection}
              </article>`;
            })
            .join('');
    const pageTitle = `${title} | CredTrail`;
    const socialImageUrl =
      model.templates
        .map((entry) => toAbsoluteWebUrl(requestUrl, entry.template.imageUri))
        .find((value): value is string => value !== null) ?? null;

    return renderPageShell(
      pageTitle,
      `<style>
        .criteria-registry {
          display: grid;
          gap: 1rem;
          color: var(--ct-theme-text-title);
        }

        .criteria-registry__hero {
          border: 1px solid var(--ct-theme-border-default);
          border-radius: 1rem;
          padding: 1rem;
          background:
            radial-gradient(circle at 90% 8%, var(--ct-theme-accent-glow-1), transparent 42%),
            var(--ct-theme-gradient-hero);
          color: var(--ct-theme-text-on-brand);
          box-shadow: var(--ct-theme-shadow-card);
          display: grid;
          gap: 0.45rem;
        }

        .criteria-registry__hero h1 {
          margin: 0;
          color: var(--ct-theme-text-on-brand);
        }

        .criteria-registry__hero p {
          margin: 0;
        }

        .criteria-registry__hero-link {
          width: fit-content;
          color: var(--ct-theme-text-on-brand);
          font-weight: 700;
        }

        .criteria-registry__hero-link:hover,
        .criteria-registry__hero-link:focus-visible {
          color: var(--ct-theme-text-on-brand);
          text-decoration-color: var(--ct-brand-sun-400);
        }

        .criteria-registry__template-grid {
          display: grid;
          gap: 0.9rem;
        }

        .criteria-registry__template-card {
          border: 1px solid var(--ct-theme-border-default);
          border-radius: 0.95rem;
          padding: 0.9rem;
          background: linear-gradient(
            165deg,
            var(--ct-theme-surface-card-strong),
            var(--ct-theme-surface-soft)
          );
          box-shadow: var(--ct-theme-shadow-soft);
          display: grid;
          gap: 0.55rem;
        }

        .criteria-registry__template-header {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 0.66rem;
          align-items: center;
        }

        .criteria-registry__template-header h2 {
          margin: 0;
        }

        .criteria-registry__template-image {
          width: 3.25rem;
          height: 3.25rem;
          border-radius: 0.58rem;
          border: 1px solid var(--ct-theme-border-default);
          object-fit: cover;
          background: var(--ct-theme-surface-info);
        }

        .criteria-registry__template-image--placeholder {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--ct-theme-text-on-brand);
          font-weight: 700;
          font-size: 1.2rem;
          background:
            radial-gradient(circle at 82% 10%, var(--ct-theme-accent-glow-1), transparent 42%),
            var(--ct-theme-gradient-hero);
        }

        .criteria-registry__template-meta {
          display: grid;
          gap: 0.2rem;
        }

        .criteria-registry__description {
          margin: 0;
          color: var(--ct-theme-text-body);
          line-height: 1.45;
        }

        .criteria-registry__facts {
          margin: 0;
          padding: 0;
          display: grid;
          gap: 0.45rem;
          grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
        }

        .criteria-registry__fact {
          margin: 0;
          padding: 0.44rem 0.56rem;
          border: 1px solid var(--ct-theme-border-soft);
          border-radius: 0.62rem;
          background: var(--ct-theme-surface-info);
          display: grid;
          gap: 0.15rem;
        }

        .criteria-registry__fact dt {
          margin: 0;
          font-size: 0.74rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--ct-theme-text-subtle);
          font-weight: 700;
        }

        .criteria-registry__fact dd {
          margin: 0;
          color: var(--ct-theme-text-body);
          word-break: break-word;
        }

        .criteria-registry__muted {
          margin: 0;
          color: var(--ct-theme-text-muted);
          font-size: 0.9rem;
        }

        .criteria-registry__section {
          border-top: 1px solid var(--ct-theme-border-soft);
          padding-top: 0.6rem;
          display: grid;
          gap: 0.48rem;
        }

        .criteria-registry__section h3 {
          margin: 0;
          font-size: 1rem;
        }

        .criteria-registry__actions {
          margin: 0;
          display: inline-flex;
          width: fit-content;
        }

        .criteria-registry__actions a {
          font-weight: 700;
        }

        .criteria-registry__rule {
          border: 1px solid var(--ct-theme-border-soft);
          border-radius: 0.72rem;
          padding: 0.58rem;
          background: var(--ct-theme-surface-info);
          display: grid;
          gap: 0.5rem;
        }

        .criteria-registry__rule h3 {
          margin: 0;
          font-size: 0.98rem;
        }

        .criteria-registry__stack-sm {
          display: grid;
          gap: 0.36rem;
        }

        .criteria-registry__stack-sm p {
          margin: 0;
        }

        .criteria-registry__conditions,
        .criteria-registry__conditions ul,
        .criteria-registry__approval-steps,
        .criteria-registry__approval-events,
        .criteria-registry__timeline {
          margin: 0;
          padding-left: 1.2rem;
          display: grid;
          gap: 0.3rem;
        }

        .criteria-registry__approval-steps p,
        .criteria-registry__timeline p {
          margin: 0;
        }

        .criteria-registry__details {
          border: 1px solid var(--ct-theme-border-default);
          border-radius: 0.64rem;
          padding: 0.52rem 0.6rem;
          background: var(--ct-theme-surface-soft);
        }

        .criteria-registry__details summary {
          cursor: pointer;
          font-weight: 700;
          color: var(--ct-theme-text-body);
        }

        .criteria-registry__pre {
          margin: 0.55rem 0 0 0;
          padding: 0.55rem;
          border-radius: 0.58rem;
          border: 1px solid var(--ct-theme-border-default);
          background: var(--ct-theme-surface-info);
          color: var(--ct-theme-text-body);
          font-size: 0.8rem;
          overflow: auto;
          max-height: 14rem;
        }

        .criteria-registry__empty {
          margin: 0;
          color: var(--ct-theme-text-muted);
          border: 1px solid var(--ct-theme-border-default);
          border-radius: 0.82rem;
          padding: 0.75rem;
          background: var(--ct-theme-surface-shell);
        }

        @media (max-width: 640px) {
          .criteria-registry__template-header {
            grid-template-columns: 1fr;
            align-items: start;
          }
        }
      </style>
      <section class="criteria-registry">
        <header class="criteria-registry__hero">
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(subtitle)}</p>
          <a class="criteria-registry__hero-link" href="${escapeHtml(badgeWallPath)}">
            Back to badge wall
          </a>
        </header>
        <div class="criteria-registry__template-grid">
          ${templateCards}
        </div>
      </section>`,
      buildSeoHeadContent({
        title: pageTitle,
        description: subtitle,
        canonicalUrl,
        ogType: 'website',
        imageUrl: socialImageUrl,
      }),
    );
  };

  return {
    publicBadgeNotFoundPage,
    publicBadgePage,
    tenantBadgeWallPage,
    tenantBadgeCriteriaRegistryPage,
  };
};
