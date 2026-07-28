export const BRAND_LOGOS: Record<string, string> = {
  "rolls-royce": "https://www.carlogos.org/car-logos/rolls-royce-logo.png",
  honda: "https://www.carlogos.org/car-logos/honda-logo.png",
  mini: "https://www.carlogos.org/car-logos/mini-logo.png",
  bmw: "https://www.carlogos.org/car-logos/bmw-logo.png",
  mercedes: "https://www.carlogos.org/car-logos/mercedes-benz-logo.png",
  "mercedes-benz": "https://www.carlogos.org/car-logos/mercedes-benz-logo.png",
};

type Size = "sm" | "md" | "lg";

const IMG_SIZE: Record<Size, string> = {
  sm: "h-14 w-20",
  md: "h-20 w-28",
  lg: "h-24 w-32",
};

const FALLBACK_SIZE: Record<Size, string> = {
  sm: "h-14 w-14 text-sm",
  md: "h-20 w-20 text-base",
  lg: "h-24 w-24 text-lg",
};

export function BrandLogo({
  slug,
  name,
  size = "md",
}: {
  slug: string;
  name: string;
  size?: Size;
}) {
  const url = BRAND_LOGOS[slug];
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        loading="lazy"
        decoding="async"
        className={`${IMG_SIZE[size]} object-contain`}
      />
    );
  }
  return (
    <div
      className={`grid place-items-center rounded-md bg-secondary font-bold text-secondary-foreground ${FALLBACK_SIZE[size]}`}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}
