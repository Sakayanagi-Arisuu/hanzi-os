import {
  CURRENT_CONTENT_CLOSED_ALPHA_ELIGIBLE,
} from "./currentContentIdentity";

/**
 * Client-side mirror of the server's local closed-alpha preview fence.
 * Production builds still use the checked-in promotion decision; only a Vite
 * development build may enter the answer-free practice surfaces.
 */
export const clientClosedAlphaAvailable = ({
  checkedInEligible,
  development,
}: {
  checkedInEligible: boolean;
  development: boolean;
}) => checkedInEligible || development;

export const CURRENT_CLIENT_CLOSED_ALPHA_AVAILABLE =
  clientClosedAlphaAvailable({
    checkedInEligible: CURRENT_CONTENT_CLOSED_ALPHA_ELIGIBLE,
    development: process.env.NODE_ENV === "development",
  });
