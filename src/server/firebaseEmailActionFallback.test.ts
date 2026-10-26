import { describe, expect, it } from 'vitest';
import { firebaseEmailActionFallback } from './firebaseEmailActionFallback';
const config = {FIREBASE_PROJECT_ID:'hanzi-fixture',FIREBASE_WEB_API_KEY:'FixtureTrusted_Key_2026'};
const code = 'CaseSensitive_Recovery_Code_2026';
const request = (mode='recoverEmail') => new Request(`https://hanzi.test/auth/hanzi/action?mode=${mode}&oobCode=${code}&apiKey=untrusted&continueUrl=https://evil.invalid`);
describe('project-wide Firebase email action fallback', () => {
  it.each(['recoverEmail','verifyAndChangeEmail','revertSecondFactorAddition'])('preserves provider flow %s at the configured Google project only', mode => {
    const response = firebaseEmailActionFallback(request(mode),config)!;
    const target = new URL(response.headers.get('location')!);
    expect(response.status).toBe(303); expect(target.origin).toBe('https://hanzi-fixture.firebaseapp.com');
    expect(target.searchParams.get('oobCode')).toBe(code); expect(target.searchParams.get('mode')).toBe(mode);
    expect(target.searchParams.get('apiKey')).toBe(config.FIREBASE_WEB_API_KEY); expect(target.searchParams.has('continueUrl')).toBe(false);
    expect(response.headers.get('cache-control')).toContain('no-store'); expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.has('set-cookie')).toBe(false);
  });
  it.each(['resetPassword','verifyEmail','signIn','evil'])('leaves mode %s to the HANZI action renderer', mode => {
    expect(firebaseEmailActionFallback(request(mode),config)).toBeNull();
  });
  it('refuses duplicate/malformed credentials, non-page requests and unconfigured destinations', () => {
    for (const url of [`${request().url}&oobCode=Another_valid_action_code`,`${request().url}&mode=recoverEmail`,'https://hanzi.test/auth/hanzi/action?mode=recoverEmail&oobCode=short','https://hanzi.test/auth/google/callback?mode=recoverEmail&oobCode='+code]) {
      expect(firebaseEmailActionFallback(new Request(url),config)).toBeNull();
    }
    expect(firebaseEmailActionFallback(new Request(request().url,{method:'POST'}),config)).toBeNull();
    const response = firebaseEmailActionFallback(request(),{...config,FIREBASE_PROJECT_ID:'evil.invalid/path'})!;
    expect(response.status).toBe(503); expect(response.headers.has('location')).toBe(false);
  });
});
