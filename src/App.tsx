import { useEffect, useState } from "react";
import { Navbar } from "./components/Navbar";
import { CustomCursor } from "./components/CustomCursor";
import { SectionDeck } from "./components/SectionDeck";
import { LandingSection } from "./sections/LandingSection";
import { PhilosophySection } from "./sections/PhilosophySection";
import { FauxSphereSection } from "./sections/FauxSphereSection";
import { FinaleSection } from "./sections/FinaleSection";
import { useSectionNavigation } from "./hooks/useSectionNavigation";
import { AdminPage } from "./pages/AdminPage";

/** Detect mobile synchronously so the correct layout is painted on first render. */
function getIsMobile() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

function App() {
  const isAdmin = window.location.pathname.startsWith("/admin");

  const [isMobile, setIsMobile] = useState(getIsMobile);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Desktop deck navigation — disabled on mobile and admin.
  const { index, direction, next } = useSectionNavigation({
    count: 4,
    enabled: !isAdmin && !isMobile,
  });

  // Custom cursor only on desktop sections 2–4.
  useEffect(() => {
    if (isAdmin || isMobile) return;
    document.documentElement.classList.toggle("custom-cursor", index !== 0);
  }, [index, isAdmin, isMobile]);

  if (isAdmin) {
    return <AdminPage />;
  }

  // ── Mobile: plain stacked vertical scroll ────────────────────────────────
  if (isMobile) {
    return (
      <>
        <Navbar />
        <div>
          {/* Each section fills at least the full viewport height */}
          <div className="min-h-screen">
            <LandingSection />
          </div>
          <div className="min-h-screen">
            <PhilosophySection />
          </div>
          <div className="min-h-screen">
            <FauxSphereSection />
          </div>
          <div className="min-h-screen">
            <FinaleSection />
          </div>
        </div>
      </>
    );
  }

  // ── Desktop: full-page snap deck ──────────────────────────────────────────
  return (
    <>
      <Navbar />
      <SectionDeck sections={[
        <LandingSection key="landing" />,
        <PhilosophySection key="philosophy" onNext={next} />,
        <FauxSphereSection key="s3" />,
        <FinaleSection key="s4" />,
      ]} index={index} direction={direction} />
      {index !== 0 && <CustomCursor mode={index === 1 ? "leaf" : "dot"} />}
    </>
  );
}

export default App;
