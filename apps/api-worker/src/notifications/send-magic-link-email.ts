export interface SendMagicLinkEmailNotificationInput {
  mailtrapApiToken?: string | undefined;
  mailtrapInboxId?: string | undefined;
  mailtrapApiBaseUrl?: string | undefined;
  mailtrapFromEmail?: string | undefined;
  mailtrapFromName?: string | undefined;
  recipientEmail: string;
  tenantId: string;
  magicLinkUrl: string;
  expiresAtIso: string;
}

export const sendMagicLinkEmailNotification = async (
  input: SendMagicLinkEmailNotificationInput,
): Promise<void> => {
  if (
    input.mailtrapApiToken === undefined ||
    input.mailtrapInboxId === undefined ||
    input.mailtrapApiToken.trim().length === 0 ||
    input.mailtrapInboxId.trim().length === 0
  ) {
    return;
  }

  const baseUrl = input.mailtrapApiBaseUrl ?? 'https://sandbox.api.mailtrap.io/api/send';
  const endpoint = `${baseUrl.replaceAll(/\/+$/g, '')}/${encodeURIComponent(input.mailtrapInboxId)}`;
  const subject = `Sign in to CredTrail (${input.tenantId})`;
  const textBody = [
    'Use the link below to sign in to CredTrail:',
    '',
    input.magicLinkUrl,
    '',
    `Tenant: ${input.tenantId}`,
    `Expires at: ${input.expiresAtIso}`,
  ].join('\n');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.mailtrapApiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: {
        email: input.mailtrapFromEmail ?? 'no-reply@credtrail.org',
        name: input.mailtrapFromName ?? 'CredTrail',
      },
      to: [
        {
          email: input.recipientEmail,
        },
      ],
      subject,
      text: textBody,
      category: 'Auth Magic Link',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Mailtrap API request failed: ${String(response.status)} ${response.statusText} ${errorBody}`,
    );
  }
};
