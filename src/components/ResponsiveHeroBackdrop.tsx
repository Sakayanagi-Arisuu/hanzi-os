type ResponsiveHeroBackdropProps = {
  priority?: boolean;
};

const avifSources = [
  "/hanzi-awakening-hero-640.avif 640w",
  "/hanzi-awakening-hero-960.avif 960w",
  "/hanzi-awakening-hero-1280.avif 1280w",
  "/hanzi-awakening-hero-1693.avif 1693w",
].join(", ");

const webpSources = [
  "/hanzi-awakening-hero-640.webp 640w",
  "/hanzi-awakening-hero-960.webp 960w",
  "/hanzi-awakening-hero-1280.webp 1280w",
  "/hanzi-awakening-hero-1693.webp 1693w",
].join(", ");

export function ResponsiveHeroBackdrop({ priority = false }: ResponsiveHeroBackdropProps) {
  return (
    <picture className="hero-backdrop" aria-hidden="true">
      <source srcSet={avifSources} sizes="(max-width: 760px) 100vw, (max-width: 1280px) 90vw, 1500px" type="image/avif" />
      <source srcSet={webpSources} sizes="(max-width: 760px) 100vw, (max-width: 1280px) 90vw, 1500px" type="image/webp" />
      <img
        alt=""
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        height={929}
        src="/hanzi-awakening-hero-960.jpg"
        width={1693}
      />
    </picture>
  );
}
