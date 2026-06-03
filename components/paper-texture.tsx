"use client";

/**
 * PaperTexture — crumpled-paper layer for the landing page.
 *
 * Positioned absolute inside <main>, anchored to the top, h-screen tall.
 * Because it's in-flow-adjacent (not position: fixed), it scrolls with
 * the page. As the user scrolls down, the texture scrolls up and
 * eventually leaves the viewport entirely.
 *
 * On top of the natural scroll-off, an opacity fade driven by scrollY
 * makes the texture lighter as the user reads further, so the bottom
 * sections feel cleaner.
 *
 * -z-10 with main's `isolate` puts this layer between main's bg color
 * and main's in-flow content. That keeps it behind the audit example
 * and every other section (a previous `position: fixed` version
 * actually painted in front of content because fixed elements create a
 * stacking context that comes after in-flow descendants in paint order).
 *
 * Rendered inside <main>, so the global <HeaderNav /> never has the
 * texture applied to it.
 *
 * Updates are throttled to one per animation frame via
 * requestAnimationFrame, and the scroll listener is passive to keep
 * scroll smooth on mobile.
 */

import { useEffect, useState } from "react";

const PEAK_OPACITY = 0.385; // 30% reduction from 0.55
const FADE_DISTANCE = 1500; // px; opacity hits 0 here

export function PaperTexture() {
  const [opacity, setOpacity] = useState(PEAK_OPACITY);

  useEffect(() => {
    let ticking = false;

    const update = () => {
      const scrolled = window.scrollY;
      const next = Math.max(
        0,
        PEAK_OPACITY * (1 - scrolled / FADE_DISTANCE)
      );
      setOpacity(next);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update(); // sync to current scroll position on mount

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-0 h-screen -z-10 pointer-events-none legible-paper mix-blend-multiply"
      style={{ opacity }}
    />
  );
}
