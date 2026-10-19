"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { translator, type Locale } from "../../_lib/i18n";
import { fc1Photos } from "./fc1-photos";
import styles from "./fc1-product.module.css";
import { Fc1ThreeDViewer } from "./fc1-three-d-viewer";

type ColourId = "sample" | "black" | "blue" | "silver";
type ModelId = "standard" | "pro";

// Deploy the verified FC1 GLB at this static path, or set the public R2 URL at build time.
// Until it exists, the selector remains photo-only: a 2D image is never presented as real 3D.
const FC1_MODEL_URL = process.env.NEXT_PUBLIC_FC1_3D_MODEL_URL?.trim() || "/products/fc1/ALSVID_FC1_unfolded_review_v10.glb";

const COLOURS: {id: ColourId; key: string; hex: string; available: boolean}[] = [
  { id: "sample", key: "fc1.colours.sample", hex: "#2d5850", available: true },
  { id: "black", key: "fc1.colours.black", hex: "#262a2d", available: false },
  { id: "blue", key: "fc1.colours.blue", hex: "#2a4f6b", available: false },
  { id: "silver", key: "fc1.colours.silver", hex: "#b7c2c8", available: false },
];

const COPY = {
  zh: {
    modelUnavailable: "暂不可订",
    sample: "样车展示",
    soldOut: "缺货",
    choose: "选择你喜欢的颜色",
    interest: "即使缺货也可选择；选择仅用于了解颜色偏好。",
    title: "选择你的 FC1",
    fineprint: "颜色为基于绿色实拍车的模拟效果，量产色号与可售状态以正式公布为准。",
    summary: "当前偏好",
    delivery: "计划正式开放并确认订单后，由中国发往德国预计交付 4–6 周；实际时间待物流确认。",
    noPayment: "不产生订单，不收取费用，也不代表预订成功。",
    saving: "正在记录颜色偏好…",
    saved: "已保存本次浏览的颜色偏好",
    retry: "暂未保存偏好，可再次点击颜色重试",
    click: "点击颜色即可登记偏好",
    how: "了解 FC1 技术",
    preview: "颜色效果模拟 · 非量产实拍",
    standard: "参考配置",
    photoMode: "实拍",
    threeDMode: "3D 查看",
    threeDLoading: "正在载入三维模型…",
    threeDNote: "3D 为外观核对模型，部分结构尚未实物验收；以真实车辆图片为准。拖动旋转，双指缩放。",
  },
  en: {
    modelUnavailable: "Not available to order",
    sample: "Reference sample",
    soldOut: "Out of stock",
    choose: "Choose your favourite colour",
    interest: "Even out-of-stock colours can be selected for demand research.",
    title: "Make your FC1 yours",
    fineprint: "Colours are simulations based on the genuine green sample. Final finishes and availability are not confirmed.",
    summary: "Your preference",
    delivery: "Planned dispatch from China to Germany: estimated delivery 4–6 weeks after order confirmation, subject to logistics verification.",
    noPayment: "No order or payment is created. This is not a confirmed reservation.",
    saving: "Saving your colour preference…",
    saved: "Colour preference saved for this browsing session",
    retry: "Could not save. Select a colour again to retry.",
    click: "Select a colour to register your preference",
    how: "Explore FC1 technology",
    preview: "Simulated colour · not a production photo",
    standard: "Reference specification",
    photoMode: "Photo",
    threeDMode: "3D view",
    threeDLoading: "Loading the 3D model…",
    threeDNote: "This is an appearance review model, not verified production geometry. Refer to actual bike photography. Drag to rotate or pinch to zoom.",
  },
  de: {
    modelUnavailable: "Derzeit nicht bestellbar",
    sample: "Referenzmuster",
    soldOut: "Nicht auf Lager",
    choose: "Wähle deine Lieblingsfarbe",
    interest: "Auch nicht lieferbare Farben können zur Nachfrageanalyse ausgewählt werden.",
    title: "Gestalte dein FC1",
    fineprint: "Farbansichten sind Simulationen des echten grünen Musters. Serienfarben und Verfügbarkeit sind noch nicht bestätigt.",
    summary: "Deine Präferenz",
    delivery: "Geplanter Versand aus China nach Deutschland: voraussichtlich 4–6 Wochen nach Bestellbestätigung, vorbehaltlich logistischer Prüfung.",
    noPayment: "Keine Bestellung, keine Zahlung und keine verbindliche Reservierung.",
    saving: "Farbpräferenz wird gespeichert…",
    saved: "Farbpräferenz für diese Browsersitzung gespeichert",
    retry: "Speichern fehlgeschlagen. Bitte Farbe erneut wählen.",
    click: "Farbe auswählen, um dein Interesse zu registrieren",
    how: "FC1 Technik entdecken",
    preview: "Farb-Simulation · kein Serienfoto",
    standard: "Referenzkonfiguration",
    photoMode: "Foto",
    threeDMode: "3D-Ansicht",
    threeDLoading: "3D-Modell wird geladen…",
    threeDNote: "Dieses Anschauungsmodell ist keine geprüfte Seriengeometrie. Maßgeblich sind die echten Fahrzeugfotos. Drehen durch Ziehen, zoomen mit zwei Fingern.",
  },
} satisfies Record<Locale, Record<string, string>>;

