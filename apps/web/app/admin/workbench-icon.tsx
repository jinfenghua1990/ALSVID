import type { ReactNode } from "react";
export type WorkbenchIconName =
  | "box"
  | "order"
  | "gear"
  | "warehouse"
  | "people"
  | "user"
  | "headset"
  | "link"
  | "chart"
  | "settings"
  | "clipboard"
  | "warning"
  | "bike"
  | "shield"
  | "arrow";
const paths: Record<WorkbenchIconName, ReactNode> = {
  box: (
    <>
      <path d="m12 3 9 5v9l-9 5-9-5V8l9-5Z" />
      <path d="m3 8 9 5 9-5M12 13v9M7.5 5.5l9 5" />
    </>
  ),
  order: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  gear: (
    <>
      <path d="m10 3-1 3-3 1-2-1-2 3 3 2v3l-3 2 2 3 2-1 3 1 1 3h4l1-3 3-1 2 1 2-3-3-2v-3l3-2-2-3-2 1-3-1-1-3Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  warehouse: (
    <>
      <path d="m3 9 9-6 9 6v12H3V9Z" />
      <path d="M8 21V11h8v10M8 15h8M8 18h8" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-4a6 6 0 0 1 12 0v4H3ZM16 4a3 3 0 0 1 0 6M18 13a5 5 0 0 1 3 5v3h-3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2H4Z" />
    </>
  ),
  headset: (
    <>
      <path d="M4 14v-3a8 8 0 0 1 16 0v3M20 18v1a3 3 0 0 1-3 3h-3" />
      <rect x="2" y="11" width="4" height="8" rx="2" />
      <rect x="18" y="11" width="4" height="8" rx="2" />
    </>
  ),
  link: (
    <>
      <path d="m10 7 3-3a5 5 0 0 1 7 7l-4 4a5 5 0 0 1-7 0M14 17l-3 3a5 5 0 0 1-7-7l4-4a5 5 0 0 1 7 0" />
    </>
  ),
  chart: <path d="M4 20V11h3v9H4ZM11 20V4h3v16h-3ZM18 20v-7h3v7h-3Z" />,
  settings: (
    <>
      <path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z" />
      <circle cx="12" cy="12" r="3.5" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="5" width="14" height="16" rx="2" />
      <rect x="9" y="2" width="6" height="5" rx="1" />
      <path d="M9 12h6M9 16h5" />
    </>
  ),
  warning: (
    <>
      <path d="m12 3 10 18H2L12 3Z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
  bike: (
    <>
      <circle cx="5" cy="17" r="4" />
      <circle cx="19" cy="17" r="4" />
      <path d="m5 17 4-9 5 9H5l10-9 4 9M7 8h4M15 4h3l-3 4" />
    </>
  ),
  shield: (
    <>
      <path d="m12 2 9 4v6c0 5-4 8-9 10-5-2-9-5-9-10V6l9-4Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  arrow: <path d="m9 5 7 7-7 7" />,
};
export function WorkbenchIcon({
  name,
  className,
}: {
  name: WorkbenchIconName;
  className?: string | undefined;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
