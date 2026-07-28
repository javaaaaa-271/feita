"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";

type View = "inicio" | "produtos" | "vitrine";

type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  tone: string;
  initials: string;
  image?: string;
};

const starterProducts: Product[] = [
  {
    id: 1,
    name: "Caderno Jardim",
    category: "Papelaria",
    price: 54,
    stock: 8,
    tone: "clay",
    initials: "CJ",
  },
  {
    id: 2,
    name: "Planner Semanal",
    category: "Organização",
    price: 42,
    stock: 3,
    tone: "plum",
    initials: "PS",
  },
  {
    id: 3,
    name: "Cartão Presente",
    category: "Presentes",
    price: 18,
    stock: 14,
    tone: "olive",
    initials: "CP",
  },
];

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function Home() {
  const [view, setView] = useState<View>("inicio");
  const [products, setProducts] = useState(starterProducts);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState("");
  const [cart, setCart] = useState<number[]>([]);

  const cartTotal = useMemo(
    () =>
      cart.reduce(
        (total, productId) =>
          total + (products.find((product) => product.id === productId)?.price ?? 0),
        0,
      ),
    [cart, products],
  );

  function navigate(nextView: View) {
    setView(nextView);
    setCreating(false);
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

    if (!name || !category || !Number.isFinite(price)) return;

    setProducts((current) => [
      ...current,
      {
        id: Date.now(),
        name,
        category,
        price,
        stock: Number.isFinite(stock) ? stock : 0,
        tone: "sand",
        image:
          image instanceof File && image.size > 0
            ? URL.createObjectURL(image)
            : undefined,
        initials: name
          .split(" ")
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase(),
      },
    ]);
    setCreating(false);
    setView("produtos");
    showToast("Produto publicado na sua vitrine.");
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
            onViewStore={() => navigate("vitrine")}
          />
        )}

        {view === "vitrine" && (
          <Storefront
            products={products}
            cart={cart}
            cartTotal={cartTotal}
            onBack={() => navigate("inicio")}
            onAdd={(productId) => {
              setCart((current) => [...current, productId]);
              showToast("Adicionado ao pedido.");
            }}
            onFinish={() => showToast("Pedido preparado para enviar no WhatsApp.")}
          />
        )}
      </section>

      {creating && <ProductDrawer onClose={() => setCreating(false)} onSave={saveProduct} />}

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
  return (
    <div className="page dashboard-page">
      <div className="page-heading">
        <div>
          <p className="kicker">Terça, 28 de julho</p>
          <h1>Hoje na sua loja</h1>
          <p className="subtitle">1 pedido para preparar e 3 pagamentos para acompanhar.</p>
        </div>
        <button className="primary-button" onClick={onCreate}>
          <span>＋</span> Novo produto
        </button>
      </div>

      <section className="focus-card">
        <div className="focus-copy">
          <p className="section-label">Próximo pedido</p>
          <span className="focus-number">#1042</span>
          <h2>Ana Clara · R$ 96,00</h2>
          <p>
            Retirada amanhã · pagamento confirmado
          </p>
        </div>
        <div className="focus-action">
          <span className="price">{money.format(96)}</span>
          <button type="button">Ver pedido →</button>
        </div>
      </section>

      <section className="metrics-grid">
        <Metric
          label="A receber"
          value={money.format(284)}
          note="em 3 pedidos"
          tone="wine"
        />
        <Metric label="Vendas no mês" value={money.format(1268)} note="12 vendas" />
        <Metric label="Visitas na vitrine" value="87" note="+18% esta semana" />
      </section>

      <section className="two-columns">
        <article className="panel next-steps">
          <div className="panel-heading">
            <div>
              <p className="section-label">Hoje</p>
              <h3>Próximos passos</h3>
            </div>
            <span>3 pendências</span>
          </div>
          <Task checked title="Confirmar pagamento de Ana" meta="Pedido #1042 · Pix" />
          <Task title="Repor Planner Semanal" meta="Restam 3 unidades" />
          <Task title="Enviar pedido de Júlia" meta="Entrega prevista para hoje" />
        </article>

        <article className="panel stock-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Catálogo</p>
              <h3>Estoque pede atenção</h3>
            </div>
            <button type="button" onClick={onViewProducts}>
              Ver produtos
            </button>
          </div>
          <div className="stock-product">
            <ProductArt tone="plum" initials="PS" compact />
            <div>
              <strong>Planner Semanal</strong>
              <span>3 unidades disponíveis</span>
            </div>
            <i className="low-stock">baixo</i>
          </div>
          <div className="stock-product">
            <ProductArt tone="clay" initials="CJ" compact />
            <div>
              <strong>{products[0]?.name ?? "Caderno Jardim"}</strong>
              <span>{products[0]?.stock ?? 0} unidades disponíveis</span>
            </div>
          </div>
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
    <button className="task" type="button">
      <span className={`task-check ${checked ? "checked" : ""}`}>{checked ? "✓" : ""}</span>
      <span>
        <strong>{title}</strong>
        <small>{meta}</small>
      </span>
      <i>→</i>
    </button>
  );
}

