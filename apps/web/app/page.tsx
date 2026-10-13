import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { portalFromHost, portalUrlFor } from './_lib/portal-routing';
import styles from './page.module.css';

const platforms = [
  { code: 'FC Series', name: '碳纤维折叠', note: '极致轻量 · 快速折叠 · 城市与旅行兼顾' },
  { code: 'CT Series', name: '城市通勤', note: '高效通勤 · 舒适骑行 · 都市生活' },
  { code: 'FT Series', name: '胖胎探索', note: '全地形能力 · 探索无限可能' },
  { code: 'GT Series', name: '长途旅行', note: '长途骑行 · 强大装载 · 无惧远行' },
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

export default async function HomePage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') ?? '';
  const portal = portalFromHost(host);

  if (portal === 'admin') redirect('/admin');
  if (portal === 'dealer') redirect('/dealer');
  if (portal === 'my') redirect('/my');

  const myUrl = portalUrlFor(host, 'my');
  const dealerUrl = portalUrlFor(host, 'dealer');

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="#top">ALSVID</a>
        <nav className={styles.nav} aria-label="官网主导航">
          <a href="#bikes">自行车</a>
          <a href="#accessories">配件</a>
          <a href="#service">服务</a>
          <a href="#about">关于我们</a>
          <a href="#dealer">经销商合作</a>
        </nav>
        <div className={styles.actions}>
          <a className={styles.buyButton} href="#bikes">购买</a>
          <Link className={styles.loginText} href={myUrl}>登录</Link>
          <a className={styles.searchIcon} href="#bikes" aria-label="搜索">⌕</a>
        </div>
      </header>

      <section id="top" className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>FC1 · 碳纤维折叠旗舰</p>
          <h1>ALSVID</h1>
          <h2>为自由而工程</h2>
          <p className={styles.heroLead}>
            以工程创新，重新定义折叠自行车。更轻、更强、更自由，陪伴你探索更大的世界。
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="#flagship">探索 FC1 →</a>
            <a className={styles.outlineButton} href="#bikes">立即购买</a>
          </div>
        </div>
        <div className={styles.heroMeta}>
          <span>轻量</span><span>｜</span><span>强韧</span><span>｜</span><span>精密</span><span>｜</span><span>自由</span>
        </div>
      </section>

      <section id="bikes" className={styles.section}>
        <div className={`${styles.sectionHeader} ${styles.centered}`}>
          <h2>ALSVID 产品平台</h2>
          <p>不同的骑行方式，同样的工程精神。</p>
        </div>
        <div className={styles.platformGrid}>
          {platforms.map((item) => (
            <a className={styles.platformCard} href="#flagship" key={item.code}>
              <div>
                <h3>{item.code}</h3>
                <strong>{item.name}</strong>
              </div>
              <div className={styles.platformVisual} aria-hidden="true">
                <div className={styles.bikeFrame} />
              </div>
              <div className={styles.platformFooter}>
                <span>{item.note}</span>
                <span>探索系列 →</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section id="flagship" className={styles.darkSection}>
        <div className={styles.flagship}>
          <div className={styles.flagshipCopy}>
            <p className={styles.eyebrow}>旗舰产品</p>
            <h2>FC1</h2>
            <h3>重新定义碳纤维折叠骑行</h3>
            <p>
              将先进的碳纤维工程与精密折叠结构相结合，FC1 为城市与旅行带来全新的自由体验。
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#service">探索 FC1 →</a>
              <a className={styles.outlineButton} href="#bikes">立即购买</a>
            </div>
          </div>
          <div className={styles.flagshipVisual} aria-label="FC1 旗舰车型视觉" />
          <div className={styles.featureGrid}>
            <div className={styles.featureItem}><div className={styles.featureIcon}>◇</div><strong>轻量碳纤维</strong><span>面向高效城市与旅行使用</span></div>
            <div className={styles.featureItem}><div className={styles.featureIcon}>↔</div><strong>快速折叠</strong><span>便于通勤、收纳与转运</span></div>
            <div className={styles.featureItem}><div className={styles.featureIcon}>✦</div><strong>精密结构</strong><span>围绕可靠性与长期使用设计</span></div>
            <div className={styles.featureItem}><div className={styles.featureIcon}>⌁</div><strong>城市与旅行兼顾</strong><span>从日常出行到更远的旅程</span></div>
          </div>
        </div>
      </section>

      <section id="accessories" className={styles.section}>
        <div className={styles.splitHeader}>
          <div>
            <h2>ALSVID 配件生态</h2>
            <p>丰富的配件选择，打造专属于你的骑行体验。</p>
          </div>
          <a className={styles.darkOutlineButton} href="#accessories">浏览所有配件 →</a>
        </div>
        <div className={styles.accessoryGrid}>
          {accessories.map((item) => (
            <article className={styles.accessoryCard} key={item.name}>
              <div className={styles.accessoryVisual} aria-hidden="true">{item.icon}</div>
              <h3>{item.name}</h3>
              <p>{item.note}</p>
              <a href="#accessories">立即购买 →</a>
            </article>
          ))}
        </div>
      </section>

      <section id="service" className={styles.serviceSection}>
        <div className={styles.serviceInner}>
          <div className={styles.serviceImage} aria-label="ALSVID 车主服务视觉" />
          <div className={styles.serviceContent}>
            <div className={styles.serviceTitle}>
              <h2>服务</h2><span>My ALSVID</span>
            </div>
            <p>从购买到陪伴，提供全生命周期的服务支持。</p>
            <div className={styles.serviceGrid}>
              {services.map(([title, text]) => (
                <div className={styles.serviceCard} key={title}>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href={myUrl}>进入 My ALSVID →</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className={styles.aboutSection}>
        <div className={styles.aboutInner}>
          <div className={styles.aboutHeader}>
            <div className={styles.aboutTitle}>
              <h2>关于我们</h2>
              <p>以工程创新，推动更美好的骑行生活。</p>
            </div>
            <a className={styles.darkOutlineButton} href="#about">了解更多 →</a>
          </div>
          <div className={styles.aboutGrid}>
            {aboutItems.map(([title, text]) => (
              <article className={styles.aboutCard} key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="dealer" className={styles.dealer}>
        <div className={styles.dealerContent}>
          <p className={styles.eyebrow}>经销商合作</p>
          <h2>加入 ALSVID 全球经销网络</h2>
          <p>与我们一起，将高品质的骑行体验带给更多用户。共享成长机遇，开启更广阔的市场。</p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="#dealer">申请合作 →</a>
            <Link className={styles.outlineButton} href={dealerUrl}>经销商登录</Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <strong>ALSVID</strong>
            <p>为自由而工程</p>
          </div>
          <div className={styles.footerColumn}><h4>自行车</h4><a href="#bikes">FC Series</a><a href="#bikes">CT Series</a><a href="#bikes">FT Series</a><a href="#bikes">GT Series</a></div>
          <div className={styles.footerColumn}><h4>配件</h4><a href="#accessories">配件总览</a><a href="#accessories">前置车篮</a><a href="#accessories">后货架</a><a href="#accessories">车灯</a></div>
          <div className={styles.footerColumn}><h4>服务</h4><Link href={myUrl}>My ALSVID</Link><a href="#service">车辆注册</a><a href="#service">保修服务</a><a href="#service">用户手册</a></div>
          <div className={styles.footerColumn}><h4>关于我们</h4><a href="#about">品牌故事</a><a href="#about">设计理念</a><a href="#about">工程技术</a><a href="#about">制造工艺</a></div>
          <div className={styles.footerColumn}><h4>经销商合作</h4><a href="#dealer">合作优势</a><a href="#dealer">申请合作</a><Link href={dealerUrl}>经销商登录</Link><a href="#about">联系我们</a></div>
        </div>
        <div className={styles.footerBottom}>
          <span>© 2026 ALSVID. 保留所有权利。</span>
          <span>隐私政策 ｜ 使用条款 ｜ Cookie 设置 ｜ 中国（简体中文）</span>
        </div>
      </footer>
    </main>
  );
}
