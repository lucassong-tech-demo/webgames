import Link from "next/link";

const navItems = [
  { label: "首页", href: "#home" },
  { label: "玩法", href: "#features" },
  { label: "游戏亮点", href: "#highlights" },
  { label: "关于游戏", href: "#about" },
];

const features = [
  { number: "20×20", label: "经典游戏网格" },
  { number: "50ms", label: "最快移动速度" },
  { number: "∞", label: "无限挑战可能" },
];

export default function LandingPage() {
  return (
    <main className="landing-shell">
      <section className="hero" id="home">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-glow hero-glow-one" aria-hidden="true" />
        <div className="hero-glow hero-glow-two" aria-hidden="true" />
        <div className="particles" aria-hidden="true">
          {Array.from({ length: 28 }, (_, index) => (
            <span key={index} />
          ))}
        </div>

        <header className="site-header">
          <Link className="brand" href="#home" aria-label="Snake Lab 首页">
            <span className="brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>SNAKE LAB</span>
          </Link>

          <nav className="main-nav" aria-label="主导航">
            {navItems.map((item, index) => (
              <Link
                className={index === 0 ? "active" : undefined}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link className="header-cta" href="/game">
            开始游戏
          </Link>
        </header>

        <div className="hero-content">
          <div className="eyebrow">
            <span />
            浏览器里的经典街机体验
          </div>
          <h1>
            一场关于反应力的
            <span>无限挑战</span>
          </h1>
          <p>
            轻点方向键，穿越数字网格。吃下目标、刷新高分，
            在越来越快的节奏中挑战你的操作极限。
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="/game">
              立即开玩
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="secondary-button" href="#features">
              了解玩法
            </Link>
          </div>
        </div>

        <div className="scroll-hint" aria-hidden="true">
          <span />
          向下探索
        </div>
      </section>

      <section className="feature-strip" id="features">
        <div className="feature-intro">
          <span>GAME OVERVIEW</span>
          <h2>简单规则，持续上头</h2>
        </div>
        <div className="feature-stats" id="highlights">
          {features.map((feature) => (
            <article key={feature.label}>
              <strong>{feature.number}</strong>
              <span>{feature.label}</span>
            </article>
          ))}
        </div>
        <p className="about-copy" id="about">
          无需下载，打开即可开始。支持自由调速、穿墙移动和成绩保存，
          每一局都由你掌控节奏。
        </p>
      </section>
    </main>
  );
}
