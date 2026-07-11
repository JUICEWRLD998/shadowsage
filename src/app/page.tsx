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
    body: "Every pick, score, and gut-feel reason you give is mined for the cognitive biases steering your calls — recency, star-player worship, hometown loyalty.",
  },
  {
    icon: Ghost,
    title: "Then it spawns your Shadow",
    body: "Once it knows you well enough, an adversarial twin awakens — built entirely from your blind spots — and starts arguing against everything you pick.",
  },
  {
    icon: Swords,
    title: "You vs You, every match",
    body: "Your prediction on one side, the Shadow's counter on the other. It quotes your own past reasoning back at you. Winner takes the scoreboard.",
  },
  {
    icon: Database,
    title: "Remembered forever",
    body: "Nothing is stored in a database you control. It all lives on Walrus decentralized memory — leave for a month, come back, your Shadow remembers everything.",
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Make your calls",
    body: "Chat naturally about upcoming fixtures. Who wins, the score, and — crucially — why.",
  },
  {
    n: "02",
    title: "It profiles you",
    body: "Quietly, behind a friendly face, your prediction psychology takes shape in persistent memory.",
  },
  {
    n: "03",
    title: "The Shadow emerges",
    body: "Enough data, and the screen splits. Your twin wakes up — and it has receipts.",
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
            Walrus Memory · World Cup 2026
          </span>

          <h1 className={styles.title}>
            The AI that spawns
            <br />
            <span className="u-gradient-text u-shimmer">your evil twin.</span>
          </h1>

          <p className={styles.lede}>
            Shadow Pundit is a World Cup companion with a secret. It tracks your
            predictions, learns your cognitive biases, and breeds an adversarial
            Shadow that argues against every pick you make — using your own
            history as ammunition.
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
            <p className="u-muted">Three steps from friendly chat to evil twin.</p>
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
          <p className={styles.poweredBy}>Powered by Walrus Memory 🦭</p>
        </Reveal>
      </section>
    </main>
  );
}