/** Pixel-level recolour of the genuine green sample; avoids tinting tyres, metal, saddle and background.
 * This is a preference preview, never a claim that a factory colour exists.
 */
function recolourPixels(base: ImageData, colour: Exclude<ColourId, "sample">): ImageData {
  const bytes = new Uint8ClampedArray(base.data);
  const target = {
    black: [31, 35, 38],
    blue: [27, 69, 105],
    silver: [164, 179, 185],
  }[colour];
  for (let i = 0; i < bytes.length; i += 4) {
    if (bytes[i + 3]! < 12) continue;
    const r = bytes[i]!, g = bytes[i + 1]!, b = bytes[i + 2]!;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const range = max - min;
    if (range < 10 || max < 19) continue;
    // Green / teal paint only. Black tyres and warm saddle colours are preserved.
    let hue = 0;
    if (max === r) hue = ((g - b) / range) % 6;
    else if (max === g) hue = (b - r) / range + 2;
    else hue = (r - g) / range + 4;
    hue = (hue * 60 + 360) % 360;
    const saturation = range / max;
    if (hue < 70 || hue > 195 || saturation < .11) continue;
    const edge = Math.min(1, (hue - 70) / 18, (195 - hue) / 18, (saturation - .11) / .14);
    const strength = Math.max(0, Math.min(.97, edge * .97));
    const light = (r * .22 + g * .67 + b * .11);
    const scale = Math.max(.43, Math.min(1.42, (light + 39) / 117));
    bytes[i] = Math.round(r * (1 - strength) + target[0]! * scale * strength);
    bytes[i + 1] = Math.round(g * (1 - strength) + target[1]! * scale * strength);
    bytes[i + 2] = Math.round(b * (1 - strength) + target[2]! * scale * strength);
  }
  return new ImageData(bytes, base.width, base.height);
}

function ColourBike({ locale, colour, modelUrl, onModelFailure }: { locale: Locale; colour: ColourId; modelUrl: string | null; onModelFailure: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<ImageData | null>(null);
  const [ready, setReady] = useState(0);
  const [drawn, setDrawn] = useState<ColourId>("sample");
  const copy = COPY[locale];

  useEffect(() => {
    const picture = new Image();
    let live = true;
    picture.onload = () => {
      if (!live) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = picture.naturalWidth;
      canvas.height = picture.naturalHeight;
      const ctx = canvas.getContext("2d", {willReadFrequently: true});
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(picture, 0, 0);
      try {
        baseRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setReady(value => value + 1);
      } catch { /* Genuine photo remains visible when canvas is restricted. */ }
    };
    picture.src = fc1Photos.side.src;
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!ready || !baseRef.current || colour === "sample") {
      setDrawn("sample");
      return;
    }
    const ctx = canvasRef.current?.getContext("2d", {willReadFrequently: true});
    if (!ctx) return;
    ctx.putImageData(recolourPixels(baseRef.current, colour), 0, 0);
    setDrawn(colour);
  }, [colour, ready]);

  return <div className={styles.interestBikeStage} data-3d-active={Boolean(modelUrl)}>
    <img {...fc1Photos.side} className={styles.interestOriginalBike} alt={translator(locale)("fc1.photo.alt")} fetchPriority="high" />
    <canvas ref={canvasRef} className={styles.interestColourCanvas} data-visible={colour !== "sample" && drawn === colour} aria-hidden="true" />
    {modelUrl ? <Fc1ThreeDViewer
      url={modelUrl}
      colour={colour}
      alt={translator(locale)("fc1.photo.alt")}
      note={copy.threeDNote}
      loadingText={copy.threeDLoading}
      onFailure={onModelFailure}
    /> : <p className={styles.interestPreviewLabel}>{copy.preview}</p>}
  </div>;
}

