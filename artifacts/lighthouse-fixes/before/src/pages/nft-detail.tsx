import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { ChevronLeft, Copy } from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/marketplace-header";
import { MarketplaceFooter } from "@/components/layout/marketplace-footer";
import { Button } from "@/components/ui/button";
import { parseCatalogSearch } from "@/lib/catalog-search";
import { api } from "@/lib/api";
import type { Nft, NftListResponse } from "@/types/nft";
import { PurchaseOptions } from "@/components/nft/purchase-options";
import { FavoriteButton } from "@/components/nft/favorite-button";
import { NftGallery } from "@/components/nft/nft-gallery";
import { RelatedCarousel } from "@/components/nft/related-carousel";
import { NftReviews } from "@/components/nft/nft-reviews";

function NftInformation({ nft }: { nft: Nft }) {
  const [tab, setTab] = useState<"details" | "reviews">("details");
  const [share, setShare] = useState("");
  const relatedSearch = parseCatalogSearch({ category: nft.category });
  const related = useQuery({
    queryKey: ["nfts", relatedSearch],
    queryFn: async ({ signal }) =>
      (
        await api.get<NftListResponse>("/nfts", {
          params: relatedSearch,
          signal,
        })
      ).data,
  });
  return (
    <>
      <article className="nft-overview">
        <div className="detail-mobile-topbar">
          <Link
            to="/"
            search={parseCatalogSearch({})}
            aria-label="Voltar ao catálogo"
          >
            <ChevronLeft aria-hidden="true" />
          </Link>
          <FavoriteButton nftId={nft.id} />
        </div>
        <NftGallery key={nft.id} nft={nft} />
        <div className="nft-information">
          <div className="nft-title-row">
            <h1>{nft.name}</h1>
            <NftReviews nftId={nft.id} variant="badge" />
          </div>
          <p className="detail-top-price">{nft.price} ETH</p>
          <div className="nft-description">
            <h2>Sobre este NFT:</h2>
            <p>
              Um colecionável digital da seleção Kurio, disponível na rede{" "}
              {nft.network}. Escolha sua edição e faça parte da cultura digital.
            </p>
          </div>
          <PurchaseOptions key={nft.id} nft={nft} />
          <dl className="nft-metadata">
            <div>
              <dt>ID do token:</dt>
              <dd>{nft.id}</dd>
            </div>
            <div>
              <dt>Coleção:</dt>
              <dd>{nft.category}</dd>
            </div>
            <div>
              <dt>Rede:</dt>
              <dd>{nft.network}</dd>
            </div>
          </dl>
          <div className="nft-share">
            <span>Compartilhar este NFT:</span>
            <button
              type="button"
              aria-label="Copiar link deste NFT"
              onClick={() => {
                void navigator.clipboard.writeText(window.location.href).then(
                  () => setShare("Link copiado."),
                  () => setShare("Não foi possível copiar o link."),
                );
              }}
            >
              <Copy size={16} aria-hidden="true" />
            </button>
            <span role="status">{share}</span>
          </div>
        </div>
      </article>
      <section className="nft-detail-description">
        <NftReviews nftId={nft.id} variant="summary" />
        <div
          className="detail-tabs"
          role="tablist"
          aria-label="Informações do NFT"
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const next =
              event.key === "Home"
                ? "details"
                : event.key === "End"
                  ? "reviews"
                  : tab === "details"
                    ? "reviews"
                    : "details";
            setTab(next);
            event.currentTarget
              .querySelector<HTMLButtonElement>(`#nft-${next}-tab`)
              ?.focus();
          }}
        >
          <button
            id="nft-details-tab"
            type="button"
            role="tab"
            tabIndex={tab === "details" ? 0 : -1}
            aria-selected={tab === "details"}
            aria-controls="nft-description-panel"
            onClick={() => setTab("details")}
          >
            Detalhes do NFT
          </button>
          <button
            id="nft-reviews-tab"
            type="button"
            role="tab"
            tabIndex={tab === "reviews" ? 0 : -1}
            aria-selected={tab === "reviews"}
            aria-controls="nft-description-panel"
            onClick={() => setTab("reviews")}
          >
            Avaliações de colecionadores
          </button>
        </div>
        <div
          id="nft-description-panel"
          role="tabpanel"
          aria-labelledby={
            tab === "details" ? "nft-details-tab" : "nft-reviews-tab"
          }
        >
          {tab === "details" ? (
            <>
              <p>
                {nft.name} faz parte da seleção de {nft.category.toLowerCase()}{" "}
                da Kurio. Explore os detalhes da obra e escolha entre as edições
                disponíveis para sua coleção.
              </p>
              <p>
                Confira a disponibilidade antes de adicionar ao carrinho. Os
                preços, quantidades e taxas são revalidados na cotação da
                compra.
              </p>
              <h3>Rede:</h3>
              <p>{nft.network}</p>
              <h3>Edições:</h3>
              <p>{nft.editions.map((edition) => edition.name).join(" · ")}</p>
              <h3>Procedência:</h3>
              <p>
                NFT e transações simulados para esta demonstração. Não há
                contrato real de blockchain.
              </p>
            </>
          ) : (
            <NftReviews nftId={nft.id} variant="comments" />
          )}
        </div>
      </section>
      <section className="related-nfts" aria-labelledby="related-title">
        <h2 id="related-title">Mais desta coleção</h2>

        {related.isPending && (
          <div
            className="catalog-shimmer h-48 rounded-xl"
            role="status"
            aria-label="Carregando coleção"
          />
        )}

        {related.isError && (
          <div role="alert">
            <p>Não foi possível carregar a coleção.</p>

            <Button onClick={() => void related.refetch()}>
              Tentar novamente
            </Button>
          </div>
        )}

        {related.data && (
          <RelatedCarousel
            key={nft.id}
            items={related.data.items.filter((item) => item.id !== nft.id)}
          />
        )}
      </section>
    </>
  );
}

