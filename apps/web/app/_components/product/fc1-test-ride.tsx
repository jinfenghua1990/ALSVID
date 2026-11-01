"use client";

import { useRef, useState, type FormEvent } from "react";
import { translator, type Locale } from "../../_lib/i18n";
import styles from "./fc1-test-ride.module.css";

type RequestState = "idle" | "sending" | "sent" | "failed";

/** Captures a test-ride *interest*, not a confirmed appointment or purchase. */
export function Fc1TestRide({
  locale,
  model,
  colour,
}: {
  locale: Locale;
  model: string;
  colour: string;
}) {
  const t = translator(locale);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState<"DE" | "AT">("DE");
  const [status, setStatus] = useState<RequestState>("idle");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    try {
      const response = await fetch("/api/public/fc1-reservation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          purpose: "test_ride",
          name,
          email,
          city,
          country,
          model,
          colour,
          locale,
        }),
      });
      if (!response.ok) throw new Error("Test-ride enquiry could not be sent");
      setStatus("sent");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <div className={styles.entry} data-fc1-test-ride>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => { setStatus("idle"); dialogRef.current?.showModal(); }}
        aria-haspopup="dialog"
      >
        <span aria-hidden="true" className={styles.icon}>⌖</span>
        <span className={styles.triggerText}>
          <strong>{t("fc1.test_ride.cta")}</strong>
          <small>{t("fc1.test_ride.helper")}</small>
        </span>
        <span aria-hidden="true" className={styles.chevron}>→</span>
      </button>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="fc1-test-ride-title"
        aria-describedby="fc1-test-ride-description"
        onClose={() => setStatus("idle")}
      >
        <div className={styles.dialogInner}>
          <div className={styles.dialogHead}>
            <span className={styles.kicker}>ALSVID / A1 Ultra</span>
            <button type="button" className={styles.close} onClick={() => dialogRef.current?.close()} aria-label={t("fc1.test_ride.close")}>×</button>
          </div>
          <h2 id="fc1-test-ride-title">{t("fc1.test_ride.title")}</h2>
          <p id="fc1-test-ride-description" className={styles.description}>{t("fc1.test_ride.description")}</p>
          <p className={styles.selection}>{t("fc1.test_ride.selection", { model, colour })}</p>
          {status === "sent" ? (
            <div className={styles.success} role="status">
              <strong>{t("fc1.test_ride.sent_title")}</strong>
              <p>{t("fc1.test_ride.sent_body")}</p>
              <button type="button" className={styles.submit} onClick={() => dialogRef.current?.close()}>{t("fc1.test_ride.close")}</button>
            </div>
          ) : (
            <form onSubmit={submit} className={styles.form}>
              <label>
                <span>{t("fc1.test_ride.name")}</span>
                <input type="text" name="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" placeholder={t("fc1.test_ride.name_placeholder")} />
              </label>
              <div className={styles.twoColumns}>
                <label>
                  <span>{t("fc1.test_ride.country")}</span>
                  <select name="country" value={country} onChange={(event) => setCountry(event.target.value as "DE" | "AT")}>
                    <option value="DE">{t("fc1.test_ride.germany")}</option>
                    <option value="AT">{t("fc1.test_ride.austria")}</option>
                  </select>
                </label>
                <label>
                  <span>{t("fc1.test_ride.city")}</span>
                  <input type="text" name="city" value={city} onChange={(event) => setCity(event.target.value)} maxLength={80} required autoComplete="address-level2" placeholder={t("fc1.test_ride.city_placeholder")} />
                </label>
              </div>
              <label>
                <span>{t("fc1.test_ride.email")}</span>
                <input type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required autoComplete="email" placeholder="name@example.com" />
              </label>
              <p className={styles.privacy}>{t("fc1.test_ride.privacy")}</p>
              <p className={styles.availability}>{t("fc1.test_ride.availability")}</p>
              <button className={styles.submit} type="submit" disabled={status === "sending"}>
                {status === "sending" ? t("fc1.test_ride.sending") : t("fc1.test_ride.submit")}
              </button>
              <p role="status" className={status === "failed" ? styles.error : styles.status}>
                {status === "failed" ? t("fc1.test_ride.failed") : t("fc1.test_ride.no_booking")}
              </p>
            </form>
          )}
        </div>
      </dialog>
    </div>
  );
}
