import { expect, test } from '@playwright/test';

const adminToken = process.env.E2E_BOOTSTRAP_ADMIN_TOKEN ?? 'ci-bootstrap-token';

test('bootstrap admin can create and delete LTI issuer registration', async ({ page, request }) => {
  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const issuer = `https://issuer-${uniqueSuffix}.example`;
  const tenantId = `tenant-e2e-${uniqueSuffix}`;
  const tenantSlug = `tenant-e2e-${uniqueSuffix}`;
  const clientId = `client-${uniqueSuffix}`;
  const authorizationEndpoint = `https://issuer-${uniqueSuffix}.example/oauth2/authorize`;
  const tenantResponse = await request.put(`/v1/admin/tenants/${encodeURIComponent(tenantId)}`, {
    headers: {
      authorization: `Bearer ${adminToken}`,
    },
    data: {
      slug: tenantSlug,
      displayName: `E2E Tenant ${uniqueSuffix}`,
      planTier: 'team',
      isActive: true,
    },
  });
  expect(tenantResponse.status()).toBe(201);

  await page.goto(`/admin/lti/issuer-registrations?token=${encodeURIComponent(adminToken)}`);
  await expect(
    page.getByRole('heading', { name: 'Manual LTI issuer registration configuration' }),
  ).toBeVisible();

  await page.getByLabel('Issuer URL').fill(issuer);
  await page.getByLabel('Tenant ID').fill(tenantId);
  await page.getByLabel('Client ID').fill(clientId);
  await page.getByLabel('Authorization endpoint').fill(authorizationEndpoint);
  await page.getByLabel('Allow unsigned id_token (test-mode only)').check();
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes('/admin/lti/issuer-registrations') && response.status() === 200,
    ),
    page.getByRole('button', { name: 'Save registration' }).click(),
  ]);

  const createdRow = page.locator('tr', { hasText: issuer });
  await expect(createdRow).toContainText(tenantId, { timeout: 15_000 });
  await expect(createdRow).toContainText(clientId);
  await expect(createdRow).toContainText('true');

  await createdRow.getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('tr', { hasText: issuer })).toHaveCount(0);
});