function Products({
  products,
  onCreate,
  onViewStore,
}: {
  products: Product[];
  onCreate: () => void;
  onViewStore: () => void;
}) {
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
          <input placeholder="Buscar por nome ou categoria" />
        </label>
        <div className="filter-pills">
          <button className="selected" type="button">
            Todos <span>{products.length}</span>
          </button>
          <button type="button">Ativos</button>
          <button type="button">Estoque baixo</button>
        </div>
      </div>

      <div className="product-table">
        <div className="table-head">
          <span>Produto</span>
          <span>Preço</span>
          <span>Estoque</span>
          <span>Status</span>
          <span />
        </div>
        {products.map((product) => (
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
                <span>{product.category}</span>
              </div>
            </div>
            <strong>{money.format(product.price)}</strong>
            <span>{product.stock} un.</span>
            <span className={`status-pill ${product.stock <= 3 ? "warning" : ""}`}>
              {product.stock <= 3 ? "Estoque baixo" : "Publicado"}
            </span>
            <button className="more-button" type="button" aria-label={`Mais opções para ${product.name}`}>
              ···
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Storefront({
  products,
  cart,
  cartTotal,
  onBack,
  onAdd,
  onFinish,
}: {
  products: Product[];
  cart: number[];
  cartTotal: number;
  onBack: () => void;
  onAdd: (id: number) => void;
  onFinish: () => void;
}) {
  return (
    <div className="store-preview">
      <div className="preview-bar">
        <button onClick={onBack} type="button">
          ← Voltar ao painel
        </button>
        <span>Prévia da sua vitrine</span>
        <button type="button">Copiar link</button>
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
          <button className="cart-button" type="button">
            Pedido <span>{cart.length}</span>
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
            <button className="active" type="button">Tudo</button>
            <button type="button">Papelaria</button>
            <button type="button">Organização</button>
            <button type="button">Presentes</button>
          </div>

          <section className="store-grid">
            {products.map((product) => (
              <article className="store-product" key={product.id}>
                <ProductArt
                  tone={product.tone}
                  initials={product.initials}
                  image={product.image}
                />
                <p>{product.category}</p>
                <h2>{product.name}</h2>
                <div>
                  <strong>{money.format(product.price)}</strong>
                  <button onClick={() => onAdd(product.id)} type="button" aria-label={`Adicionar ${product.name}`}>
                    ＋
                  </button>
                </div>
              </article>
            ))}
          </section>
        </div>

        {cart.length > 0 && (
          <div className="cart-dock">
            <div>
              <span>{cart.length} {cart.length === 1 ? "item" : "itens"}</span>
              <strong>{money.format(cartTotal)}</strong>
            </div>
            <button onClick={onFinish} type="button">
              Continuar pedido →
            </button>
          </div>
        )}
      </div>
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
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [imagePreview, setImagePreview] = useState("");
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
            <h2 id="new-product-title">Adicionar produto</h2>
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
            <input name="name" required placeholder="Ex.: Caderno de receitas" autoFocus />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Categoria</span>
              <select name="category" defaultValue="Papelaria">
                <option>Papelaria</option>
                <option>Organização</option>
                <option>Presentes</option>
                <option>Outro</option>
              </select>
            </label>
            <label className="field">
              <span>Preço</span>
              <div className="money-input">
                <i>R$</i>
                <input name="price" required type="number" step="0.01" min="0" placeholder="0,00" />
              </div>
            </label>
          </div>

          <label className="field">
            <span>Estoque disponível</span>
            <input name="stock" type="number" min="0" defaultValue="1" />
            <small>Você poderá ativar variações e estoque mínimo depois.</small>
          </label>

          <label className="field">
            <span>Descrição curta <i>opcional</i></span>
            <textarea placeholder="Conte em poucas palavras o que torna esse produto especial." />
          </label>

          <label className="toggle-row">
            <span>
              <strong>Publicar na vitrine</strong>
              <small>O produto ficará visível assim que for salvo.</small>
            </span>
            <input type="checkbox" defaultChecked />
          </label>

          <div className="drawer-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="primary-button" type="submit">
              Salvar produto
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
