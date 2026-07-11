"use client";

/**
 * Top navigation — fixed, glassy, present on every route.
 *
 * Layout: wordmark on the left, primary links centered, and a live tournament
 * pill on the right so the bar reads balanced rather than lopsided.
 */

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  MessageSquare,
  Swords,
  History,
  Dna,
  Trophy,
  Menu,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SPRING } from "@/lib/motion";
import { NavWallet } from "@/components/auth/NavWallet";
import styles from "./Navbar.module.css";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/arena", label: "Arena", icon: Swords },
  { href: "/calls", label: "Calls", icon: History },
  { href: "/profile", label: "Profile", icon: Dna },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className={styles.nav}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="Shadow Pundit home">
          <Image
            src="/shadowpundit.png"
            alt=""
            width={28}
            height={28}
            className={styles.brandLogo}
            priority
          />
          <span className={styles.brandText}>
            Shadow<span className={styles.brandTextAccent}>Pundit</span>
          </span>
        </Link>

        <nav className={styles.links} aria-label="Primary">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.link} ${active ? styles.linkActive : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={16} strokeWidth={2} aria-hidden />
                <span>{label}</span>
                {active &&
                  (reduceMotion ? (
                    <span className={styles.indicator} />
                  ) : (
                    <motion.span
                      layoutId="navIndicator"
                      className={styles.indicator}
                      transition={SPRING.snappy}
                    />
                  ))}
              </Link>
            );
          })}
        </nav>

        <div className={styles.right}>
          <NavWallet />

          <button
            className={styles.menuBtn}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <nav
        className={`${styles.mobileMenu} ${mobileOpen ? styles.mobileOpen : ""}`}
        aria-label="Mobile"
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.mobileLink} ${isActive(href) ? styles.linkActive : ""}`}
            onClick={() => setMobileOpen(false)}
          >
            <Icon size={18} aria-hidden />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}
