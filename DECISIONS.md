@import "tailwindcss";

:root {
  --ink: #202220;
  --muted: #6d706b;
  --paper: #f3f2ed;
  --surface: #fbfbf8;
  --line: #d9d9d2;
  --wine: #8a3f2d;
  --wine-dark: #6f3022;
  --wine-soft: #f1ded7;
  --sage: #53664e;
  --cream: #e9e5dc;
}

* {
  box-sizing: border-box;
}

html {
  background: var(--paper);
}

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
}

button,
input,
textarea,
select {
  font: inherit;
}

button {
  color: inherit;
}

button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 3px solid rgba(113, 59, 71, 0.2);
  outline-offset: 2px;
}

.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
}

.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: 250px;
  z-index: 20;
  padding: 29px 22px 24px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--line);
  background: #e8e7e1;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  padding: 0;
  border: 0;
  background: none;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.8px;
  cursor: pointer;
}

.brand-mark {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 8px;
  background: var(--wine);
  color: #fffaf4;
  font-size: 17px;
}

.main-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 57px;
}

.nav-label {
  margin: 0 12px 9px;
  color: #91867e;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.nav-item {
  min-height: 43px;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 0 13px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #5f5651;
  font-size: 14px;
  font-weight: 590;
  text-align: left;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease;
}

.nav-item:hover:not(.muted) {
  background: rgba(255, 255, 255, 0.55);
}

.nav-item.active {
  background: var(--surface);
  color: var(--wine);
  box-shadow: 0 1px 0 rgba(58, 42, 36, 0.05);
}

.nav-item.muted {
  cursor: default;
  opacity: 0.62;
}

.nav-count {
  margin-left: auto;
  color: #988d85;
  font-size: 12px;
  font-weight: 500;
}

.coming-soon {
  margin-left: auto;
  color: #a0968f;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sidebar-footer {
  margin-top: auto;
  padding: 17px 15px 15px;
  border: 1px solid rgba(113, 59, 71, 0.12);
  border-radius: 8px;
  background: rgba(251, 251, 248, 0.55);
}

.setup-copy {
  display: flex;
  justify-content: space-between;
  color: #6f655f;
  font-size: 11px;
}

.setup-copy strong {
  color: var(--wine);
}

.progress-track {
  height: 4px;
  margin: 11px 0 13px;
  overflow: hidden;
  border-radius: 10px;
  background: #d9d0c4;
}

.progress-track span {
  display: block;
  width: 72%;
  height: 100%;
  border-radius: inherit;
  background: var(--wine);
}

.sidebar-footer button {
  padding: 0;
  border: 0;
  background: none;
  color: var(--wine);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.workspace {
  grid-column: 2;
  min-width: 0;
}

.topbar {
  height: 82px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 48px;
  border-bottom: 1px solid var(--line);
  background: rgba(243, 242, 237, 0.94);
}

.topbar > div:first-child {
  display: flex;
  align-items: center;
  gap: 15px;
}

.eyebrow,
.kicker,
.section-label {
  margin: 0;
  color: #8f837b;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.store-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-left: 15px;
  border-left: 1px solid #d6cec3;
  color: #776e67;
  font-size: 11px;
}

.store-status i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #75836e;
}

.topbar-actions,
.heading-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.quiet-button,
.secondary-button {
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  cursor: pointer;
}

.quiet-button {
  height: 35px;
  padding: 0 15px;
  color: #625954;
  font-size: 12px;
  font-weight: 650;
}

.avatar {
  display: grid;
  width: 35px;
  height: 35px;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: var(--wine-soft);
  color: var(--wine);
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.mobile-nav {
  display: none;
}

.page {
  max-width: 1230px;
  margin: 0 auto;
  padding: 54px 54px 80px;
}

.page-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 30px;
  margin-bottom: 39px;
}

.page-heading h1 {
  margin: 8px 0 8px;
  font-size: clamp(34px, 3.6vw, 48px);
  font-weight: 760;
  letter-spacing: -0.04em;
  line-height: 1.05;
}

.subtitle {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
}

