import {
  CURRENT_CONTENT_CLOSED_ALPHA_ELIGIBLE,
  CURRENT_CONTENT_MANIFEST_SHA256,
} from "./currentContentIdentity";

/**
 * Client-side mirror of the server's local closed-alpha preview fence.
 * Production builds still use the checked-in promotion decision; only a Vite
 * development build or an explicitly built loopback preview may enter them.
 */
export const clientClosedAlphaAvailable = ({
  checkedInEligible,
  development,
  localOfflinePreview = false,
  hostname,
}: {
  checkedInEligible: boolean;
  development: boolean;
  localOfflinePreview?: boolean;
  hostname?: string;
}) => checkedInEligible || development || (localOfflinePreview && ['localhost', '127.0.0.1'].includes(hostname ?? ''));

declare const __HANZI_LOCAL_OFFLINE_PREVIEW__: boolean;
declare const __HANZI_HOSTED_STUDY__: { origin: string; manifestSha256: string } | null;
declare const __HANZI_PACKAGED_STUDY__: { manifestSha256: string } | null;

export const PACKAGED_PERSONAL_STUDY = typeof __HANZI_PACKAGED_STUDY__ !== 'undefined'
  && __HANZI_PACKAGED_STUDY__ !== null
  && __HANZI_PACKAGED_STUDY__.manifestSha256 === CURRENT_CONTENT_MANIFEST_SHA256;

export const HOSTED_PERSONAL_STUDY = typeof __HANZI_HOSTED_STUDY__ !== 'undefined'
  && __HANZI_HOSTED_STUDY__ !== null
  && __HANZI_HOSTED_STUDY__.manifestSha256 === CURRENT_CONTENT_MANIFEST_SHA256
  && (typeof location === 'undefined' || location.origin === __HANZI_HOSTED_STUDY__.origin);

export const CURRENT_CLIENT_CLOSED_ALPHA_AVAILABLE = HOSTED_PERSONAL_STUDY || PACKAGED_PERSONAL_STUDY ||
  clientClosedAlphaAvailable({
    checkedInEligible: CURRENT_CONTENT_CLOSED_ALPHA_ELIGIBLE,
    development: process.env.NODE_ENV === "development",
    localOfflinePreview: typeof __HANZI_LOCAL_OFFLINE_PREVIEW__ !== 'undefined' && __HANZI_LOCAL_OFFLINE_PREVIEW__,
    hostname: typeof location === 'undefined' ? undefined : location.hostname,
  });
