/**
 * GSAP + ScrollTrigger singleton registration.
 *
 * Importing this module registers the ScrollTrigger plugin once (and the
 * useGSAP hook, per @gsap/react guidance, so it isn't tree-shaken). Client
 * components import { gsap, ScrollTrigger, useGSAP } from here rather than
 * registering plugins themselves.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export { gsap, ScrollTrigger, useGSAP };
