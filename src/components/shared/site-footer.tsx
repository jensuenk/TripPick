import { APP_VERSION } from "@/lib/version";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-sky-100/80 bg-white/50 px-5 py-4 text-center safe-pb">
      <p className="text-xs text-muted-foreground">
        © {year} TripPick · By Jens Uenk · v{APP_VERSION}
      </p>
    </footer>
  );
}
