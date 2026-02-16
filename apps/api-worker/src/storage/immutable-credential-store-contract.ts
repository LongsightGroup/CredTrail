import {
  getImmutableCredentialObject,
  immutableCredentialObjectKey,
  storeImmutableCredentialObject,
  type ImmutableCredentialStore,
} from '@credtrail/core-domain';
import { expect, it } from 'vitest';

interface RunImmutableCredentialStoreContractInput {
  createStore: () => ImmutableCredentialStore;
}

export const runImmutableCredentialStoreContract = (
  input: RunImmutableCredentialStoreContractInput,
): void => {
  it('stores and loads immutable credential objects', async () => {
    const store = input.createStore();
    const ids = {
      tenantId: 'tenant-a',
      assertionId: 'tenant-a:assertion-001',
    };
    const stored = await storeImmutableCredentialObject(store, {
      ...ids,
      credential: {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
      },
    });

    expect(stored.key).toBe(immutableCredentialObjectKey(ids));
    await expect(store.head(stored.key)).resolves.toEqual({
      key: stored.key,
    });

    await expect(getImmutableCredentialObject(store, ids)).resolves.toEqual({
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
    });
  });

  it('returns null for missing objects', async () => {
    const store = input.createStore();

    await expect(
      getImmutableCredentialObject(store, {
        tenantId: 'tenant-missing',
        assertionId: 'tenant-missing:assertion-missing',
      }),
    ).resolves.toBeNull();
  });

  it('prevents immutable overwrite', async () => {
    const store = input.createStore();
    const payload = {
      tenantId: 'tenant-a',
      assertionId: 'tenant-a:assertion-001',
      credential: {
        id: 'urn:vc:1',
      },
    };

    await storeImmutableCredentialObject(store, payload);

    await expect(storeImmutableCredentialObject(store, payload)).rejects.toThrowError(
      'Immutable credential already exists',
    );
  });
};
