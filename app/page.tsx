"use client";

import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useState,
} from "react";
import { demoProducts } from "./fixtures/demo-products";
import {
  buildOrderMessage,
  buildWhatsAppUrl,
  isProductAvailable,
} from "./order.mjs";

type View = "inicio" | "produtos" | "vitrine";

export type Product = {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  variations: string[];
  published: boolean;
  tone: string;
  initials: string;
  image?: string;
};

type CartItem = {
  productId: number;
  variation: string;
  quantity: number;
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function Home() {
  const [view, setView] = useState<View>("inicio");
  const [products, setProducts] = useState<Product[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [toast, setToast] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const cartQuantity = useMemo(
    () => cart.reduce((total, item) => total + item.quantity, 0),
    [cart],
  );

  const cartTotal = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total +
          (products.find((product) => product.id === item.productId)?.price ??
            0) *
            item.quantity,
        0,
      ),
    [cart, products],
  );

  function navigate(nextView: View) {
    setView(nextView);
    setCreating(false);
    setEditingProduct(null);
    setCheckingOut(false);
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const category = String(data.get("category") ?? "").trim();
    const price = Number(data.get("price"));
    const stock = Number(data.get("stock"));
    const image = data.get("image");
    const description = String(data.get("description") ?? "").trim();
    const variations = String(data.get("variations") ?? "")
      .split(",")
      .map((variation) => variation.trim())
      .filter(Boolean);
    const published = data.get("published") === "on";

    if (
      !name ||
      !category ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      showToast("Revise os dados obrigatórios do produto.");
      return;
    }

    const nextProduct: Product = {
        id: editingProduct?.id ?? Date.now(),
        name,
        category,
        description,
        price,
        stock,
        variations,
        published,
        tone: editingProduct?.tone ?? "sand",
        image:
          image instanceof File && image.size > 0
            ? URL.createObjectURL(image)
            : editingProduct?.image,
        initials: name
          .split(" ")
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase(),
      };

    setProducts((current) =>
      editingProduct
        ? current.map((product) =>
            product.id === editingProduct.id ? nextProduct : product,
          )
        : [...current, nextProduct],
    );
    if (editingProduct) {
      setCart((current) =>
        current.flatMap((item) => {
          if (item.productId !== editingProduct.id) return [item];
          if (!isProductAvailable(nextProduct)) return [];
          return [
            {
              ...item,
              quantity: Math.min(item.quantity, nextProduct.stock),
            },
          ];
        }),
      );
    }
    setCreating(false);
    setEditingProduct(null);
    setView("produtos");
    showToast(
      published
        ? "Produto salvo e disponível na vitrine."
        : "Produto salvo como não publicado.",
    );
  }

  function addToCart(productId: number, variation: string) {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product || !isProductAvailable(product)) {
      showToast("Este produto não está disponível.");
      return;
    }

    const existing = cart.find(
      (item) =>
        item.productId === productId && item.variation === variation,
    );
    if (existing && existing.quantity >= product.stock) {
      showToast("Você já adicionou todo o estoque disponível.");
      return;
    }

    setCart((current) =>
      existing
        ? current.map((item) =>
            item === existing ? { ...item, quantity: item.quantity + 1 } : item,
          )
        : [...current, { productId, variation, quantity: 1 }],
    );
    showToast("Adicionado ao pedido.");
  }

  async function copyStoreLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Link copiado. O catálogo desta sessão não acompanha o link.");
    } catch {
      showToast("Não foi possível copiar. Copie o endereço do navegador.");
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate("inicio")} aria-label="Ir para o início">
          <span className="brand-mark">f.</span>
          <span>feita</span>
        </button>

        <nav className="main-nav" aria-label="Navegação principal">
          <p className="nav-label">Seu negócio</p>
          <NavButton active={view === "inicio"} onClick={() => navigate("inicio")}>
            Visão de hoje
          </NavButton>
          <NavButton active={view === "produtos"} onClick={() => navigate("produtos")}>
            Produtos
            <span className="nav-count">{products.length}</span>
          </NavButton>
          <NavButton active={view === "vitrine"} onClick={() => navigate("vitrine")}>
            Minha vitrine
          </NavButton>
          <button className="nav-item muted" type="button">
            Pedidos
            <span className="coming-soon">em breve</span>
          </button>
          <button className="nav-item muted" type="button">
            Financeiro
            <span className="coming-soon">em breve</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="setup-copy">
            <span>Configuração da loja</span>
            <strong>72%</strong>
          </div>
          <div className="progress-track">
            <span />
          </div>
          <button type="button">Continuar configuração →</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Papelaria da Rafa</p>
            <span className="store-status">
              <i /> Loja aberta
            </span>
          </div>
          <div className="topbar-actions">
            <button className="quiet-button" onClick={() => navigate("vitrine")}>
              Ver loja
            </button>
            <button className="avatar" type="button" aria-label="Abrir perfil">
              RP
            </button>
          </div>
        </header>

        <div className="mobile-nav">
          <button className={view === "inicio" ? "active" : ""} onClick={() => navigate("inicio")}>
            Hoje
          </button>
          <button
            className={view === "produtos" ? "active" : ""}
            onClick={() => navigate("produtos")}
          >
            Produtos
          </button>
          <button
            className={view === "vitrine" ? "active" : ""}
            onClick={() => navigate("vitrine")}
          >
            Vitrine
          </button>
        </div>

        {demoMode && (
          <div className="demo-banner" role="note">
            Catálogo fictício para teste local. Cadastre os produtos reais antes
            da rodada com a comerciante.
          </div>
        )}

        {view === "inicio" && (
          <Dashboard
            products={products}
            onCreate={() => setCreating(true)}
            onViewProducts={() => navigate("produtos")}
          />
        )}

        {view === "produtos" && (
          <Products
            products={products}
            onCreate={() => setCreating(true)}
            onEdit={setEditingProduct}
            onLoadDemo={
              process.env.NODE_ENV === "development"
                ? () => {
                    setProducts(demoProducts);
                    setDemoMode(true);
                  }
                : undefined
            }
            onViewStore={() => navigate("vitrine")}
          />
        )}

        {view === "vitrine" && (
          <Storefront
            products={products}
            cartQuantity={cartQuantity}
            cartTotal={cartTotal}
            onBack={() => navigate("inicio")}
            onAdd={addToCart}
            onCopyLink={copyStoreLink}
            onOpenCart={() => setCheckingOut(true)}
          />
        )}
      </section>

      {(creating || editingProduct) && (
        <ProductDrawer
          key={editingProduct?.id ?? "new"}
          product={editingProduct}
          onClose={() => {
            setCreating(false);
            setEditingProduct(null);
          }}
          onSave={saveProduct}
        />
      )}

      {checkingOut && (
        <OrderDrawer
          products={products}
          cart={cart}
          cartTotal={cartTotal}
          onClose={() => setCheckingOut(false)}
          onChangeQuantity={(target, quantity) => {
            setCart((current) =>
              quantity <= 0
                ? current.filter((item) => item !== target)
                : current.map((item) =>
                    item === target ? { ...item, quantity } : item,
                  ),
            );
          }}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      )}
    </main>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function Dashboard({
  products,
  onCreate,
  onViewProducts,
}: {
  products: Product[];
  onCreate: () => void;
  onViewProducts: () => void;
}) {
  const availableProducts = products.filter(isProductAvailable);
  const productsNeedingAttention = products.filter(
    (product) => !isProductAvailable(product) || product.stock <= 3,
  );

  return (
    <div className="page dashboard-page">
      <div className="page-heading">
        <div>
          <p className="kicker">Primeiro uso real</p>
          <h1>Prepare sua vitrine</h1>
          <p className="subtitle">
            Cadastre os produtos reais e faça um pedido de teste antes de
            compartilhar.
          </p>
        </div>
        <button className="primary-button" onClick={onCreate}>
          <span>＋</span> Novo produto
        </button>
      </div>

      <section className="focus-card">
        <div className="focus-copy">
          <p className="section-label">Próxima ação</p>
          <span className="focus-number">{products.length}</span>
          <h2>Revise o catálogo</h2>
          <p>Confira preço, variações, estoque e disponibilidade.</p>
        </div>
        <div className="focus-action">
          <span className="price">
            {availableProducts.length} disponíveis
          </span>
          <button type="button" onClick={onViewProducts}>
            Ver produtos →
          </button>
        </div>
      </section>

      <section className="metrics-grid">
        <Metric
          label="Cadastrados"
          value={String(products.length)}
          note="produtos nesta sessão"
          tone="wine"
        />
        <Metric
          label="Disponíveis"
          value={String(availableProducts.length)}
          note="visíveis e com estoque"
        />
        <Metric
          label="Pedem atenção"
          value={String(productsNeedingAttention.length)}
          note="ocultos ou com estoque baixo"
        />
      </section>

      <section className="two-columns">
        <article className="panel next-steps">
          <div className="panel-heading">
            <div>
              <p className="section-label">Checklist</p>
              <h3>Antes de compartilhar</h3>
            </div>
            <span>3 passos</span>
          </div>
          <Task
            checked={products.length > 0}
            title="Cadastrar os produtos reais"
            meta="Nome, preço, estoque e variações"
          />
          <Task
            checked={products.length > 0 && productsNeedingAttention.length === 0}
            title="Revisar a disponibilidade"
            meta="Itens sem estoque não entram no carrinho"
          />
          <Task
            title="Fazer um pedido completo"
            meta="Entrega, pagamento e mensagem do WhatsApp"
          />
        </article>

        <article className="panel stock-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Catálogo</p>
              <h3>Itens para revisar</h3>
            </div>
            <button type="button" onClick={onViewProducts}>
              Ver produtos
            </button>
          </div>
          {productsNeedingAttention.length > 0 ? (
            productsNeedingAttention.slice(0, 2).map((product) => (
              <div className="stock-product" key={product.id}>
                <ProductArt
                  tone={product.tone}
                  initials={product.initials}
                  image={product.image}
                  compact
                />
                <div>
                  <strong>{product.name}</strong>
                  <span>
                    {!product.published
                      ? "Não publicado"
                      : `${product.stock} unidades disponíveis`}
                  </span>
                </div>
                <i className="low-stock">
                  {product.stock === 0 ? "sem estoque" : "revisar"}
                </i>
              </div>
            ))
          ) : (
            <p className="panel-empty">
              Nenhum item precisa de atenção agora.
            </p>
          )}
        </article>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <article className={`metric-card ${tone ?? ""}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{note}</span>
    </article>
  );
}

function Task({ checked, title, meta }: { checked?: boolean; title: string; meta: string }) {
  return (
    <div className="task">
      <span className={`task-check ${checked ? "checked" : ""}`}>{checked ? "✓" : ""}</span>
      <span>
        <strong>{title}</strong>
        <small>{meta}</small>
      </span>
      <i>{checked ? "pronto" : "pendente"}</i>
    </div>
  );
}

function Products({
  products,
  onCreate,
  onEdit,
  onLoadDemo,
  onViewStore,
}: {
  products: Product[];
  onCreate: () => void;
  onEdit: (product: Product) => void;
  onLoadDemo?: () => void;
  onViewStore: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "low">("all");
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const filteredProducts = products.filter((product) => {
    const matchesQuery =
      !normalizedQuery ||
      product.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery) ||
      product.category.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && isProductAvailable(product)) ||
      (filter === "low" && product.published && product.stock <= 3);

    return matchesQuery && matchesFilter;
  });

  return (
    <div className="page products-page">
      <div className="page-heading">
        <div>
          <p className="kicker">Catálogo</p>
          <h1>Produtos</h1>
          <p className="subtitle">Cadastre, ajuste preços e acompanhe o estoque.</p>
        </div>
        <div className="heading-actions">
          <button className="secondary-button" onClick={onViewStore}>
            Ver vitrine
          </button>
          <button className="primary-button" onClick={onCreate}>
            <span>＋</span> Novo produto
          </button>
        </div>
      </div>

      <div className="catalog-toolbar">
        <label>
          <span className="sr-only">Buscar produtos</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome ou categoria"
          />
        </label>
        <div className="filter-pills">
          <button
            className={filter === "all" ? "selected" : ""}
            type="button"
            onClick={() => setFilter("all")}
          >
            Todos <span>{products.length}</span>
          </button>
          <button
            className={filter === "active" ? "selected" : ""}
            type="button"
            onClick={() => setFilter("active")}
          >
            Disponíveis
          </button>
          <button
            className={filter === "low" ? "selected" : ""}
            type="button"
            onClick={() => setFilter("low")}
          >
            Estoque baixo
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <p className="section-label">Catálogo vazio</p>
          <h2>Cadastre seu primeiro produto</h2>
          <p>
            Adicione nome, preço, estoque e as opções que a cliente precisa
            escolher.
          </p>
          <button className="primary-button" type="button" onClick={onCreate}>
            Novo produto
          </button>
          {onLoadDemo && (
            <button
              className="secondary-button"
              type="button"
              onClick={onLoadDemo}
            >
              Carregar dados fictícios de teste
            </button>
          )}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state compact">
          <h2>Nenhum produto encontrado</h2>
          <p>Limpe a busca ou escolha outro filtro.</p>
        </div>
      ) : (
        <div className="product-table">
          <div className="table-head">
            <span>Produto</span>
            <span>Preço</span>
            <span>Estoque</span>
            <span>Status</span>
            <span />
          </div>
          {filteredProducts.map((product) => (
            <div className="table-row" key={product.id}>
              <div className="product-cell">
                <ProductArt
                  tone={product.tone}
                  initials={product.initials}
                  image={product.image}
                  compact
                />
                <div>
                  <strong>{product.name}</strong>
                  <span>
                    {product.category}
                    {product.variations.length > 0
                      ? ` · ${product.variations.length} opções`
                      : ""}
                  </span>
                </div>
              </div>
              <strong>{money.format(product.price)}</strong>
              <span>{product.stock} un.</span>
              <span
                className={`status-pill ${
                  !isProductAvailable(product)
                    ? "unavailable"
                    : product.stock <= 3
                      ? "warning"
                      : ""
                }`}
              >
                {!product.published
                  ? "Não publicado"
                  : product.stock === 0
                    ? "Sem estoque"
                    : product.stock <= 3
                      ? "Estoque baixo"
                      : "Disponível"}
              </span>
              <button
                className="edit-button"
                type="button"
                onClick={() => onEdit(product)}
                aria-label={`Editar ${product.name}`}
              >
                Editar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Storefront({
  products,
  cartQuantity,
  cartTotal,
  onBack,
  onAdd,
  onCopyLink,
  onOpenCart,
}: {
  products: Product[];
  cartQuantity: number;
  cartTotal: number;
  onBack: () => void;
  onAdd: (id: number, variation: string) => void;
  onCopyLink: () => void;
  onOpenCart: () => void;
}) {
  const availableProducts = products.filter(
    (product) => product.published,
  );
  const categories = Array.from(
    new Set(availableProducts.map((product) => product.category)),
  );
  const [category, setCategory] = useState("Tudo");
  const [selectedVariations, setSelectedVariations] = useState<
    Record<number, string>
  >({});
  const visibleProducts =
    category === "Tudo"
      ? availableProducts
      : availableProducts.filter((product) => product.category === category);

  return (
    <div className="store-preview">
      <div className="preview-bar">
        <button onClick={onBack} type="button">
          ← Voltar ao painel
        </button>
        <span>Prévia da sua vitrine</span>
        <button type="button" onClick={onCopyLink}>
          Copiar link da prévia
        </button>
      </div>

      <div className="store-page">
        <header className="store-header">
          <div className="store-brand">
            <span>PR</span>
            <div>
              <strong>Papelaria da Rafa</strong>
              <small>Papelaria artesanal · Palmas, TO</small>
            </div>
          </div>
          <button
            className="cart-button"
            type="button"
            onClick={onOpenCart}
            disabled={cartQuantity === 0}
          >
            Pedido <span>{cartQuantity}</span>
          </button>
        </header>

        <section className="store-hero">
          <div>
            <p>Catálogo de agosto</p>
            <h1>Papelaria feita para usar todos os dias.</h1>
            <span>Escolha os produtos e envie seu pedido pelo WhatsApp.</span>
          </div>
          <dl>
            <div>
              <dt>Produção</dt>
              <dd>3 a 5 dias úteis</dd>
            </div>
            <div>
              <dt>Entrega</dt>
              <dd>Palmas e região</dd>
            </div>
          </dl>
        </section>

        <div className="store-content">
          <div className="category-row">
            {["Tudo", ...categories].map((candidate) => (
              <button
                className={candidate === category ? "active" : ""}
                type="button"
                onClick={() => setCategory(candidate)}
                key={candidate}
              >
                {candidate}
              </button>
            ))}
          </div>

          {availableProducts.length === 0 ? (
            <div className="store-empty">
              <h2>A vitrine ainda está sendo preparada</h2>
              <p>Os produtos disponíveis vão aparecer aqui.</p>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="store-empty">
              <h2>Nenhum produto nesta categoria</h2>
              <button type="button" onClick={() => setCategory("Tudo")}>
                Ver todos
              </button>
            </div>
          ) : (
            <section className="store-grid">
              {visibleProducts.map((product) => {
                const available = isProductAvailable(product);
                const selectedVariation =
                  selectedVariations[product.id] ??
                  product.variations[0] ??
                  "";

                return (
                  <article
                    className={`store-product ${available ? "" : "sold-out"}`}
                    key={product.id}
                  >
                    <ProductArt
                      tone={product.tone}
                      initials={product.initials}
                      image={product.image}
                    />
                    <p>{product.category}</p>
                    <h2>{product.name}</h2>
                    {product.description && (
                      <span className="product-description">
                        {product.description}
                      </span>
                    )}
                    {product.variations.length > 0 && (
                      <label className="variation-picker">
                        <span>Escolha uma opção</span>
                        <select
                          value={selectedVariation}
                          onChange={(event) =>
                            setSelectedVariations((current) => ({
                              ...current,
                              [product.id]: event.target.value,
                            }))
                          }
                          disabled={!available}
                        >
                          {product.variations.map((variation) => (
                            <option key={variation}>{variation}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div className="store-product-action">
                      <div>
                        <strong>{money.format(product.price)}</strong>
                        <small>
                          {available
                            ? `${product.stock} em estoque`
                            : "Indisponível"}
                        </small>
                      </div>
                      <button
                        onClick={() => onAdd(product.id, selectedVariation)}
                        type="button"
                        disabled={!available}
                        aria-label={
                          available
                            ? `Adicionar ${product.name}`
                            : `${product.name} indisponível`
                        }
                      >
                        {available ? "＋" : "—"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>

        {cartQuantity > 0 && (
          <div className="cart-dock">
            <div>
              <span>
                {cartQuantity} {cartQuantity === 1 ? "item" : "itens"}
              </span>
              <strong>{money.format(cartTotal)}</strong>
            </div>
            <button onClick={onOpenCart} type="button">
              Continuar pedido →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderDrawer({
  products,
  cart,
  cartTotal,
  onClose,
  onChangeQuantity,
}: {
  products: Product[];
  cart: CartItem[];
  cartTotal: number;
  onClose: () => void;
  onChangeQuantity: (item: CartItem, quantity: number) => void;
}) {
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">(
    "pickup",
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const cartLines = cart.flatMap((item) => {
    const product = products.find(
      (candidate) => candidate.id === item.productId,
    );
    return product ? [{ item, product }] : [];
  });

  function reviewOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    try {
      const nextMessage = buildOrderMessage({
        items: cartLines.map(({ item, product }) => ({
          productName: product.name,
          variation: item.variation,
          quantity: item.quantity,
          unitPrice: product.price,
        })),
        customerName: data.get("customerName"),
        fulfillment,
        address: data.get("address"),
        payment: data.get("payment"),
        notes: data.get("notes"),
      });
      setMessage(nextMessage);
      setError("");
    } catch (orderError) {
      setError(
        orderError instanceof Error
          ? orderError.message
          : "Não foi possível preparar o pedido.",
      );
    }
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setError("");
    } catch {
      setError("Não foi possível copiar a mensagem neste navegador.");
    }
  }

  return (
    <div className="drawer-layer" role="presentation" onMouseDown={onClose}>
      <aside
        className="drawer order-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="drawer-heading">
          <div>
            <h2 id="order-title">
              {message ? "Revise a mensagem" : "Finalizar pedido"}
            </h2>
            <span>
              {message
                ? "Nada será enviado sem você abrir o WhatsApp."
                : "Confira os itens e complete os dados da cliente."}
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        {message ? (
          <div className="order-review">
            <pre>{message}</pre>
            {error && (
              <p className="field-error order-error" role="alert">
                {error}
              </p>
            )}
            <div className="review-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setMessage("")}
              >
                Voltar e editar
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={copyMessage}
              >
                Copiar mensagem
              </button>
              <a
                className="primary-button"
                href={buildWhatsAppUrl(message)}
                target="_blank"
                rel="noreferrer"
              >
                Abrir WhatsApp
              </a>
            </div>
          </div>
        ) : cartLines.length === 0 ? (
          <div className="empty-state compact">
            <h2>Seu pedido está vazio</h2>
            <p>Feche esta tela e adicione um produto da vitrine.</p>
          </div>
        ) : (
          <form className="order-form" onSubmit={reviewOrder}>
            <section className="order-items" aria-label="Itens do pedido">
              {cartLines.map(({ item, product }) => (
                <div
                  className="order-line"
                  key={`${item.productId}-${item.variation}`}
                >
                  <ProductArt
                    tone={product.tone}
                    initials={product.initials}
                    image={product.image}
                    compact
                  />
                  <div>
                    <strong>{product.name}</strong>
                    <span>
                      {item.variation || "Sem variação"} ·{" "}
                      {money.format(product.price)}
                    </span>
                  </div>
                  <div className="quantity-control" aria-label="Quantidade">
                    <button
                      type="button"
                      onClick={() =>
                        onChangeQuantity(item, item.quantity - 1)
                      }
                      aria-label={`Diminuir ${product.name}`}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeQuantity(item, item.quantity + 1)
                      }
                      disabled={item.quantity >= product.stock}
                      aria-label={`Aumentar ${product.name}`}
                    >
                      +
                    </button>
                  </div>
                  <strong>{money.format(product.price * item.quantity)}</strong>
                </div>
              ))}
              <div className="order-total">
                <span>Total</span>
                <strong>{money.format(cartTotal)}</strong>
              </div>
            </section>

            <label className="field">
              <span>Nome da cliente</span>
              <input
                name="customerName"
                required
                autoComplete="name"
                placeholder="Quem está fazendo o pedido?"
              />
            </label>

            <fieldset className="choice-field">
              <legend>Como vai receber?</legend>
              <label>
                <input
                  type="radio"
                  name="fulfillment"
                  value="pickup"
                  checked={fulfillment === "pickup"}
                  onChange={() => setFulfillment("pickup")}
                />
                <span>
                  <strong>Retirada</strong>
                  <small>Combinar horário com a loja</small>
                </span>
              </label>
              <label>
                <input
                  type="radio"
                  name="fulfillment"
                  value="delivery"
                  checked={fulfillment === "delivery"}
                  onChange={() => setFulfillment("delivery")}
                />
                <span>
                  <strong>Entrega</strong>
                  <small>Informar o endereço completo</small>
                </span>
              </label>
            </fieldset>

            {fulfillment === "delivery" && (
              <label className="field">
                <span>Endereço de entrega</span>
                <textarea
                  name="address"
                  required
                  autoComplete="street-address"
                  placeholder="Rua, número, complemento e bairro"
                />
              </label>
            )}

            <label className="field">
              <span>Forma de pagamento</span>
              <select name="payment" required defaultValue="">
                <option value="" disabled>
                  Escolha uma opção
                </option>
                <option>Pix</option>
                <option>Dinheiro</option>
                <option>Cartão na entrega ou retirada</option>
              </select>
            </label>

            <label className="field">
              <span>
                Observações <i>opcional</i>
              </span>
              <textarea
                name="notes"
                placeholder="Ex.: embalagem para presente ou referência do endereço"
              />
            </label>

            {error && (
              <p className="field-error order-error" role="alert">
                {error}
              </p>
            )}

            <div className="drawer-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={onClose}
              >
                Continuar comprando
              </button>
              <button className="primary-button" type="submit">
                Revisar mensagem
              </button>
            </div>
          </form>
        )}
      </aside>
    </div>
  );
}

function ProductArt({
  tone,
  initials,
  image,
  compact,
}: {
  tone: string;
  initials: string;
  image?: string;
  compact?: boolean;
}) {
  return (
    <div className={`product-art ${tone} ${compact ? "compact" : ""}`} aria-hidden="true">
      {image ? (
        <img src={image} alt="" />
      ) : (
        <>
          <span>{initials}</span>
          <i />
          <b />
        </>
      )}
    </div>
  );
}

function ProductDrawer({
  product,
  onClose,
  onSave,
}: {
  product: Product | null;
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [imagePreview, setImagePreview] = useState(product?.image ?? "");
  const [imageName, setImageName] = useState("");
  const [imageError, setImageError] = useState("");

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      event.target.value = "";
      setImagePreview("");
      setImageName("");
      setImageError("A imagem precisa ter no máximo 5 MB.");
      return;
    }

    setImageError("");
    setImageName(file.name);

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImagePreview(typeof reader.result === "string" ? reader.result : "");
    });
    reader.readAsDataURL(file);
  }

  return (
    <div className="drawer-layer" role="presentation" onMouseDown={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-product-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="drawer-heading">
          <div>
            <h2 id="new-product-title">
              {product ? "Editar produto" : "Adicionar produto"}
            </h2>
            <span>Os dados abaixo aparecem na sua vitrine.</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <form onSubmit={onSave}>
          <label className={`image-picker ${imagePreview ? "has-image" : ""}`} htmlFor="product-image">
            <input
              id="product-image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={chooseImage}
            />
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Prévia do produto" />
                <span className="image-picker-action">Trocar imagem</span>
              </>
            ) : (
              <>
                <span className="image-picker-icon">＋</span>
                <span>
                  <strong>Escolher imagem</strong>
                  <small>JPG, PNG ou WebP · até 5 MB</small>
                </span>
              </>
            )}
          </label>
          {imageName && <p className="image-file-name">{imageName}</p>}
          {imageError && <p className="field-error">{imageError}</p>}

          <label className="field">
            <span>Nome do produto</span>
            <input
              name="name"
              required
              defaultValue={product?.name}
              placeholder="Ex.: Caderno de receitas"
              autoFocus
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Categoria</span>
              <input
                name="category"
                required
                list="product-categories"
                defaultValue={product?.category}
                placeholder="Ex.: Papelaria"
              />
              <datalist id="product-categories">
                <option value="Papelaria" />
                <option value="Organização" />
                <option value="Presentes" />
              </datalist>
            </label>
            <label className="field">
              <span>Preço</span>
              <div className="money-input">
                <i>R$</i>
                <input
                  name="price"
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={product?.price}
                  placeholder="0,00"
                />
              </div>
            </label>
          </div>

          <label className="field">
            <span>Estoque disponível</span>
            <input
              name="stock"
              required
              type="number"
              min="0"
              step="1"
              defaultValue={product?.stock ?? 1}
            />
            <small>Com estoque zero, o produto aparece como indisponível.</small>
          </label>

          <label className="field">
            <span>
              Opções ou variações <i>opcional</i>
            </span>
            <input
              name="variations"
              defaultValue={product?.variations.join(", ")}
              placeholder="Ex.: Azul, Verde, Rosa"
            />
            <small>Separe cada opção por vírgula.</small>
          </label>

          <label className="field">
            <span>Descrição curta <i>opcional</i></span>
            <textarea
              name="description"
              defaultValue={product?.description}
              placeholder="Conte em poucas palavras o que torna esse produto especial."
            />
          </label>

          <label className="toggle-row">
            <span>
              <strong>Publicar na vitrine</strong>
              <small>Desative para ocultar o produto sem apagar o cadastro.</small>
            </span>
            <input
              name="published"
              type="checkbox"
              defaultChecked={product?.published ?? true}
            />
          </label>

          <div className="drawer-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="primary-button" type="submit">
              {product ? "Salvar alterações" : "Salvar produto"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
