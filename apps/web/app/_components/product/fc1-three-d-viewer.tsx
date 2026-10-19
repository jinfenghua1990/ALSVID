"use client";

import { createElement, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { fc1Photos } from "./fc1-photos";
import styles from "./fc1-product.module.css";

export type Fc1PaintColour = "sample" | "black" | "blue" | "silver";

type PaintedMaterial = {
  name?: string;
  pbrMetallicRoughness?: { setBaseColorFactor: (colour: string) => void };
};

type Fc1ModelViewerElement = HTMLElement & {
  model?: { materials?: PaintedMaterial[] };
  jumpCameraToGoal?: () => void;
};

const PAINT: Record<Fc1PaintColour, string> = {
  sample: "#2d5850",
  black: "#262a2d",
  blue: "#2a4f6b",
  silver: "#b7c2c8",
};

/**
 * Viewer for a real FC1 GLB asset, not a rotating flat photograph.
 * Load only after the file has been positively checked and the customer chooses 3D.
 * The existing genuine FC1 photograph remains the safe fallback.
 */
export function Fc1ThreeDViewer({
  url,
  colour,
  alt,
  note,
  loadingText,
  onFailure,
}: {
  url: string;
  colour: Fc1PaintColour;
  alt: string;
  note: string;
  loadingText: string;
  onFailure: () => void;
}) {
  const viewer = useRef<Fc1ModelViewerElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const element = viewer.current;
    if (!element) return;
    const load = () => setLoaded(true);
    const fail = () => onFailure();
    element.addEventListener("load", load);
    element.addEventListener("error", fail);
    return () => {
      element.removeEventListener("load", load);
      element.removeEventListener("error", fail);
    };
  }, [onFailure]);

  useEffect(() => {
    if (!loaded) return;
    // V10's review model uses this explicit painted-frame material group.
    // Never tint the tyre, spokes, saddle, motor housing or other hardware.
    for (const material of viewer.current?.model?.materials ?? []) {
      if (/^Deep satin metallic blue$/i.test(material.name ?? "")) {
        material.pbrMetallicRoughness?.setBaseColorFactor(PAINT[colour]);
      }
    }
  }, [colour, loaded]);

  return (
    <div className={styles.interestThreeDView} data-fc1-model-viewer>
      <Script
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.4.0/model-viewer.min.js"
        type="module"
        strategy="afterInteractive"
        onError={onFailure}
      />
      {createElement("model-viewer", {
        ref: viewer,
        src: url,
        alt,
        poster: fc1Photos.side.src,
        "camera-controls": "",
        "touch-action": "pan-y",
        "interaction-prompt": "auto",
        "shadow-intensity": "0.55",
        exposure: "1.05",
        "camera-orbit": "0deg 82deg auto",
        loading: "eager",
        reveal: "auto",
        className: styles.interestThreeDCanvas,
      })}
      {!loaded ? <span className={styles.interestThreeDLoading} role="status">{loadingText}</span> : null}
      <p className={styles.interestThreeDNote}>{note}</p>
    </div>
  );
}
