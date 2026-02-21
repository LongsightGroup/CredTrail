import type { JsonObject } from '@credtrail/core-domain';
import type { AssertionRecord, PublicBadgeWallEntryRecord } from '@credtrail/db';
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
  badgeHeroImageMarkup: (badgeName: string, imageUri: string | null) => string;
  badgeNameFromCredential: (credential: JsonObject) => string;
  evidenceDetailsFromCredential: (credential: JsonObject) => EvidenceDetails[];
  escapeHtml: (value: string) => string;
  formatIsoTimestamp: (timestampIso: string) => string;
  githubAvatarUrlForUsername: (username: string) => string;
  githubUsernameFromUrl: (value: string) => string | null;
  imsOb2ValidatorUrl: (targetUrl: string) => string;
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
  publicBadgeNotFoundPage: () => string;
  publicBadgePage: (requestUrl: string, model: VerificationViewModel) => string;
  tenantBadgeWallPage: (
    requestUrl: string,
    tenantId: string,
    entries: readonly PublicBadgeWallEntryRecord[],
    filterBadgeTemplateId: string | null,
  ) => string;
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
    imsOb2ValidatorUrl,
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
  const publicBadgeNotFoundPage = (): string => {
    return renderPageShell(
      'Badge not found',
      `<section style="display:grid;gap:1rem;max-width:42rem;">
        <article style="display:grid;gap:0.8rem;padding:1.25rem;border:1px solid rgba(0,39,76,0.18);border-radius:1rem;background:linear-gradient(155deg,rgba(255,255,255,0.96),rgba(248,252,255,0.93));box-shadow:0 16px 30px rgba(0,39,76,0.14);">
          <p style="margin:0;font-size:0.8rem;letter-spacing:0.11em;text-transform:uppercase;color:#0a4c8f;font-weight:700;">Public Badge Lookup</p>
          <h1 style="margin:0;">Badge not found</h1>
          <p style="margin:0;color:#395877;">The shared badge URL is invalid or the credential does not exist.</p>
        </article>
      </section>`,
    );
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
    const achievementImage = badgeHeroImageMarkup(badgeName, achievementDetails.imageUri);
    const credentialUri = asString(model.credential.id) ?? model.assertion.id;
    const isRevoked = model.assertion.revokedAt !== null;
    const verificationLabel = isRevoked ? 'Revoked' : 'Verified';
    const publicBadgePath = publicBadgePathForAssertion(model.assertion);
    const publicBadgeUrl = new URL(publicBadgePath, requestUrl).toString();
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
    const assertionValidationTargetUrl = ob3JsonUrl;
    const badgeClassValidationTargetUrl =
      achievementDetails.badgeClassUri !== null && isWebUrl(achievementDetails.badgeClassUri)
        ? achievementDetails.badgeClassUri
        : null;
    const issuerValidationTargetUrlFromIdentifier =
      issuerIdentifier !== null && isWebUrl(issuerIdentifier) ? issuerIdentifier : null;
    const issuerValidationTargetUrl = issuerUrl ?? issuerValidationTargetUrlFromIdentifier;
    const assertionValidatorUrl = imsOb2ValidatorUrl(assertionValidationTargetUrl);
    const badgeClassValidatorUrl =
      badgeClassValidationTargetUrl === null ? null : imsOb2ValidatorUrl(badgeClassValidationTargetUrl);
    const issuerValidatorUrl =
      issuerValidationTargetUrl === null ? null : imsOb2ValidatorUrl(issuerValidationTargetUrl);
    const validatorLinks = [
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
    const badgeClassValidationTechnicalDetail =
      badgeClassValidatorUrl === null
        ? '<span>Not available (badge class URI is not a web URL).</span>'
        : `<a href="${escapeHtml(badgeClassValidatorUrl)}">${escapeHtml(badgeClassValidatorUrl)}</a>`;
    const issuerValidationTechnicalDetail =
      issuerValidatorUrl === null
        ? '<span>Not available (issuer URL is not published).</span>'
        : `<a href="${escapeHtml(issuerValidatorUrl)}">${escapeHtml(issuerValidatorUrl)}</a>`;
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
    const revokedDetails =
      model.assertion.revokedAt === null
        ? ''
        : `<p class="public-badge__status-note">Revoked at ${escapeHtml(
            formatIsoTimestamp(model.assertion.revokedAt),
          )} UTC</p>`;
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
      `${badgeName} | CredTrail`,
      `<style>
        :root {
          --pb-blue: #00274c;
          --pb-blue-mid: #0a4c8f;
          --pb-maize: #ffcb05;
          --pb-ink: #122c46;
          --pb-ink-soft: #3a5879;
        }

        .public-badge {
          display: grid;
          gap: 1rem;
          color: var(--pb-ink);
        }
  
        .public-badge__card {
          position: relative;
          overflow: hidden;
          background: linear-gradient(165deg, rgba(255, 255, 255, 0.94), rgba(248, 252, 255, 0.9));
          border: 1px solid rgba(0, 39, 76, 0.12);
          border-radius: 1rem;
          box-shadow: 0 18px 34px rgba(0, 26, 51, 0.11);
          padding: 1.25rem;
          animation: public-badge-enter 420ms ease-out both;
        }

        .public-badge__card::after {
          content: '';
          position: absolute;
          inset: auto -16% -70% auto;
          width: 14rem;
          height: 14rem;
          background: radial-gradient(circle, rgba(255, 203, 5, 0.12), transparent 70%);
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
          color: #f6fbff;
          font-weight: 700;
          letter-spacing: 0.015em;
        }
  
        .public-badge__status--verified {
          background: linear-gradient(120deg, #0f7f4f 0%, #005b4f 64%, #003d5c 100%);
        }
  
        .public-badge__status--revoked {
          background: linear-gradient(120deg, #bd2f1b 0%, #8f1c13 64%, #5b1212 100%);
        }
  
        .public-badge__status-note {
          margin: 0;
          color: #8e1f14;
          font-size: 0.95rem;
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
          border: 1px solid rgba(0, 39, 76, 0.14);
          box-shadow: 0 16px 30px rgba(0, 39, 76, 0.19);
          pointer-events: none;
        }
  
        .public-badge__hero-image {
          display: block;
          width: 100%;
          border-radius: 1rem;
          aspect-ratio: 21 / 16;
          object-fit: cover;
          background: #f4f9ff;
        }

        .public-badge__hero-image-fallback {
          position: absolute;
          inset: 0;
          display: none;
          align-items: center;
          justify-content: center;
          border-radius: 1rem;
          background:
            radial-gradient(circle at 88% 12%, rgba(255, 203, 5, 0.24), transparent 45%),
            linear-gradient(130deg, #0c3f6f, #0a4c8f 55%, #0f6fb0);
          color: #f6fbff;
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
          color: var(--pb-blue-mid);
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
          color: var(--pb-ink-soft);
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
          border: 2px solid rgba(0, 39, 76, 0.12);
          object-fit: cover;
          background: #f8fcff;
        }
  
        .public-badge__section-title {
          margin: 0;
          font-size: 1.12rem;
        }
  
        .public-badge__achievement-copy {
          margin: 0;
          color: var(--pb-ink-soft);
        }
  
        .public-badge__action-group {
          display: grid;
          gap: 0.5rem;
        }

        .public-badge__action-label {
          margin: 0;
          font-size: 0.84rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #426388;
          font-weight: 700;
        }

        .public-badge__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          align-items: center;
        }

        .public-badge__actions--primary .public-badge__button {
          font-weight: 700;
        }

        .public-badge__actions--secondary {
          margin-top: 0.55rem;
        }

        .public-badge__button {
          border: 1px solid rgba(0, 39, 76, 0.25);
          border-radius: 0.75rem;
          padding: 0.48rem 0.86rem;
          text-decoration: none;
          font-weight: 600;
          color: var(--pb-blue);
          background: linear-gradient(180deg, #ffffff, #f1f8ff);
          cursor: pointer;
          transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
        }

        .public-badge__button:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 14px rgba(0, 39, 76, 0.15);
          border-color: rgba(0, 39, 76, 0.4);
        }
  
        .public-badge__button--primary {
          border-color: transparent;
          background: linear-gradient(115deg, var(--pb-blue) 0%, #0b5aa9 76%);
          color: #f8fbff;
        }

        .public-badge__button--wallet {
          box-shadow: 0 10px 18px rgba(0, 39, 76, 0.24);
        }
  
        .public-badge__button--accent {
          border-color: rgba(194, 139, 0, 0.48);
          background: linear-gradient(180deg, #fff7cf, #ffe37d);
          color: #533a00;
        }
  
        .public-badge__copy-status {
          margin: 0;
          color: var(--pb-ink-soft);
          font-size: 0.92rem;
        }

        .public-badge__actions-details {
          border: 1px dashed rgba(0, 39, 76, 0.18);
          border-radius: 0.8rem;
          padding: 0.62rem 0.7rem;
          background: rgba(241, 248, 255, 0.7);
        }

        .public-badge__actions-details summary {
          cursor: pointer;
          font-weight: 700;
          color: #123a60;
        }
  
        .public-badge__validator-links {
          margin-top: 0.6rem;
          display: grid;
          gap: 0.55rem;
        }
  
        .public-badge__validator-note {
          margin: 0;
          color: #516c8e;
          font-size: 0.92rem;
        }
  
        .public-badge__qr {
          margin: 0;
          display: grid;
          justify-items: start;
          gap: 0.45rem;
        }
  
        .public-badge__qr-image {
          width: 13rem;
          height: 13rem;
          border-radius: 0.9rem;
          border: 1px solid rgba(0, 39, 76, 0.16);
          background: #ffffff;
        }
  
        .public-badge__qr-caption {
          color: #516c8e;
          font-size: 0.9rem;
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
          color: #445f82;
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
          color: #0f3156;
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

        @media (max-width: 759px) {
          .public-badge__status {
            flex-direction: column;
            align-items: flex-start;
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
          isRevoked ? 'revoked' : 'verified'
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
            ${revokedDetails}
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
        </section>
  
        ${evidenceSection}
  
        <section class="public-badge__card public-badge__stack-sm">
          <h2 class="public-badge__section-title">Share and verify</h2>
          <div class="public-badge__action-group">
            <p class="public-badge__action-label">Primary actions</p>
            <div class="public-badge__actions public-badge__actions--primary">
              <a
                class="public-badge__button public-badge__button--primary public-badge__button--wallet"
                href="${escapeHtml(walletDeepLinkUrl.toString())}"
              >
                Open in Wallet App
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
              <a class="public-badge__button" href="${escapeHtml(credentialDownloadPath)}">Download .jsonld VC</a>
              <a class="public-badge__button" href="${escapeHtml(credentialPdfDownloadPath)}">Download PDF</a>
              <a class="public-badge__button" href="${escapeHtml(walletOfferPath)}">OpenID4VCI Offer</a>
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
            </div>
          </details>
          <p id="copy-badge-url-status" class="public-badge__copy-status" aria-live="polite"></p>
          <details class="public-badge__actions-details">
            <summary>Validate with IMS tools</summary>
            <div class="public-badge__validator-links">${validatorLinks}</div>
            <p class="public-badge__validator-note">
              IMS validator expects JSON/image targets. Validate using the Open Badges 3.0 JSON URL, not this HTML page URL.
            </p>
          </details>
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
            <dt>Open Badges 3.0 JSON</dt>
            <dd><a href="${escapeHtml(ob3JsonPath)}">${escapeHtml(ob3JsonUrl)}</a></dd>
            <dt>Credential download</dt>
            <dd><a href="${escapeHtml(credentialDownloadPath)}">${escapeHtml(credentialDownloadUrl)}</a></dd>
            <dt>OpenID4VCI offer</dt>
            <dd><a href="${escapeHtml(walletOfferPath)}">${escapeHtml(walletOfferUrl)}</a></dd>
            <dt>Credential PDF download</dt>
            <dd><a href="${escapeHtml(credentialPdfDownloadPath)}">${escapeHtml(credentialPdfDownloadUrl)}</a></dd>
            <dt>IMS assertion validation</dt>
            <dd><a href="${escapeHtml(assertionValidatorUrl)}">${escapeHtml(assertionValidatorUrl)}</a></dd>
            <dt>IMS badge class validation</dt>
            <dd>${badgeClassValidationTechnicalDetail}</dd>
            <dt>IMS issuer validation</dt>
            <dd>${issuerValidationTechnicalDetail}</dd>
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
          })();
        </script>
      </article>`,
      `<link rel="canonical" href="${escapeHtml(publicBadgeUrl)}" />
      <link rel="alternate" type="application/ld+json" href="${escapeHtml(ob3JsonPath)}" />`,
    );
  };

  const tenantBadgeWallPage = (
    requestUrl: string,
    tenantId: string,
    entries: readonly PublicBadgeWallEntryRecord[],
    filterBadgeTemplateId: string | null,
  ): string => {
    const title =
      filterBadgeTemplateId === null ? `Badge Wall · ${tenantId}` : `Badge Wall · ${tenantId}`;
    const subtitle =
      filterBadgeTemplateId === null
        ? `Public badge URLs issued under tenant "${tenantId}".`
        : `Public badge URLs issued under tenant "${tenantId}" for badge template "${filterBadgeTemplateId}".`;
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
              const statusLabel = entry.revokedAt === null ? 'Verified' : 'Revoked';
              const revokedLine =
                entry.revokedAt === null
                  ? ''
                  : `<p class="badge-wall__meta">Revoked ${escapeHtml(
                      formatIsoTimestamp(entry.revokedAt),
                    )} UTC</p>`;
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
                      <p class="badge-wall__meta">${escapeHtml(statusLabel)} · Issued ${escapeHtml(issuedAt)}</p>
                      ${revokedLine}
                    </div>
                  </div>
                </div>
                <div class="badge-wall__actions">
                  <a class="badge-wall__button badge-wall__button--primary" href="${escapeHtml(badgePath)}">View badge</a>
                  <button class="badge-wall__button" type="button" data-copy-value="${escapeHtml(
                    badgeUrl,
                  )}">Copy link</button>
                </div>
                <p class="badge-wall__url" title="${escapeHtml(badgeUrl)}">${escapeHtml(badgeUrl)}</p>
                <p class="badge-wall__copy-status" aria-live="polite"></p>
              </li>`;
            })
            .join('');
    const listMarkup =
      entries.length === 0
        ? '<p class="badge-wall__empty">No public badges found for this showcase.</p>'
        : `<ol class="badge-wall__list">${cards}</ol>`;
  
    return renderPageShell(
      `${title} | CredTrail`,
      `<style>
        .badge-wall {
          display: grid;
          gap: 1rem;
          color: #0f2848;
        }

        .badge-wall__hero {
          border: 1px solid rgba(0, 39, 76, 0.16);
          border-radius: 1rem;
          padding: 1rem;
          background:
            radial-gradient(circle at 88% 8%, rgba(255, 203, 5, 0.24), transparent 42%),
            linear-gradient(140deg, rgba(0, 39, 76, 0.95) 0%, rgba(12, 83, 158, 0.9) 100%);
          color: #f6fbff;
          box-shadow: 0 22px 32px rgba(0, 39, 76, 0.2);
        }

        .badge-wall__hero h1 {
          color: #f6fbff;
        }
  
        .badge-wall__lead {
          margin: 0;
          color: rgba(246, 251, 255, 0.88);
        }
  
        .badge-wall__count {
          margin: 0;
          font-weight: 600;
          color: #fdf2b1;
        }
  
        .badge-wall__list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 0.75rem;
        }
  
        .badge-wall__item {
          border: 1px solid rgba(0, 39, 76, 0.14);
          border-radius: 0.9rem;
          background: linear-gradient(165deg, rgba(255, 255, 255, 0.96), rgba(247, 251, 255, 0.93));
          box-shadow: 0 12px 24px rgba(0, 39, 76, 0.12);
          padding: 0.9rem;
          display: grid;
          gap: 0.65rem;
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
          gap: 0.8rem;
          grid-template-columns: auto 1fr;
          align-items: center;
        }

        .badge-wall__badge-image {
          width: 3.4rem;
          height: 3.4rem;
          border-radius: 0.6rem;
          border: 1px solid rgba(0, 39, 76, 0.18);
          object-fit: cover;
          background: #f4f9ff;
        }

        .badge-wall__badge-image--placeholder {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #f6fbff;
          font-weight: 700;
          font-size: 1.3rem;
          text-transform: uppercase;
          background:
            radial-gradient(circle at 82% 10%, rgba(255, 203, 5, 0.24), transparent 42%),
            linear-gradient(130deg, #0c3f6f, #0a4c8f 55%, #0f6fb0);
        }
  
        .badge-wall__avatar {
          width: 2.7rem;
          height: 2.7rem;
          border-radius: 999px;
          border: 2px solid rgba(0, 39, 76, 0.14);
          object-fit: cover;
          background: #f4f9ff;
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
          color: #325374;
        }
  
        .badge-wall__meta {
          margin: 0;
          color: #496a8e;
          font-size: 0.92rem;
        }
  
        .badge-wall__url {
          margin: 0;
          font-size: 0.83rem;
          color: #4e6f92;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          overflow-wrap: anywhere;
        }

        .badge-wall__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .badge-wall__button {
          border: 1px solid rgba(0, 39, 76, 0.22);
          border-radius: 0.66rem;
          padding: 0.42rem 0.74rem;
          font-size: 0.84rem;
          font-weight: 700;
          color: #0a3a65;
          background: linear-gradient(180deg, #ffffff, #eef5ff);
          cursor: pointer;
          text-decoration: none;
        }

        .badge-wall__button--primary {
          border-color: transparent;
          color: #f8fbff;
          background: linear-gradient(115deg, #00274c 0%, #0a4c8f 78%);
        }

        .badge-wall__copy-status {
          margin: 0;
          font-size: 0.82rem;
          color: #4e6f92;
        }
  
        .badge-wall__empty {
          margin: 0;
          color: #496a8e;
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
    );
  };

  return {
    publicBadgeNotFoundPage,
    publicBadgePage,
    tenantBadgeWallPage,
  };
};
