import { ImageOff } from "lucide-react";
import airFilter from "@/assets/parts/part-air-filter.jpg.asset.json";
import brakeDisc from "@/assets/parts/part-brake-disc.jpg.asset.json";
import padFront from "@/assets/parts/part-brake-pad-front.jpg.asset.json";
import padNissan from "@/assets/parts/part-brake-pad-nissan.jpg.asset.json";
import padRear from "@/assets/parts/part-brake-pad-rear.jpg.asset.json";
import hoseLower from "@/assets/parts/part-radiator-hose-lower.jpg.asset.json";
import hoseUpper from "@/assets/parts/part-radiator-hose-upper.jpg.asset.json";
import waterPump from "@/assets/parts/part-water-pump.jpg.asset.json";

const DEMO_URLS = new Set([
  airFilter.url,
  brakeDisc.url,
  padFront.url,
  padNissan.url,
  padRear.url,
  hoseLower.url,
  hoseUpper.url,
  waterPump.url,
]);

function isDemoUrl(src?: string | null) {
  if (!src) return false;
  if (DEMO_URLS.has(src)) return true;
  // Legacy hard-coded unsplash placeholder used by parts.$id.tsx before this fix.
  if (src.includes("images.unsplash.com/photo-1486496572940-2bb2341fdbdf")) return true;
  // Also block by filename fragment in case asset URLs shift (hashed builds).
  return /part-(air-filter|brake-disc|brake-pad-front|brake-pad-nissan|brake-pad-rear|radiator-hose-lower|radiator-hose-upper|water-pump)\./.test(src);
}

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  imgClassName?: string;
};

export function PartThumb({ src, alt = "", className, imgClassName }: Props) {
  if (src && !isDemoUrl(src)) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={imgClassName ?? "h-full w-full object-cover"}
      />
    );
  }
  return (
    <div
      className={
        className ??
        "flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-2 text-muted-foreground"
      }
      role="img"
      aria-label="Image coming soon"
    >
      <ImageOff className="h-6 w-6 opacity-60" />
      <span className="text-[10px] font-medium uppercase tracking-[0.22em]">
        Image coming soon
      </span>
    </div>
  );
}
