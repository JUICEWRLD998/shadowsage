import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Eye,
  Ghost,
  Swords,
  Database,
} from "lucide-react";
import { HeroBackground } from "@/components/landing/HeroBackground";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { GlitchText } from "@/components/ui/GlitchText";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import styles from "./page.module.css";

const FEATURES = [
  {
    icon: Brain,
    title: "It learns how you think",
    body: "Every pick, score, and gut-feel reason is mined locally by QVAC for the cognitive biases steering your calls — recency, star-player worship, hometown loyalty — entirely on your device.",
  },
  {
    icon: Ghost,
    title: "Then it spawns your Shadow",
    body: "Once it knows you well enough, an adversarial twin awakens — built entirely from your blind spots. It starts arguing against everything you pick, quoting your own past reasoning back at you.",
  },
  {
    icon: Swords,
    title: "You vs You, every match",
    body: "Your prediction on one side, the Shadow's counter on the other. One of you is right. The Arena settles the score when results come in — and your Shadow never forgets a win.",
  },
  {
    icon: Database,
    title: "Private, wallet-scoped memory",
    body: "Your prediction history and bias profile live in local memory, tied to your wallet. QVAC recalls your reasoning patterns without ever sending data to the cloud.",
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Make your calls",
    body: "Chat naturally about upcoming fixtures. Who wins, the score, and — crucially — why. QVAC extracts the prediction and stores it locally against your wallet.",
  },
  {
    n: "02",
    title: "Back them with USDt",
    body: "Confident in a call? Commit 1, 5, or 10 USDt as a signed stake. Your wallet signs the commitment — no cloud required, no third-party custody.",
  },
  {
    n: "03",
    title: "The Shadow emerges",
    body: "Enough predictions, enough patterns — and the screen splits. Your adversarial twin wakes up with receipts. The Arena scores you both when results come in.",
  },
] as const;

export default function Home() {
  return (
    <main>
      {/* ───── HERO ───── */}
      <section className={`${styles.hero} mesh-bg`}>
        <HeroBackground />
        <div className={`u-container ${styles.heroInner}`}>
          <span className={styles.badge}>
            <Ghost size={14} aria-hidden />
            QVAC Local AI · World Cup 2026 · USDt Stakes
          </span>

          <h1 className={styles.title}>
            Your AI twin learns your biases
            <br />
            <span className="u-gradient-text u-shimmer">
              then argues against every call you make.
            </span>
          </h1>

          <p className={styles.lede}>
            ShadowSage runs 100% locally with QVAC — no cloud AI, ever. Make
            football predictions, watch your adversarial Shadow emerge from your
            blind spots, and back your best calls with wallet-scoped USDt stakes.
            All private. All self-custodial.
          </p>

          <div className={styles.ctas}>
            <Link href="/chat" className={styles.ctaPrimary}>
              Start predicting
              <ArrowRight size={18} aria-hidden />
            </Link>
            <a href="#how" className={styles.ctaSecondary}>
              How it works
            </a>
          </div>

          {/* You vs Shadow visual */}
          <div className={styles.duel} aria-hidden>
            <SpotlightCard
              tone="you"
              className={`${styles.duelCard} ${styles.duelYou} glass`}
            >
              <span className={styles.duelLabel}>
                <Eye size={14} /> You
              </span>
              <p className={styles.duelQuote}>
                “Brazil cruise it 3–1. Neymar&apos;s unplayable right now.”
              </p>
              <span className={styles.duelMeta}>Confidence 9/10</span>
            </SpotlightCard>

            <div className={styles.duelVs}>
              <Swords size={18} />
            </div>

            <SpotlightCard
              tone="shadow"
              className={`${styles.duelCard} ${styles.duelShadow} glass`}
            >
              <span className={styles.duelLabel}>
                <Ghost size={14} /> The Shadow
              </span>
              <p className={styles.duelQuote}>
                “You&apos;re pinning the whole game on Neymar again. One bad
                night from him and Brazil get shocked — and deep down you know
                it. Be honest: you&apos;re scared they lose. I&apos;ll say they
                do.”
              </p>
              <span className={styles.duelMeta}>Shadow Confidence 8/10</span>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* ───── EMERGENCE TEASER ───── */}
      <section className={styles.emergence}>
        <Reveal className="u-container">
          <p className={styles.emergenceKicker}>The Binary Emergence Event</p>
          <h2 className={styles.emergenceLine}>
            Most agents are identical on day one and day ten.
            <br />
            <GlitchText className={styles.emergenceAccent}>
              {"Your Shadow doesn't exist — until it does."}
            </GlitchText>
          </h2>
        </Reveal>
      </section>

      {/* ───── FEATURES ───── */}
      <section className={styles.features}>
        <div className="u-container">
          <Reveal className={styles.sectionHead}>
            <h2>A companion that turns on you</h2>
            <p className="u-muted">
              Four moving parts, one psychological gut-punch.
            </p>
          </Reveal>

          <Stagger className={styles.grid}>
            {FEATURES.map(({ icon: Icon, title, body }, i) => (
              <StaggerItem key={title}>
                <SpotlightCard
                  tone={i % 2 === 0 ? "you" : "shadow"}
                  className={`${styles.card} glass grain`}
                >
                  <span className={styles.cardIcon}>
                    <Icon size={22} aria-hidden />
                  </span>
                  <h3 className={styles.cardTitle}>{title}</h3>
                  <p className={styles.cardBody}>{body}</p>
                </SpotlightCard>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ───── HOW IT WORKS ───── */}
      <section id="how" className={styles.how}>
        <div className="u-container">
          <Reveal className={styles.sectionHead}>
            <h2>How the Shadow is born</h2>
            <p className="u-muted">
              Three steps from friendly chat to a local adversary.
            </p>
          </Reveal>

          <Stagger className={styles.steps} stagger={0.12}>
            {STEPS.map(({ n, title, body }) => (
              <StaggerItem key={n} className={styles.step}>
                <span className={styles.stepNum}>{n}</span>
                <h3 className={styles.stepTitle}>{title}</h3>
                <p className={styles.stepBody}>{body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ───── CLOSING CTA ───── */}
      <section className={styles.closing}>
        <Reveal className={`u-container ${styles.closingInner}`}>
          <h2 className={styles.closingTitle}>
            Ready to meet the version of you
            <br />
            <span className="u-gradient-text u-shimmer">
              that always disagrees?
            </span>
          </h2>
          <Link href="/chat" className={styles.ctaPrimary}>
            Make your first prediction
            <ArrowRight size={18} aria-hidden />
          </Link>
          <p className={styles.poweredBy}>
            Powered by QVAC local AI · 100% private inference
          </p>
        </Reveal>
      </section>
    </main>
  );
}
