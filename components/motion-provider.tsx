"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Energy Atlas motion defaults.
 *
 * - reducedMotion="user" honors the OS-level prefers-reduced-motion,
 *   collapsing every Framer animation to a no-op when the user has
 *   asked for less motion.
 * - transition default: Linear's cubic-bezier with 0.4s, applied to
 *   any motion that doesn't override it.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </MotionConfig>
  );
}