export function NftDetailPage() {
  const { nftId } = useParams({ from: "/nfts/$nftId" });
  const {
    data: nft,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["nft", nftId],
    queryFn: async ({ signal }) =>
      (await api.get<Nft>(`/nfts/${encodeURIComponent(nftId)}`, { signal }))
        .data,
  });
  const notFound = axios.isAxiosError(error) && error.response?.status === 404;
  return (
    <div className="marketplace nft-page">
      <MarketplaceHeader detail />
      <main className="market-container nft-main">
        <nav className="nft-breadcrumb" aria-label="Caminho de navegação">
          <Link to="/" search={parseCatalogSearch({})}>
            Início
          </Link>
          <span>/</span>
          <Link to="/" search={parseCatalogSearch({})} hash="catalogo">
            Mercado
          </Link>
        </nav>
        {isPending && (
          <div role="status" className="detail-skeleton">
            <span className="sr-only">Carregando detalhes do NFT</span>
            <div
              aria-hidden="true"
              className="catalog-shimmer aspect-square rounded-2xl"
            />
            <div
              aria-hidden="true"
              className="catalog-shimmer h-64 rounded-2xl"
            />
          </div>
        )}
        {isError && (
          <section role="alert" className="market-error">
            <h1>
              {notFound
                ? "NFT não encontrado"
                : "Não foi possível carregar este NFT"}
            </h1>
            <p>
              {notFound
                ? "Este endereço não corresponde a um NFT disponível."
                : "Verifique sua conexão e tente novamente."}
            </p>
            {!notFound && (
              <Button onClick={() => void refetch()}>Tentar novamente</Button>
            )}
            <Link to="/" search={parseCatalogSearch({})}>
              Voltar ao catálogo
            </Link>
          </section>
        )}
        {nft && <NftInformation key={nft.id} nft={nft} />}
      </main>
      <MarketplaceFooter />
    </div>
  );
}