.primary-button,
.secondary-button {
  min-height: 43px;
  padding: 0 19px;
  font-size: 12px;
  font-weight: 720;
}

.primary-button {
  border: 1px solid var(--wine);
  border-radius: 6px;
  background: var(--wine);
  color: #fffaf5;
  cursor: pointer;
  box-shadow: none;
  transition: transform 150ms ease, background 150ms ease;
}

.primary-button:hover {
  transform: translateY(-1px);
  background: var(--wine-dark);
}

.primary-button span {
  margin-right: 5px;
  font-size: 15px;
  font-weight: 400;
}

.secondary-button {
  color: #5f5651;
  cursor: pointer;
}

.focus-card {
  min-height: 190px;
  display: flex;
  justify-content: space-between;
  padding: 31px 34px;
  border-radius: 9px;
  background: var(--wine);
  color: #fff9f3;
  overflow: hidden;
  position: relative;
}

.focus-copy {
  position: relative;
  z-index: 1;
  max-width: 560px;
}

.focus-card .section-label {
  color: #d9bfc4;
}

.focus-number {
  position: absolute;
  top: 34px;
  left: 0;
  color: #d0aeb5;
  font-size: 11px;
  font-weight: 800;
}

.focus-card h2 {
  margin: 29px 0 8px 66px;
  font-size: clamp(23px, 2.6vw, 33px);
  font-weight: 700;
  letter-spacing: -0.025em;
}

.focus-card p:last-child {
  margin: 0 0 0 67px;
  color: #d9c5c8;
  font-size: 12px;
}

.focus-action {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 21px;
}

.focus-action .price {
  color: #d9c5c8;
  font-size: 13px;
}

.focus-action button {
  min-height: 38px;
  padding: 0 17px;
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 5px;
  background: rgba(255,255,255,0.08);
  color: white;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 13px;
}

.metric-card {
  min-height: 126px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 23px 25px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
}

.metric-card p {
  margin: 0 0 8px;
  color: #877c75;
  font-size: 11px;
}

.metric-card strong {
  font-size: 26px;
  font-weight: 750;
  letter-spacing: -0.02em;
}

.metric-card span {
  margin-top: 5px;
  color: #978c84;
  font-size: 10px;
}

.metric-card.wine {
  border-color: #d5c3c6;
  background: #f0e7e7;
}

.metric-card.wine strong {
  color: var(--wine);
}

.two-columns {
  display: grid;
  grid-template-columns: 1.08fr 0.92fr;
  gap: 13px;
  margin-top: 13px;
}

.panel {
  padding: 26px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(251,251,248,0.78);
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 17px;
}

.panel-heading h3 {
  margin: 7px 0 0;
  font-size: 21px;
  font-weight: 720;
}

.panel-heading > span {
  color: #998f88;
  font-size: 10px;
}

.panel-heading button {
  padding: 0;
  border: 0;
  background: none;
  color: var(--wine);
  font-size: 10px;
  font-weight: 750;
  cursor: pointer;
}

.task {
  width: 100%;
  display: grid;
  grid-template-columns: 27px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 13px 0;
  border: 0;
  border-top: 1px solid #e4ddd3;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.task-check {
  display: grid;
  width: 18px;
  height: 18px;
  place-items: center;
  border: 1px solid #c9beb3;
  border-radius: 50%;
  color: white;
  font-size: 9px;
}

.task-check.checked {
  border-color: var(--sage);
  background: var(--sage);
}

.task strong,
.stock-product strong {
  display: block;
  font-size: 12px;
  font-weight: 680;
}

.task small,
.stock-product span {
  display: block;
  margin-top: 4px;
  color: #948981;
  font-size: 10px;
}

.task i {
  color: #a79d96;
  font-style: normal;
}

.stock-product {
  display: grid;
  grid-template-columns: 45px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 13px 0;
  border-top: 1px solid #e4ddd3;
}

.low-stock {
  padding: 4px 7px;
  border-radius: 5px;
  background: #eee0d5;
  color: #915638;
  font-size: 9px;
  font-style: normal;
  font-weight: 700;
}

