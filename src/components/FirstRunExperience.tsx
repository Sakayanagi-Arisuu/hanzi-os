import { useEffect, useState } from "react";
import { PublicLanding } from "./PublicLanding";
import { SystemOnboarding } from "./SystemOnboarding";

const ONBOARDING_PATH = "/onboarding";
const ONBOARDING_QUERY = "setup";

const isOnboardingPath = () => {
  if (typeof window === "undefined") return false;
  return window.location.pathname === ONBOARDING_PATH
    || new URLSearchParams(window.location.search).get(ONBOARDING_QUERY) === "1";
};

export function FirstRunExperience({ authenticated = false }: { authenticated?: boolean }) {
  const [showOnboarding, setShowOnboarding] = useState(() => authenticated || isOnboardingPath());

  useEffect(() => {
    // A signed-in learner with no learning profile starts setup directly.
    // Authentication is not completion of onboarding; keep the real setup flow.
    if (authenticated) setShowOnboarding(true);
  }, [authenticated]);

  useEffect(() => {
    const handlePopState = () => setShowOnboarding(isOnboardingPath());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (pathname: string, replace = false) => {
    if (replace) window.history.replaceState({}, "", pathname);
    else window.history.pushState({}, "", pathname);
    setShowOnboarding(isOnboardingPath());
  };

  if (showOnboarding) {
    return (
      <SystemOnboarding
        onComplete={() => navigate("/assessment", true)}
        onExit={() => navigate("/")}
      />
    );
  }

  return <PublicLanding onStart={() => navigate(ONBOARDING_PATH)} />;
}