export function Fc1ColourConfigurator({locale}: {locale: Locale}) {
  const t = translator(locale);
  const copy = COPY[locale];
  const [model, setModel] = useState<ModelId>("standard");
  const [expandedModel, setExpandedModel] = useState<ModelId | null>(null);
  const [colour, setColour] = useState<ColourId>("sample");
  const [touched, setTouched] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [modelAvailable, setModelAvailable] = useState(false);
  const [visualMode, setVisualMode] = useState<"photo" | "3d">("photo");

  const onModelFailure = useCallback(() => {
    setVisualMode("photo");
    setModelAvailable(false);
  }, []);

  useEffect(() => {
    // HEAD avoids fetching the 35 MB GLB until the user actually opens 3D.
    // Reject Next.js HTML fallbacks and misconfigured R2 URLs.
    const controller = new AbortController();
    fetch(FC1_MODEL_URL, { method:"HEAD", signal:controller.signal, cache:"no-store" })
      .then(response => {
        const mime = response.headers.get("content-type") || "";
        if (response.ok && !mime.includes("text/html") && !mime.includes("application/json")) {
          setModelAvailable(true);
        }
      })
      .catch(() => { /* Static photography remains available. */ });
    return () => controller.abort();
  }, []);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const preferenceSession = useRef<string | null>(null);
  const current = COLOURS.find(item => item.id === colour) ?? COLOURS[0]!;

  useEffect(() => {
    if (touched < 1) return;
    setSaveState("saving");
    const wait = window.setTimeout(() => {
      // A short-lived, session-scoped random key avoids counting every click as a new customer.
      try {
        if (!preferenceSession.current) {
          let key = sessionStorage.getItem("alsvid_fc1_colour_session");
          if (!key) {
            key = crypto.randomUUID();
            sessionStorage.setItem("alsvid_fc1_colour_session", key);
          }
          preferenceSession.current = key;
        }
        const sessionKey = preferenceSession.current;
        queueRef.current = queueRef.current.catch(() => {}).then(async () => {
          const response = await fetch("/api/public/fc1-colour-interest", {
            method: "POST",
            headers: {"content-type": "application/json"},
            body: JSON.stringify({productCode: "FC1", sessionKey, modelCode: model, colourCode: colour, locale}),
            keepalive: true,
          });
          if (!response.ok) throw new Error("Unable to save preference");
        });
        queueRef.current.then(() => setSaveState("saved")).catch(() => setSaveState("failed"));
      } catch { setSaveState("failed"); }
    }, 450);
    return () => window.clearTimeout(wait);
  }, [colour, model, locale, touched]);

  const chooseColour = (next: ColourId) => { setColour(next); setTouched(value=>value+1); };
  const chooseModel = (next: ModelId) => { setModel(next); setExpandedModel(previous => previous === next ? null : next); setTouched(value=>value+1); };
  return <div id="configure" className={styles.interestConfigurator}>
    <div className={styles.interestVisual}>
      <div className={styles.interestIntro}>
        <span>FOLDING CARBON / ALSVID</span>
        <h1>ALSVID FC1</h1>
        <p>{t("fc1.heading")}</p>
      </div>
      <div className={styles.interestViewModes} role="group" aria-label={copy.threeDMode}>
        <button type="button" aria-pressed={visualMode === "photo"} onClick={() => setVisualMode("photo")}>{copy.photoMode}</button>
        {modelAvailable ? <button type="button" aria-pressed={visualMode === "3d"} onClick={() => setVisualMode("3d")}>{copy.threeDMode}</button> : null}
      </div>
      <ColourBike locale={locale} colour={colour} modelUrl={modelAvailable && visualMode === "3d" ? FC1_MODEL_URL : null} onModelFailure={onModelFailure}/>
      <div className={styles.interestVisualFooter}><span>{visualMode === "3d" ? copy.threeDMode : copy.preview}</span><span>FC1 / {current.key ? t(current.key as "fc1.colours.sample") : ""}</span></div>
    </div>
    <aside className={styles.interestControls} aria-label={copy.title}>
      <div className={styles.interestControlsHeading}><span>ALSVID FC1 / CONFIGURE</span><h2>{copy.title}</h2><p>{t("fc1.intro")}</p></div>
      <fieldset className={styles.interestFieldset}>
        <legend>{t("fc1.selection.model")}</legend>
        <div className={styles.interestModels}>
          {(["standard","pro"] as const).map(item=><button type="button" key={item} aria-pressed={model===item} aria-expanded={expandedModel===item} aria-controls="fc1-model-details" onClick={()=>chooseModel(item)}>
            <strong>FC1 {item==="standard"?"Standard":"Pro"}</strong>
            <small>{item==="standard"?copy.standard:copy.modelUnavailable}</small>
          </button>)}
        </div>
        <div
          id="fc1-model-details"
          className={styles.interestModelDetail}
          role="region"
          aria-label={expandedModel === "pro" ? t("fc1.selection.pro_status") : t("fc1.highlights")}
          hidden={expandedModel === null}
        >
          {expandedModel === "standard" ? (
            <>
              <div className={styles.interestSpecs} aria-label={t("fc1.highlights")}>
                <div><strong>40 <small>cm</small></strong><span>{t("fc1.metric.step")}</span></div>
                <div><strong>85 × 69 × 48 <small>cm</small></strong><span>{t("fc1.metric.folded")}</span></div>
                <div><strong>{new Intl.NumberFormat(locale,{minimumFractionDigits:1,maximumFractionDigits:1}).format(15.5)} <small>kg</small></strong><span>{t("fc1.metric.weight")}</span></div>
                <div><strong>80 <small>km¹</small></strong><span>{t("fc1.metric.range")}</span></div>
              </div>
              <p className={styles.interestModelNote}>{t("fc1.selection.model_note")}</p>
            </>
          ) : expandedModel === "pro" ? (
            <>
              <p className={styles.interestModelNote}>{t("fc1.selection.pro_status")}</p>
              <p className={styles.interestModelNote}>{t("fc1.selection.model_note")}</p>
            </>
          ) : null}
        </div>
      </fieldset>
      <fieldset className={styles.interestFieldset}>
        <legend>{copy.choose}</legend>
        <div className={styles.interestSwatches}>
          {COLOURS.map(item=><button type="button" key={item.id} aria-label={t(item.key as "fc1.colours.sample")} aria-pressed={colour===item.id} onClick={()=>chooseColour(item.id)}>
            <span className={styles.interestSwatch} style={{background:item.hex}} aria-hidden="true"/>
            <span className={styles.interestSwatchName}>{t(item.key as "fc1.colours.sample")}</span>
            <small>{item.available?copy.sample:copy.soldOut}</small>
          </button>)}
        </div>
        <p className={styles.interestHint}>{copy.interest}</p>
      </fieldset>
      <div className={styles.interestSummary}>
        <small>{copy.summary}</small><strong>FC1 {model==="standard"?"Standard":"Pro"} / {t(current.key as "fc1.colours.sample")}</strong>
        <p aria-live="polite" className={styles.interestFeedback}>
          {saveState==="idle"?copy.click:saveState==="saving"?copy.saving:saveState==="saved"?copy.saved:copy.retry}
        </p>
        <p>{copy.fineprint}</p>
        <p className={styles.interestDelivery}>{copy.delivery}</p>
        <p>{copy.noPayment}</p>
      </div>
    </aside>
  </div>;
}