.catalog-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.catalog-toolbar label {
  width: min(340px, 100%);
}

.catalog-toolbar input {
  width: 100%;
  height: 43px;
  padding: 0 15px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  color: var(--ink);
  font-size: 12px;
}

.catalog-toolbar input::placeholder {
  color: #aaa097;
}

.filter-pills {
  display: flex;
  gap: 5px;
}

.filter-pills button,
.category-row button {
  border: 0;
  background: transparent;
  color: #776d66;
  cursor: pointer;
}

.filter-pills button {
  min-height: 33px;
  padding: 0 11px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 680;
}

.filter-pills button.selected {
  background: #e9e1d7;
  color: var(--wine);
}

.filter-pills span {
  margin-left: 4px;
  opacity: 0.65;
}

.product-table {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: minmax(240px, 1.6fr) minmax(100px, 0.6fr) minmax(90px, 0.5fr) minmax(120px, 0.7fr) 30px;
  align-items: center;
  gap: 14px;
}

.table-head {
  min-height: 43px;
  padding: 0 20px;
  border-bottom: 1px solid var(--line);
  background: #f0ebe3;
  color: #8d827a;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.table-row {
  min-height: 80px;
  padding: 0 20px;
  border-bottom: 1px solid #e7e0d7;
  font-size: 12px;
}

.table-row:last-child {
  border-bottom: 0;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 13px;
}

.product-cell strong {
  display: block;
  font-size: 12px;
}

.product-cell span {
  display: block;
  margin-top: 4px;
  color: #92877f;
  font-size: 10px;
}

.status-pill {
  width: fit-content;
  padding: 5px 8px;
  border-radius: 50px;
  background: #e7ece4;
  color: #556550;
  font-size: 9px;
  font-weight: 700;
}

.status-pill.warning {
  background: #eee1d7;
  color: #915638;
}

.more-button {
  border: 0;
  background: none;
  color: #887e77;
  cursor: pointer;
}

