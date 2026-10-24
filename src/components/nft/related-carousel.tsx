import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import type { Nft } from "@/types/nft";

function subscribeToWidth(callback: () => void) {
  window.addEventListener("resize", callback);

  return () => window.removeEventListener("resize", callback);
}

function getCardsPerPage() {
  if (window.innerWidth >= 1024) return 5;
  if (window.innerWidth >= 768) return 3;
  return 2;
}

export function RelatedCarousel({ items }: { items: Nft[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState({ size: 0, index: 0 });

  const cardsPerPage = useSyncExternalStore(
    subscribeToWidth,
    getCardsPerPage,
    () => 5,
  );

  const pages: Nft[][] = [];

  for (let index = 0; index < items.length; index += cardsPerPage) {
    pages.push(items.slice(index, index + cardsPerPage));
  }

  const activePage = current.size === cardsPerPage ? Math.min(current.index, Math.max(0, pages.length - 1)) : 0;

  // Re-grouping cards changes page boundaries; align the track and its status.
  useLayoutEffect(() => {
    trackRef.current?.scrollTo({ left: 0, behavior: "instant" });
  }, [cardsPerPage]);

  function goToPage(index: number) {
    const track = trackRef.current;

    if (!track) return;

    const next = Math.max(0, Math.min(index, pages.length - 1));
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    track.scrollTo({
      left: next * track.clientWidth,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Não há outros NFTs desta coleção no momento.
      </p>
    );
  }

  return (
    <div
      className="min-w-0 max-w-full"
      role="group"
      aria-roledescription="carrossel"
      aria-label="NFTs da mesma coleção"
    >
      <div
        ref={trackRef}
        role="group"
        tabIndex={0}
        aria-label="Use as setas para navegar entre os NFTs"
        className="flex w-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        onScroll={(event) => {
          const track = event.currentTarget;

          if (track.clientWidth > 0) {
            setCurrent({ size: cardsPerPage, index: Math.round(track.scrollLeft / track.clientWidth) });
          }
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;

          switch (event.key) {
            case "ArrowLeft":
              event.preventDefault();
              goToPage(activePage - 1);
              break;
            case "ArrowRight":
              event.preventDefault();
              goToPage(activePage + 1);
              break;
            case "Home":
              event.preventDefault();
              goToPage(0);
              break;
            case "End":
              event.preventDefault();
              goToPage(pages.length - 1);
              break;
          }
        }}
      >
        {pages.map((page, index) => (
          <div
            key={index}
            role="group"
            aria-label={`Página ${index + 1} de ${pages.length}`}
            className="grid min-w-0 flex-[0_0_100%] snap-start grid-cols-2 content-start gap-4 md:grid-cols-3 lg:grid-cols-5 lg:gap-6"
          >
            {page.map((item) => (
              <article key={item.id} className="min-w-0">
                <Link
                  to="/nfts/$nftId"
                  params={{ nftId: item.id }}
                  className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                >
                  <div className="rounded-xl bg-card p-1.5">
                    <img
                      src={item.image}
                      alt={item.name}
                      width={250}
                      height={250}
                      loading="lazy"
                      className="block aspect-square w-full rounded-lg object-cover"
                    />
                  </div>

                  <h3 className="mt-3 break-words text-xs font-normal md:text-sm">
                    {item.name}
                  </h3>

                  <p className="mt-1 text-sm font-bold text-primary md:text-base">
                    {item.price} ETH
                  </p>
                </Link>
              </article>
            ))}
          </div>
        ))}
      </div>

      {pages.length > 1 && (
        <div
          className="mt-4 flex items-center justify-center"
          role="group"
          aria-label="Páginas da coleção"
        >
          {pages.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Ver página ${index + 1} da coleção`}
              aria-current={activePage === index ? "true" : undefined}
              className="grid size-7 cursor-pointer place-items-center rounded bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={() => goToPage(index)}
            >
              <span
                aria-hidden="true"
                className={`size-2 rounded-full border border-primary ${
                  activePage === index ? "bg-primary" : "bg-transparent"
                }`}
              />
            </button>
          ))}
        </div>
      )}

      <p className="sr-only" role="status">
        Página {activePage + 1} de {pages.length}.
      </p>
    </div>
  );
}
