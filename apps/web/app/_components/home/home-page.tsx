import Link from 'next/link';
import { BikeVector } from './bike-vector';
import { CountUp } from './count-up';
import { FoldingDemo } from './folding-demo';
import { HeroSection } from './hero';
import { Reveal } from './reveal';
import home from '../../home.module.css';
import legacy from '../../page.module.css';

const platforms = [
  { code: 'FC Platform', name: '折叠碳纤平台', note: '极致轻量 · 快速折叠 · 城市与旅行兼顾', skin: home.pi1 },
  { code: 'CT Platform', name: '城市通勤平台', note: '高效通勤 · 舒适骑行 · 都市生活', skin: home.pi2 },
  { code: 'FT Platform', name: '胖胎探索平台', note: '全地形能力 · 探索无限可能', skin: home.pi3 },
  { code: 'GT Platform', name: '长途旅行平台', note: '长途骑行 · 强大装载 · 无惧远行', skin: home.pi4 },
];

const accessories = [
  { icon: '▣', name: '前置车篮', note: '快速拆装 · 大容量' },
  { icon: '≋', name: '后货架', note: '稳固承重 · 旅行必备' },
  { icon: '◒', name: '挡泥板', note: '城市通勤 · 保持清洁' },
  { icon: '◉', name: '智能车灯', note: '高亮照明 · 安全骑行' },
  { icon: '▰', name: '电池与升级配件', note: '拓展更多可能' },
];

const services = [
  ['车辆注册', '激活您的 ALSVID'],
  ['我的车辆', '管理车辆信息'],
  ['VIN / 车架号绑定', '验证正品与保修'],
  ['保修服务', '专业的保修支持'],
  ['维修支持', '获取维修与技术帮助'],
  ['用户手册', '下载产品手册'],
  ['服务网点', '查找附近的服务中心'],
];

const aboutItems = [
  ['品牌故事', '从热爱出发，走向更大的世界'],
  ['设计理念', '功能美学与人本体验的平衡'],
  ['工程技术', '材料、结构与创新的融合'],
  ['制造工艺', '严苛标准，成就可靠品质'],
  ['新闻动态', '探索 ALSVID 的最新资讯'],
];

