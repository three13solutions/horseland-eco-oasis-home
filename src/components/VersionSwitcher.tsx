import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeftRight } from "lucide-react";

/**
 * Fixed bottom-left switcher between Version 1 (CMS-backed) and Version 2
 * (static frontend) of the website. Purely client-side routing — no CMS,
 * no backend calls, and no interference with booking/STAAH integrations.
 */

// V1 paths that have no separate V2 equivalent (shared native flows or admin).
const V1_ONLY_PREFIXES = ["/booking", "/search-availability", "/admin"];

const VersionSwitcher = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isV2 = location.pathname === "/v2" || location.pathname.startsWith("/v2/");

  const handleSwitch = () => {
    if (isV2) {
      // Strip the /v2 prefix to land on the equivalent V1 page.
      const v1Path = location.pathname.replace(/^\/v2/, "") || "/";
      navigate(v1Path + location.search);
      return;
    }

    // V1 -> V2: preserve the equivalent page where one exists.
    const hasV2Equivalent = !V1_ONLY_PREFIXES.some(
      (prefix) => location.pathname === prefix || location.pathname.startsWith(prefix + "/")
    );
    const target = hasV2Equivalent
      ? (location.pathname === "/" ? "/v2" : `/v2${location.pathname}`)
      : "/v2";
    navigate(target + (hasV2Equivalent ? location.search : ""));
  };

  return (
    <button
      type="button"
      onClick={handleSwitch}
      aria-label={isV2 ? "Switch to website version 1" : "Switch to website version 2"}
      className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <ArrowLeftRight className="h-3.5 w-3.5" />
      <span>{isV2 ? "Switch to V1" : "Switch to V2"}</span>
      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
        {isV2 ? "V2" : "V1"}
      </span>
    </button>
  );
};

export default VersionSwitcher;
