import { useEffect, useRef, useState } from "react";

export default function CricketScrollAnimation() {
  const ballRef = useRef(null);
  const trailRef = useRef(null);
  const stumpRef = useRef(null);
  const [hit, setHit] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const ball = ballRef.current;
    const trail = trailRef.current;
    if (!ball) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      const progress = Math.min(scrollY / maxScroll, 1);

      // Ball follows scroll progress from top (0) to stump (near 1)
      const startY = 60;
      const endY = window.innerHeight - 130;
      const ballY = startY + (endY - startY) * Math.min(progress * 1.1, 1);

      // Ball moves horizontally with a slight curve
      const ballX = Math.sin(progress * Math.PI * 2) * 30;

      // Ball rotation based on movement
      const rotation = progress * 720;

      ball.style.transform = `translate(${ballX}px, ${ballY}px) rotate(${rotation}deg)`;

      // Hide ball when near top (before scrolling starts)
      setVisible(scrollY > 50);

      // Trail effect
      if (trail && progress < 0.9) {
        const trailY = ballY - 15 - progress * 20;
        trail.style.transform = `translate(${ballX * 0.5}px, ${trailY}px)`;
        trail.style.opacity = Math.max(0, 0.3 - progress * 0.3);
      }

      // Hit stumps at ~90% scroll
      const shouldHit = progress > 0.85;
      if (shouldHit !== hit) {
        setHit(shouldHit);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [hit]);

  return (
    <>
      <div
        ref={trailRef}
        className="scroll-ball-trail"
        style={{ top: 0, opacity: 0 }}
      />
      <div
        ref={ballRef}
        className={`scroll-ball ${!visible ? "hidden" : ""}`}
        style={{ top: 0 }}
      />
      <div ref={stumpRef} className={`stumps-decoration ${hit ? "hit" : ""}`}>
        <div className="stump" />
        <div className="stump" />
        <div className="stump" />
        <div className="bails" />
      </div>
      <div className="pitch-strip" />
      <div className="crease-line" />
      <div className="crease-line" />
      <div className="crease-line" />
    </>
  );
}
