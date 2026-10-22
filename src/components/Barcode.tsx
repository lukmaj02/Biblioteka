"use client";

import { barcodeSvgMarkup } from "@/lib/barcode-svg";

type Props = {
  value: string;
  className?: string;
  compact?: boolean;
};

export function Barcode({ value, className = "", compact = true }: Props) {
  if (!value) return null;

  let svg = "";
  try {
    svg = barcodeSvgMarkup(value, {
      height: compact ? 36 : 52,
      moduleWidth: compact ? 1.3 : 1.6,
      quietZone: compact ? 6 : 10,
    });
  } catch {
    return (
      <span className={`font-mono text-[9px] text-black ${className}`}>
        {value}
      </span>
    );
  }

  const w = compact ? "46mm" : "60mm";
  const h = compact ? "11mm" : "16mm";

  return (
    <div
      className={`flex flex-col items-center justify-center gap-0.5 ${className}`}
      style={{
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <div
        style={{ width: w, height: h }}
        dangerouslySetInnerHTML={{
          __html: svg.replace(
            /<svg /,
            `<svg style="width:${w};height:${h};max-width:100%;" preserveAspectRatio="none" `
          ),
        }}
      />
      <span
        className="font-mono text-[8pt] leading-none text-black"
        style={{ letterSpacing: "0.02em" }}
      >
        {value}
      </span>
    </div>
  );
}
