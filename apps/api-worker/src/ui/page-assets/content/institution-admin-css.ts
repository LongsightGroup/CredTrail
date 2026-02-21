export const INSTITUTION_ADMIN_CSS = `
.ct-admin {
  display: grid;
  gap: 1rem;
}
.ct-admin__hero {
  display: grid;
  gap: 0.9rem;
  padding: 1.2rem;
  border-radius: 1rem;
  border: 1px solid rgba(0, 39, 76, 0.22);
  background: linear-gradient(130deg, rgba(0, 39, 76, 0.95), rgba(8, 87, 162, 0.9));
  color: #f5fbff;
  box-shadow: 0 14px 28px rgba(0, 25, 51, 0.24);
}
.ct-admin__hero h1 {
  margin: 0;
  font-size: clamp(1.4rem, 3vw, 2rem);
  color: #f5fbff;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
}
.ct-admin__meta-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.ct-admin__pill {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: rgba(255, 255, 255, 0.14);
}
.ct-admin__layout {
  display: grid;
  gap: 1rem;
  min-width: 0;
}
.ct-admin__layout > * {
  min-width: 0;
}
.ct-admin__panel {
  display: grid;
  gap: 0.7rem;
  background: linear-gradient(170deg, rgba(255, 255, 255, 0.95), rgba(245, 250, 255, 0.92));
  border: 1px solid rgba(0, 39, 76, 0.14);
  border-radius: 1rem;
  padding: 1rem;
  min-width: 0;
}
.ct-admin__panel h2 {
  margin: 0;
  font-size: 1rem;
}
.ct-admin__panel p {
  margin: 0;
  color: #355577;
}
.ct-admin__grid {
  display: grid;
  gap: 1rem;
  min-width: 0;
}
.ct-admin__form {
  display: grid;
  gap: 0.65rem;
  min-width: 0;
}
.ct-admin__form label {
  display: grid;
  gap: 0.28rem;
  font-size: 0.9rem;
  color: #183a61;
}
.ct-admin__form input:not([type='checkbox']),
.ct-admin__form select {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid rgba(0, 39, 76, 0.26);
  border-radius: 0.65rem;
  padding: 0.52rem 0.62rem;
  font-size: 0.94rem;
}
.ct-admin__checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.92rem;
}
.ct-admin__checkbox-row input[type='checkbox'] {
  width: 1rem;
  height: 1rem;
  margin: 0;
  accent-color: #0a4c8f;
}
.ct-admin__form button {
  justify-self: start;
  border: none;
  border-radius: 0.7rem;
  padding: 0.52rem 0.9rem;
  font-weight: 700;
  color: #f7fbff;
  background: linear-gradient(115deg, #00274c 0%, #0a4c8f 78%);
  cursor: pointer;
}
.ct-admin__button {
  border: none;
  border-radius: 0.6rem;
  padding: 0.45rem 0.72rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: #f7fbff;
  background: linear-gradient(115deg, #00274c 0%, #0a4c8f 78%);
  cursor: pointer;
}
.ct-admin__button:disabled {
  opacity: 0.66;
  cursor: progress;
}
.ct-admin__button--tiny {
  padding: 0.3rem 0.55rem;
  font-size: 0.76rem;
}
.ct-admin__button--danger {
  background: linear-gradient(115deg, #81160b 0%, #b3261a 78%);
}
.ct-admin__status {
  margin: 0;
  font-size: 0.88rem;
  color: #355577;
}
.ct-admin__hint {
  margin: 0;
  font-size: 0.8rem;
  color: #537194;
}
.ct-admin__secret {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.4;
  padding: 0.6rem;
  border-radius: 0.6rem;
  background: #eef5ff;
  border: 1px solid rgba(0, 39, 76, 0.2);
  overflow-wrap: anywhere;
}
.ct-admin__table-wrap {
  overflow: auto;
  border: 1px solid rgba(0, 39, 76, 0.14);
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.82);
}
.ct-admin__table {
  width: 100%;
  border-collapse: collapse;
}
.ct-admin__table th,
.ct-admin__table td {
  text-align: left;
  border-bottom: 1px solid rgba(0, 39, 76, 0.13);
  padding: 0.55rem;
  vertical-align: top;
  font-size: 0.9rem;
}
.ct-admin__empty {
  color: #537194;
  text-align: center;
  padding: 0.8rem 0.55rem;
}
.ct-admin__meta {
  color: #4e6c8f;
  font-size: 0.82rem;
}
.ct-admin__status-pill {
  display: inline-flex;
  padding: 0.14rem 0.45rem;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 700;
  border: 1px solid rgba(0, 39, 76, 0.16);
  background: #edf3fb;
  color: #234f7b;
}
.ct-admin__status-pill--draft,
.ct-admin__status-pill--pending_approval {
  background: #fff6df;
  color: #7f4a0c;
  border-color: rgba(153, 97, 17, 0.25);
}
.ct-admin__status-pill--approved,
.ct-admin__status-pill--active {
  background: #e8f8ef;
  color: #0f5132;
  border-color: rgba(19, 120, 76, 0.26);
}
.ct-admin__status-pill--rejected,
.ct-admin__status-pill--deprecated {
  background: #fdf0ef;
  color: #842029;
  border-color: rgba(132, 32, 41, 0.24);
}
.ct-admin__template-image {
  width: 3.2rem;
  height: 3.2rem;
  border-radius: 0.5rem;
  object-fit: cover;
  border: 1px solid rgba(0, 39, 76, 0.24);
}
.ct-admin__template-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.2rem;
  height: 3.2rem;
  border-radius: 0.5rem;
  border: 1px dashed rgba(0, 39, 76, 0.35);
  font-size: 0.72rem;
  color: #537194;
}
.ct-admin__panel--table {
  padding: 0.9rem;
}
.ct-admin__panel--table > h2,
.ct-admin__panel--table > p,
.ct-admin__panel--table > .ct-admin__status {
  padding-inline: 0.1rem;
}
@media (min-width: 980px) {
  .ct-admin__layout {
    grid-template-columns: minmax(0, 360px) minmax(0, 1fr);
    align-items: start;
  }
}

`;
