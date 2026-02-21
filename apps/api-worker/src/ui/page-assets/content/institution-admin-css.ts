export const INSTITUTION_ADMIN_CSS = `
.ct-admin {
  --ct-stack-gap: var(--ct-space-4);
}
.ct-admin__hero {
  --ct-stack-gap: 0.9rem;
  padding: var(--ct-space-5);
  border-radius: var(--ct-radius-lg);
  border: 1px solid var(--ct-border-strong);
  background: linear-gradient(130deg, rgba(0, 39, 76, 0.95), rgba(8, 87, 162, 0.9));
  color: #f5fbff;
  box-shadow: var(--ct-shadow-card);
}
.ct-admin__hero h1 {
  margin: 0;
  font-size: clamp(1.4rem, 3vw, 2rem);
  color: #f5fbff;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
}
.ct-admin__meta-grid {
  --ct-cluster-gap: 0.5rem;
}
.ct-admin__pill {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: var(--ct-radius-pill);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: rgba(255, 255, 255, 0.14);
}
.ct-admin__layout {
  --ct-grid-gap: var(--ct-space-4);
  --ct-sidebar-width: 360px;
  min-width: 0;
}
.ct-admin__layout > * {
  min-width: 0;
}
.ct-admin__panel {
  --ct-stack-gap: 0.7rem;
  background: linear-gradient(170deg, rgba(255, 255, 255, 0.95), rgba(245, 250, 255, 0.92));
  border: 1px solid var(--ct-border-soft);
  border-radius: var(--ct-radius-lg);
  padding: var(--ct-space-4);
  min-width: 0;
}
.ct-admin__panel h2 {
  margin: 0;
  font-size: 1rem;
}
.ct-admin__panel p {
  margin: 0;
  color: var(--ct-color-ink-soft);
}
.ct-admin__grid {
  --ct-stack-gap: var(--ct-space-4);
  min-width: 0;
}
.ct-admin__form {
  --ct-stack-gap: 0.65rem;
  min-width: 0;
}
.ct-admin__form label {
  --ct-stack-gap: 0.28rem;
  display: grid;
  gap: 0.28rem;
  font-size: 0.9rem;
  color: var(--ct-color-ink);
}
.ct-admin__form input:not([type='checkbox']),
.ct-admin__form select {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid var(--ct-border-strong);
  border-radius: var(--ct-radius-md);
  padding: 0.52rem 0.62rem;
  font-size: 0.94rem;
}
.ct-admin__checkbox-row {
  font-size: 0.92rem;
}
.ct-admin__checkbox-row input[type='checkbox'] {
  margin: 0;
}
.ct-admin__form button {
  justify-self: start;
  border: none;
  border-radius: var(--ct-radius-md);
  padding: 0.52rem 0.9rem;
  font-weight: 700;
  color: #f7fbff;
  background: linear-gradient(
    115deg,
    var(--ct-color-primary-900) 0%,
    var(--ct-color-primary-700) 78%
  );
  cursor: pointer;
}
.ct-admin__button {
  border: none;
  border-radius: var(--ct-radius-sm);
  padding: 0.45rem 0.72rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: #f7fbff;
  background: linear-gradient(
    115deg,
    var(--ct-color-primary-900) 0%,
    var(--ct-color-primary-700) 78%
  );
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
  color: var(--ct-color-ink-soft);
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
  border-radius: var(--ct-radius-sm);
  background: #eef5ff;
  border: 1px solid var(--ct-border-soft);
  overflow-wrap: anywhere;
}
.ct-admin__table-wrap {
  overflow: auto;
  border: 1px solid var(--ct-border-soft);
  border-radius: var(--ct-radius-md);
  background: rgba(255, 255, 255, 0.82);
}
.ct-admin__table {
  width: 100%;
  border-collapse: collapse;
}
.ct-admin__table th,
.ct-admin__table td {
  text-align: left;
  border-bottom: 1px solid var(--ct-border-soft);
  padding: 0.55rem;
  vertical-align: top;
  font-size: 0.9rem;
}
.ct-admin__empty {
  color: var(--ct-color-ink-soft);
  text-align: center;
  padding: 0.8rem 0.55rem;
}
.ct-admin__meta {
  color: var(--ct-color-ink-soft);
  font-size: 0.82rem;
}
.ct-admin__status-pill {
  display: inline-flex;
  padding: 0.14rem 0.45rem;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 700;
  border: 1px solid var(--ct-border-soft);
  background: #edf3fb;
  color: var(--ct-color-ink-soft);
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
  border-radius: var(--ct-radius-sm);
  object-fit: cover;
  border: 1px solid var(--ct-border-strong);
}
.ct-admin__template-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.2rem;
  height: 3.2rem;
  border-radius: var(--ct-radius-sm);
  border: 1px dashed var(--ct-border-strong);
  font-size: 0.72rem;
  color: var(--ct-color-ink-soft);
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
    align-items: start;
  }
}

`;