const techItems = [
  {
    title: '自动助力系统',
    detail: '力矩传感实时响应，起步即助力，踩踏更省力。',
    icon: <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />,
    iconBase: <circle cx="12" cy="12" r="3" />,
  },
  {
    title: '一体化电池设计',
    detail: '电池隐入车架，重心更低，续航长达 100 km。',
    icon: <path d="M21 10v4M7 11v2M11 11v2" />,
    iconBase: <rect x="3" y="7" width="16" height="10" rx="2" />,
  },
  {
    title: '折叠结构专利',
    detail: '自研铰链结构，3 秒折叠，坚固耐用无旷量。',
    icon: <path d="M4 12h6l2-6 3 12 2-6h3" />,
    iconBase: null,
  },
  {
    title: '轻量化高强度材质',
    detail: '航空级铝合金车架，整车 < 18 kg。',
    icon: <path d="M9 12l2 2 4-4" />,
    iconBase: <path d="M12 3 4 7v6c0 5 8 8 8 8s8-3 8-8V7z" />,
  },
  {
    title: '多重安全防护',
    detail: 'IPX7 防水、过流保护与智能刹车断电。',
    icon: <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />,
    iconBase: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
];

/**
 * ALSVID 官方首页（www 门户 + /home 本地预览共用）。
 * 上半部分为交互区块（Hero 轮播 / 平台卡片 / FC1 / 折叠演示 / 技术），
 * 下半部分保留配件、服务、关于、经销商合作与页脚。
 */
export function HomePage({ myUrl, dealerUrl }: { myUrl: string; dealerUrl: string }) {
  return (
    <main id="top">
      <HeroSection />

      {/* 产品平台 */}
      <section id="platforms" className={home.sectionBlock}>
        <div className={home.sectionInner}>
          <Reveal>
            <div className={home.platHead}>
              <div>
                <p className={home.eyebrow}>Our Platforms</p>
                <h2 className={home.h2}>为不同的出行方式<br />打造更好的电助力自行车</h2>
                <a className={home.linkArrow} href="#featured">
                  探索全部车型
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </a>
              </div>
              <p className={home.platHeadNote}>
                从城市通勤到户外探索，ALSVID 以四大产品平台覆盖多元场景，让每一次出行更自由、更从容。
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className={home.platCards}>
              {platforms.map((item) => (
                <a key={item.code} href="#featured" className={home.platCard}>
                  <div className={`${home.platSvg} ${item.skin}`}>
                    <BikeVector tone="dark" />
                  </div>
                  <div className={home.platBody}>
                    <div>
                      <div className={home.platName}>{item.code}</div>
                      <div className={home.platDesc}>{item.name} · {item.note}</div>
                    </div>
                    <span className={home.platGo}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* FC1 旗舰 */}
      <section id="featured" className={`${home.sectionBlock} ${home.featured}`}>
        <div className={home.sectionInner}>
          <Reveal>
            <div className={home.featGrid}>
              <div>
                <p className={home.eyebrow}>Featured Model</p>
                <h2 className={home.featTitle}>FC1</h2>
                <p className={home.featSlogan}>更轻 · 更远 · 更自由</p>
                <p className={home.featDesc}>
                  FC1 是 ALSVID 全新一代便携电助力自行车，以斯堪的纳维亚设计语言的简约美学，重新定义城市出行的可能性。
                </p>
                <button type="button" className={home.btnSolid}>探索 FC1 <span aria-hidden="true">→</span></button>
              </div>
              <div className={home.featStage}>
                <BikeVector tone="dark" />
              </div>
              <div className={home.featStats}>
                <div className={home.stat}>
                  <div className={home.statNum}><CountUp to={18} /><span className={home.statUnit}>&lt; kg</span></div>
                  <div className={home.statLabel}>轻量化设计</div>
                </div>
                <div className={home.stat}>
                  <div className={home.statNum}><CountUp to={100} /><span className={home.statUnit}>km</span></div>
                  <div className={home.statLabel}>综合续航</div>
                </div>
                <div className={home.stat}>
                  <div className={home.statNum}><CountUp to={3} /><span className={home.statUnit}>秒</span></div>
                  <div className={home.statLabel}>折叠秒数</div>
                </div>
                <div className={home.stat}>
                  <div className={home.statNum} style={{ fontSize: 20, paddingTop: 8 }}>FC 平台</div>
                  <div className={home.statLabel}>轻量折叠架构</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 三步折叠（交互） */}
      <section id="folding" className={home.sectionBlock}>
        <div className={home.sectionInner}>
          <Reveal>
            <div style={{ maxWidth: 420, marginBottom: 56 }}>
              <p className={home.eyebrow}>Folding in Seconds</p>
              <h2 className={home.h2}>三步折叠<br />自由随行</h2>
              <p style={{ fontSize: 13.5, color: 'var(--ink2, #4a4f58)', marginTop: 16 }}>
                点击右侧步骤，查看每个折叠阶段的车辆形态变化。精巧结构让 FC1 从整车到收拢只需 3 秒。
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <FoldingDemo />
          </Reveal>
        </div>
      </section>

      {/* 核心技术 */}
      <section id="tech" className={`${home.sectionBlock} ${home.tech}`}>
        <div className={home.sectionInner}>
          <Reveal>
            <div>
              <p className={home.eyebrow} style={{ color: '#5f6670' }}>Technology</p>
              <h2 className={home.h2}>精密工程<br />成就更好的骑行体验</h2>
              <p className={home.techDesc}>
                从自研电助力系统到一体化结构设计，ALSVID 致力于将核心技术打磨至极致——更轻盈、安静、高效且易操控。
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className={home.techGrid}>
              {techItems.map((item) => (
                <div key={item.title} className={home.techItem} tabIndex={0}>
                  <div className={home.techIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      {item.iconBase}
                      {item.icon}
                    </svg>
                  </div>
                  <div className={home.techT}>{item.title}</div>
                  <p className={home.techMore}>{item.detail}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={200}>
            <button type="button" className={home.techCta}>探索核心技术 <span aria-hidden="true">→</span></button>
          </Reveal>
        </div>
      </section>

      {/* 配件生态 */}
      <section id="accessories" className={home.sectionBlock}>
        <div className={home.sectionInner}>
          <Reveal>
            <div className={legacy.splitHeader}>
              <div>
                <h2 className={home.h2}>ALSVID 配件生态</h2>
                <p style={{ fontSize: 13.5, color: 'var(--ink2, #4a4f58)' }}>丰富的配件选择，打造专属于你的骑行体验。</p>
              </div>
              <a className={legacy.darkOutlineButton} href="#accessories">浏览所有配件 →</a>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className={legacy.accessoryGrid}>
              {accessories.map((item) => (
                <article className={legacy.accessoryCard} key={item.name}>
                  <div className={legacy.accessoryVisual} aria-hidden="true">{item.icon}</div>
                  <h3>{item.name}</h3>
                  <p>{item.note}</p>
                  <a href="#accessories">立即购买 →</a>
                </article>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 车主服务 */}
      <section id="service" className={legacy.serviceSection}>
        <div className={legacy.serviceInner}>
          <div className={legacy.serviceImage} aria-label="ALSVID 车主服务视觉" />
          <div className={legacy.serviceContent}>
            <div className={legacy.serviceTitle}>
              <h2>服务</h2><span>My ALSVID</span>
            </div>
            <p>从购买到陪伴，提供全生命周期的服务支持。</p>
            <div className={legacy.serviceGrid}>
              {services.map(([title, text]) => (
                <div className={legacy.serviceCard} key={title}>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <div className={legacy.heroActions}>
              <Link className={legacy.primaryButton} href={myUrl}>进入 My ALSVID →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* 关于我们 */}
      <section id="about" className={legacy.aboutSection}>
        <div className={legacy.aboutInner}>
          <div className={legacy.aboutHeader}>
            <div className={legacy.aboutTitle}>
              <h2>关于我们</h2>
              <p>以工程创新，推动更美好的骑行生活。</p>
            </div>
            <a className={legacy.darkOutlineButton} href="#about">了解更多 →</a>
          </div>
          <div className={legacy.aboutGrid}>
            {aboutItems.map(([title, text]) => (
              <article className={legacy.aboutCard} key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 经销商合作 */}
      <section id="dealer" className={legacy.dealer}>
        <div className={legacy.dealerContent}>
          <p className={legacy.eyebrow}>经销商合作</p>
          <h2>加入 ALSVID 全球经销网络</h2>
          <p>与我们一起，将高品质的骑行体验带给更多用户。共享成长机遇，开启更广阔的市场。</p>
          <div className={legacy.heroActions}>
            <a className={legacy.primaryButton} href="#dealer">申请合作 →</a>
            <Link className={legacy.outlineButton} href={dealerUrl}>经销商登录</Link>
          </div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className={legacy.footer}>
        <div className={legacy.footerGrid}>
          <div className={legacy.footerBrand}>
            <strong>ALSVID</strong>
            <p>为自由而工程</p>
          </div>
          <div className={legacy.footerColumn}><h4>自行车</h4><a href="#platforms">FC Platform</a><a href="#platforms">CT Platform</a><a href="#platforms">FT Platform</a><a href="#platforms">GT Platform</a></div>
          <div className={legacy.footerColumn}><h4>配件</h4><a href="#accessories">配件总览</a><a href="#accessories">前置车篮</a><a href="#accessories">后货架</a><a href="#accessories">车灯</a></div>
          <div className={legacy.footerColumn}><h4>服务</h4><Link href={myUrl}>My ALSVID</Link><a href="#service">车辆注册</a><a href="#service">保修服务</a><a href="#service">用户手册</a></div>
          <div className={legacy.footerColumn}><h4>关于我们</h4><a href="#about">品牌故事</a><a href="#about">设计理念</a><a href="#about">工程技术</a><a href="#about">制造工艺</a></div>
          <div className={legacy.footerColumn}><h4>经销商合作</h4><a href="#dealer">合作优势</a><a href="#dealer">申请合作</a><Link href={dealerUrl}>经销商登录</Link><a href="#about">联系我们</a></div>
        </div>
        <div className={legacy.footerBottom}>
          <span>© 2026 ALSVID. 保留所有权利。</span>
          <span>隐私政策 ｜ 使用条款 ｜ Cookie 设置 ｜ 中国（简体中文）</span>
        </div>
      </footer>
    </main>
  );
}
