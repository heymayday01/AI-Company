"use client";

import { useReducedMotion } from "framer-motion";
import type { Transition, Variants } from "framer-motion";

/**
 * Reflex motion system — Apple-style spring physics, with reduced-motion
 * respect built in.
 *
 * Apple's animations use springs, not cubic-bezier eases. The three presets
 * here mirror iOS:
 *   - spring.snug    → cards, hovers, small UI (fast, slight overshoot)
 *   - spring.smooth  → page transitions, sheets (no overshoot, gentle)
 *   - spring.bouncy  → playful entrances (visible overshoot)
 */

export const spring = {
  snug: { type: "spring", stiffness: 500, damping: 38, mass: 0.8 } as Transition,
  smooth: { type: "spring", stiffness: 280, damping: 30, mass: 1 } as Transition,
  bouncy: { type: "spring", stiffness: 320, damping: 22, mass: 0.9 } as Transition,
  gentle: { type: "spring", stiffness: 180, damping: 26, mass: 1 } as Transition,
};

/** Fallback transition for reduced-motion users: instant, no movement. */
export const instant: Transition = { duration: 0 };

/** Hook: returns the right transition based on the user's motion preference. */
export function useSpring(pref: keyof typeof spring = "smooth") {
  const reduce = useReducedMotion();
  return reduce ? instant : spring[pref];
}

/** Hook: returns variants with entrance/exit, respecting reduced motion. */
export function useFadeUp(dist = 12): Variants {
  const reduce = useReducedMotion();
  if (reduce) {
    return {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: instant },
      exit: { opacity: 0, transition: instant },
    };
  }
  return {
    hidden: { opacity: 0, y: dist },
    show: {
      opacity: 1,
      y: 0,
      transition: spring.smooth,
    },
    exit: { opacity: 0, y: -dist * 0.6, transition: { duration: 0.2 } },
  };
}

/** Stagger container — children fade-up one after another. */
export function useStaggerContainer(stagger = 0.05, dist = 12): Variants {
  const reduce = useReducedMotion();
  if (reduce) {
    return {
      hidden: {},
      show: { transition: { staggerChildren: 0 } },
      exit: {},
    };
  }
  return {
    hidden: {},
    show: {
      transition: { staggerChildren: stagger, delayChildren: 0.04 },
    },
    exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
  };
}

export function useStaggerItem(dist = 12): Variants {
  const reduce = useReducedMotion();
  if (reduce) {
    return {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: instant },
      exit: { opacity: 0, transition: instant },
    };
  }
  return {
    hidden: { opacity: 0, y: dist, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: spring.snug },
    exit: { opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.18 } },
  };
}
