import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sha256Base64Url } from '../auth/authCrypto';
import type { AuthRepository } from './authRepository';
import { finishNativeGoogle, startNativeGoogle } from './nativeGoogleAuth';

const mocks = { createChallenge: vi.fn(), verifyChallenge: vi.fn(), consumeChallenge: vi.fn(),
  resolveOrCreateIdentity: vi.fn(), createSession: vi.fn() };
const repository = mocks as unknown as AuthRepository;
const verifier = 'v'.repeat(64);
const proof = { challenge: 'c'.repeat(43), verifier, idToken: 'signed.provider.proof' };
const verify = vi.fn();
beforeEach(async () => {
  vi.resetAllMocks();
  mocks.createChallenge.mockResolvedValue(proof.challenge);
  mocks.verifyChallenge.mockResolvedValue({ payload: { mobilePhase: 'native-google', nonce: 'n'.repeat(43), codeChallenge: await sha256Base64Url(verifier) } });
  verify.mockResolvedValue({ providerSubject: 'immutable-google-sub', email: 'test@example.invalid', emailVerified: true, displayName: 'Test' });
  mocks.resolveOrCreateIdentity.mockResolvedValue({ userId: 'owner', identityId: 'identity' });
  mocks.createSession.mockResolvedValue({ token: 'private-session' });
});
describe('native Google device-bound authentication', () => {
  it('creates a separate expiring ceremony with a random nonce', async () => {
    const result = await startNativeGoogle(repository, await sha256Base64Url(verifier));
    expect(result.nonce).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(mocks.createChallenge).toHaveBeenCalledWith(expect.objectContaining({ ttlMs: 300000,
      payload: expect.objectContaining({ mobilePhase: 'native-google', nonce: result.nonce }) }));
    await expect(startNativeGoogle(repository, 'plain')).rejects.toThrow();
  });
  it('does not accept a stolen challenge from another device', async () => {
    await expect(finishNativeGoogle(repository, 'client', { ...proof, verifier: 'x'.repeat(64) }, verify)).rejects.toThrow();
    expect(verify).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
  it('rejects browser/mobile redirect ceremonies', async () => {
    mocks.verifyChallenge.mockResolvedValue({ payload: { mobilePhase: 'exchange' } });
    await expect(finishNativeGoogle(repository, 'client', proof, verify)).rejects.toThrow();
    expect(verify).not.toHaveBeenCalled();
  });
  it('requires signed identity proof before consuming or creating an account', async () => {
    verify.mockRejectedValue(new Error('Bad signature'));
    await expect(finishNativeGoogle(repository, 'client', proof, verify)).rejects.toThrow();
    expect(mocks.consumeChallenge).not.toHaveBeenCalled();
    expect(mocks.resolveOrCreateIdentity).not.toHaveBeenCalled();
  });
  it('requires atomic consumption before minting a normal Google session', async () => {
    mocks.consumeChallenge.mockRejectedValueOnce(new Error('Already consumed'));
    await expect(finishNativeGoogle(repository, 'client', proof, verify)).rejects.toThrow();
    expect(mocks.createSession).not.toHaveBeenCalled();
    await finishNativeGoogle(repository, 'client', proof, verify);
    expect(verify).toHaveBeenLastCalledWith({ idToken: proof.idToken, clientId: 'client', nonce: 'n'.repeat(43) });
    expect(mocks.createSession).toHaveBeenCalledWith({ userId: 'owner', identityId: 'identity', authMethod: 'google', deviceLabel: 'HANZI.OS Android' });
  });
});