.product-art {
  position: relative;
  min-height: 255px;
  overflow: hidden;
  border-radius: 7px;
  background: linear-gradient(145deg, #c79b84, #b98166);
  color: rgba(255,255,255,0.88);
}

.product-art.plum { background: linear-gradient(145deg, #82616a, #694650); }
.product-art.olive { background: linear-gradient(145deg, #7d866e, #626b55); }
.product-art.sand { background: linear-gradient(145deg, #b99772, #947553); }

.product-art > span {
  position: absolute;
  left: 24px;
  bottom: 22px;
  z-index: 2;
  font-size: 26px;
  font-weight: 780;
  letter-spacing: -0.04em;
}

.product-art > i,
.product-art > b {
  display: none;
}

.product-art > i {
  width: 180px;
  height: 180px;
  top: -30px;
  right: -45px;
}

.product-art > b {
  width: 95px;
  height: 95px;
  top: 45px;
  right: 15px;
}

.product-art.compact {
  min-height: 45px;
  width: 45px;
  border-radius: 5px;
}

.product-art > img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.product-art.compact > span {
  left: 8px;
  bottom: 7px;
  font-size: 12px;
}

.product-art.compact > i {
  width: 32px;
  height: 32px;
  top: -8px;
  right: -7px;
}

.product-art.compact > b {
  display: none;
}

.store-preview {
  min-height: calc(100vh - 82px);
  background: #dfd8ce;
  padding: 18px;
}

.preview-bar {
  height: 42px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  max-width: 1120px;
  margin: 0 auto;
  color: #756b65;
  font-size: 10px;
}

.preview-bar button {
  width: fit-content;
  padding: 0;
  border: 0;
  background: none;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.preview-bar button:last-child {
  justify-self: end;
  color: var(--wine);
}

.store-page {
  position: relative;
  max-width: 1120px;
  min-height: 760px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 9px;
  background: #f7f7f3;
  box-shadow: 0 18px 55px rgba(51, 39, 32, 0.11);
}

.store-header {
  height: 78px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 44px;
  border-bottom: 1px solid #deded7;
}

.store-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.store-brand > span {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid #b9bbb4;
  border-radius: 6px;
  color: var(--wine);
  font-weight: 800;
  font-size: 12px;
}

.store-brand strong,
.store-brand small {
  display: block;
}

.store-brand strong {
  font-size: 16px;
  font-weight: 760;
}

.store-brand small {
  margin-top: 3px;
  color: #8b7d74;
  font-size: 9px;
}

.cart-button {
  min-height: 37px;
  padding: 0 13px;
  border: 1px solid #d5c8bb;
  border-radius: 8px;
  background: transparent;
  font-size: 10px;
  font-weight: 700;
}

.cart-button span {
  display: inline-grid;
  width: 18px;
  height: 18px;
  place-items: center;
  margin-left: 5px;
  border-radius: 50%;
  background: var(--wine);
  color: white;
  font-size: 8px;
}

.store-hero {
  min-height: 250px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 290px;
  align-items: end;
  gap: 50px;
  padding: 42px 45px;
  position: relative;
  overflow: hidden;
  background: #dce4d8;
}

.store-hero p {
  margin: 0 0 14px;
  color: #53634f;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.store-hero h1 {
  position: relative;
  z-index: 1;
  margin: 0;
  max-width: 650px;
  color: #263026;
  font-size: clamp(34px, 4.7vw, 56px);
  font-weight: 790;
  letter-spacing: -0.055em;
  line-height: 0.98;
}

.store-hero > span {
  display: block;
}

.store-hero > div > span {
  display: block;
  max-width: 420px;
  margin-top: 18px;
  color: #657064;
  font-size: 11px;
  line-height: 1.5;
}

.store-hero dl {
  margin: 0;
  border-top: 1px solid rgba(64, 83, 61, 0.22);
}

.store-hero dl > div {
  display: grid;
  grid-template-columns: 85px 1fr;
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid rgba(64, 83, 61, 0.22);
}

.store-hero dt,
.store-hero dd {
  margin: 0;
  font-size: 10px;
}

.store-hero dt {
  color: #718070;
}

.store-hero dd {
  color: #394638;
  font-weight: 720;
}

.store-content {
  padding: 30px 44px 110px;
}

.category-row {
  display: flex;
  gap: 24px;
  margin-bottom: 23px;
  border-bottom: 1px solid #e2d8cc;
}

.category-row button {
  padding: 0 0 10px;
  font-size: 10px;
}

.category-row button.active {
  border-bottom: 2px solid var(--wine);
  color: var(--wine);
  font-weight: 750;
}

.store-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.store-product p {
  margin: 13px 0 6px;
  color: #95877e;
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.store-product h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.store-product > div:last-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 11px;
}

.store-product strong {
  color: var(--wine);
  font-size: 12px;
}

.store-product button {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 1px solid #d4c4b7;
  border-radius: 50%;
  background: transparent;
  color: var(--wine);
  cursor: pointer;
}

.cart-dock {
  position: absolute;
  right: 28px;
  bottom: 25px;
  left: 28px;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 17px 15px 21px;
  border-radius: 11px;
  background: #342a27;
  color: #fffaf4;
  box-shadow: 0 12px 30px rgba(42, 29, 25, 0.2);
}

.cart-dock span,
.cart-dock strong {
  display: block;
}

.cart-dock span {
  color: #cfc1b8;
  font-size: 9px;
}

.cart-dock strong {
  margin-top: 3px;
  font-size: 18px;
  font-weight: 760;
}

.cart-dock button {
  min-height: 38px;
  padding: 0 17px;
  border: 0;
  border-radius: 7px;
  background: #f4ece3;
  color: #3a2d29;
  font-size: 10px;
  font-weight: 750;
  cursor: pointer;
}

.drawer-layer {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  justify-content: flex-end;
  background: rgba(24, 25, 23, 0.38);
}

.drawer {
  width: min(490px, 100%);
  height: 100%;
  overflow-y: auto;
  padding: 29px 32px;
  background: #f8f8f4;
  box-shadow: -12px 0 35px rgba(31, 33, 30, 0.12);
  animation: slide-in 210ms ease-out;
}

@keyframes slide-in {
  from { transform: translateX(35px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.drawer-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--line);
}

.drawer-heading h2 {
  margin: 0 0 6px;
  font-size: 25px;
  font-weight: 760;
  letter-spacing: -0.025em;
}

.drawer-heading span {
  color: var(--muted);
  font-size: 12px;
}

.drawer-heading button {
  display: grid;
  width: 31px;
  height: 31px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: transparent;
  color: #7b7069;
  font-size: 20px;
  cursor: pointer;
}

.drawer form {
  padding-top: 22px;
}

.image-picker {
  min-height: 92px;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
  padding: 14px;
  border: 1px solid #d1d1ca;
  border-radius: 7px;
  background: #eeeeE8;
  cursor: pointer;
}

.image-picker input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.image-picker-icon {
  display: grid;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  place-items: center;
  border-radius: 5px;
  background: var(--wine-soft);
  color: var(--wine);
  font-size: 20px;
}

.image-picker strong,
.image-picker small {
  display: block;
}

.image-picker strong {
  font-size: 12px;
}

.image-picker small {
  margin-top: 5px;
  color: #83867f;
  font-size: 10px;
}

.image-picker.has-image {
  position: relative;
  min-height: 175px;
  padding: 0;
  overflow: hidden;
  background: #e6e5df;
}

.image-picker.has-image img {
  width: 100%;
  height: 175px;
  display: block;
  object-fit: cover;
}

.image-picker-action {
  position: absolute;
  right: 10px;
  bottom: 10px;
  padding: 8px 10px;
  border-radius: 5px;
  background: rgba(31, 33, 30, 0.88);
  color: white;
  font-size: 10px;
  font-weight: 700;
}

.image-file-name,
.field-error {
  margin: -14px 0 18px;
  font-size: 10px;
}

.image-file-name {
  color: #777a74;
}

.field-error {
  color: #9a3324;
}

.field {
  display: block;
  margin-bottom: 18px;
}

.field > span {
  display: flex;
  justify-content: space-between;
  margin-bottom: 7px;
  color: #665c56;
  font-size: 10px;
  font-weight: 720;
}

.field > span i {
  color: #a39891;
  font-style: normal;
  font-weight: 500;
}

.field input,
.field textarea,
.field select {
  width: 100%;
  border: 1px solid #d7cec4;
  border-radius: 6px;
  background: #fff;
  color: var(--ink);
  font-size: 12px;
}

.field input,
.field select {
  height: 43px;
  padding: 0 12px;
}

.field textarea {
  min-height: 88px;
  padding: 12px;
  resize: vertical;
}

.field small {
  display: block;
  margin-top: 6px;
  color: #9b9089;
  font-size: 9px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.money-input {
  display: flex;
  align-items: center;
  height: 43px;
  overflow: hidden;
  border: 1px solid #d7cec4;
  border-radius: 6px;
  background: #fff;
}

.money-input i {
  padding-left: 12px;
  color: #8e837b;
  font-size: 10px;
  font-style: normal;
}

.money-input input {
  border: 0;
  background: transparent;
}

.toggle-row {
  min-height: 66px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 12px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.toggle-row strong,
.toggle-row small {
  display: block;
}

.toggle-row strong {
  font-size: 11px;
}

.toggle-row small {
  margin-top: 4px;
  color: #91867f;
  font-size: 9px;
}

.toggle-row input {
  width: 33px;
  height: 18px;
  accent-color: var(--wine);
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  padding-top: 22px;
}

.toast {
  position: fixed;
  right: 25px;
  bottom: 25px;
  z-index: 80;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 17px;
  border-radius: 6px;
  background: #342d29;
  color: white;
  box-shadow: 0 12px 30px rgba(30,22,18,0.19);
  font-size: 11px;
}

.toast span {
  display: grid;
  width: 18px;
  height: 18px;
  place-items: center;
  border-radius: 4px;
  background: #66745f;
  font-size: 9px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 920px) {
  .app-shell {
    display: block;
  }

  .sidebar {
    display: none;
  }

  .workspace {
    width: 100%;
  }

  .topbar {
    height: 68px;
    padding: 0 22px;
  }

  .mobile-nav {
    position: sticky;
    top: 0;
    z-index: 15;
    display: flex;
    gap: 20px;
    padding: 0 22px;
    border-bottom: 1px solid var(--line);
    background: rgba(244, 240, 233, 0.96);
    backdrop-filter: blur(12px);
  }

  .mobile-nav button {
    height: 43px;
    padding: 0;
    border: 0;
    border-bottom: 2px solid transparent;
    background: none;
    color: #827770;
    font-size: 11px;
    font-weight: 650;
  }

  .mobile-nav button.active {
    border-bottom-color: var(--wine);
    color: var(--wine);
  }

  .page {
    padding: 38px 25px 70px;
  }

  .two-columns {
    grid-template-columns: 1fr;
  }

  .table-head,
  .table-row {
    grid-template-columns: minmax(180px, 1.4fr) 0.6fr 0.5fr 0.6fr 20px;
  }
}

@media (max-width: 670px) {
  .topbar {
    padding: 0 17px;
  }

  .topbar > div:first-child {
    display: block;
  }

  .store-status {
    display: none;
  }

  .quiet-button {
    display: none;
  }

  .page-heading {
    display: block;
  }

  .page-heading .primary-button,
  .heading-actions {
    width: 100%;
    margin-top: 22px;
  }

  .heading-actions > * {
    flex: 1;
  }

  .focus-card {
    min-height: 245px;
    display: block;
    padding: 27px 24px;
  }

  .focus-card h2 {
    margin-left: 39px;
  }

  .focus-card p:last-child {
    margin-left: 40px;
  }

  .focus-action {
    align-items: flex-start;
    gap: 9px;
    margin: 28px 0 0 40px;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .metric-card {
    min-height: 105px;
  }

  .catalog-toolbar {
    display: block;
  }

  .catalog-toolbar label {
    display: block;
    width: 100%;
  }

  .filter-pills {
    margin-top: 12px;
    overflow-x: auto;
  }

  .product-table {
    border: 0;
    background: transparent;
    overflow: visible;
  }

  .table-head {
    display: none;
  }

  .table-row {
    grid-template-columns: 1fr auto;
    min-height: 90px;
    margin-bottom: 9px;
    padding: 14px;
    border: 1px solid var(--line);
    border-radius: 11px;
    background: var(--surface);
  }

  .table-row > strong,
  .table-row > span:not(.status-pill) {
    display: none;
  }

  .status-pill {
    justify-self: end;
  }

  .more-button {
    display: none;
  }

  .store-preview {
    min-height: calc(100vh - 68px);
    padding: 0;
  }

  .preview-bar {
    padding: 0 13px;
  }

  .preview-bar > span {
    display: none;
  }

  .store-page {
    min-height: calc(100vh - 110px);
    border-radius: 0;
  }

  .store-header {
    height: 69px;
    padding: 0 17px;
  }

  .store-brand small {
    display: none;
  }

  .store-hero {
    min-height: 230px;
    display: block;
    padding: 37px 20px;
  }

  .store-hero dl {
    margin-top: 27px;
  }

  .store-content {
    padding: 25px 17px 115px;
  }

  .category-row {
    gap: 20px;
    overflow-x: auto;
  }

  .category-row button {
    white-space: nowrap;
  }

  .store-grid {
    grid-template-columns: 1fr 1fr;
    gap: 16px 10px;
  }

  .product-art {
    min-height: 185px;
  }

  .product-art > span {
    left: 16px;
    bottom: 15px;
    font-size: 24px;
  }

  .cart-dock {
    right: 12px;
    bottom: 12px;
    left: 12px;
  }

  .drawer {
    padding: 27px 21px;
  }

  .field-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
}

@media (max-width: 410px) {
  .store-grid {
    grid-template-columns: 1fr;
  }

  .product-art {
    min-height: 245px;
  }
}
