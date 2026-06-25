import { useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { CustomCursor } from "./components/CustomCursor";
import { SectionDeck } from "./components/SectionDeck";
import { LandingSection } from "./sections/LandingSection";
import { PhilosophySection } from "./sections/PhilosophySection";
import { FauxSphereSection } from "./sections/FauxSphereSection";
import { FinaleSection } from "./sections/FinaleSection";
import { useSectionNavigation } from "./hooks/useSectionNavigation";
import { AdminPage } from "./pages/AdminPage";

function App() {
  // Route /admin to the admin dashboard; everything else is the main site.
  const isAdmin = window.location.pathname.startsWith("/admin");

  const { index, direction, next } = useSectionNavigation({
    count: 4,
    enabled: !isAdmin,
  });

  // Section 1 (Landing, index 0) uses the normal cursor.
  useEffect(() => {
    if (isAdmin) return;
    document.documentElement.classList.toggle("custom-cursor", index !== 0);
  }, [index, isAdmin]);

  if (isAdmin) {
    return <AdminPage />;
  }

  const sections = [
    <LandingSection key="landing" />,
    // PhilosophySection handles its own touch isolation on mobile: it stops
    // touch event propagation at the scroll container so the deck's window
    // listeners never see swipes while the user is scrolling the section.
    // When the user reaches the bottom, it calls onNext() directly.
    <PhilosophySection key="philosophy" onNext={next} />,
    <FauxSphereSection key="s3" />,
    <FinaleSection key="s4" />,
  ];

  return (
    <>
      {/* Navbar floats above every section. */}
      <Navbar />
      <SectionDeck sections={sections} index={index} direction={direction} />
      {/* No custom cursor on Section 1 (native cursor shows there). Leaf cursor
          while the philosophy section (index 1) is active; dot elsewhere. */}
      {index !== 0 && <CustomCursor mode={index === 1 ? "leaf" : "dot"} />}
    </>
  );
}

export default App;
