export const AUTH_LOGIN_CSS = `
.ct-login {
  --ct-stack-gap: var(--ct-space-4);
}

.ct-login__card {
  gap: 0;
  border: 1px solid var(--ct-border-strong);
  border-radius: var(--ct-radius-lg);
  overflow: hidden;
  box-shadow: var(--ct-shadow-card);
  background: var(--ct-surface-base);
}

.ct-login__hero {
  --ct-stack-gap: 0.85rem;
  padding: var(--ct-space-5);
  color: var(--ct-theme-text-on-brand);
  background:
    radial-gradient(circle at 8% 8%, var(--ct-theme-accent-glow-1), transparent 38%),
    radial-gradient(circle at 92% 8%, var(--ct-theme-accent-glow-3), transparent 36%),
    var(--ct-theme-gradient-hero);
}

.ct-login__eyebrow {
  margin: 0;
  font-size: 0.74rem;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  font-weight: 700;
  opacity: 0.94;
}

.ct-login__title {
  margin: 0;
  font-size: clamp(1.35rem, 2.3vw, 1.9rem);
  line-height: 1.15;
  color: var(--ct-theme-text-on-brand);
}

.ct-login__lede {
  margin: 0;
  color: var(--ct-theme-text-inverse);
}

.ct-login__chips {
  --ct-cluster-gap: 0.42rem;
}

.ct-login__chip {
  display: inline-flex;
  align-items: center;
  padding: 0.18rem var(--ct-space-2);
  border-radius: var(--ct-radius-pill);
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--ct-theme-surface-brand-chip);
  border: 1px solid var(--ct-theme-surface-brand-chip-strong);
}

.ct-login__form-wrap {
  --ct-stack-gap: 0.68rem;
  padding: var(--ct-space-5);
  background: linear-gradient(160deg, var(--ct-surface-base) 0%, var(--ct-surface-soft) 100%);
  align-content: start;
}

.ct-login__form-title {
  margin: 0;
  font-size: 1rem;
  line-height: 1.2;
  color: var(--ct-color-ink);
}

.ct-login__form-text {
  margin: 0;
  font-size: 0.93rem;
  line-height: 1.4;
  color: var(--ct-color-ink-soft);
}

.ct-login__context {
  margin: 0;
  border: 1px solid var(--ct-theme-border-info);
  border-left: 4px solid var(--ct-theme-link);
  border-radius: var(--ct-radius-md);
  padding: 0.62rem 0.72rem;
  background: var(--ct-theme-surface-info);
  color: var(--ct-color-ink);
  font-size: 0.9rem;
}

.ct-login__form {
  --ct-stack-gap: 0.56rem;
}

.ct-login__field {
  --ct-stack-gap: 0.32rem;
}

.ct-login__field span {
  font-size: 0.86rem;
  color: var(--ct-color-ink);
  font-weight: 700;
}

.ct-login__field input {
  border: 1px solid var(--ct-border-soft);
  border-radius: var(--ct-radius-md);
  padding: 0.58rem 0.68rem;
  font-size: 0.94rem;
  color: var(--ct-color-ink);
  background: var(--ct-surface-base);
}

.ct-login__field input:focus {
  outline: none;
  border-color: var(--ct-color-primary-700);
  box-shadow: var(--ct-focus-ring);
}

.ct-login__submit {
  border: none;
  border-radius: var(--ct-radius-md);
  padding: 0.6rem 0.86rem;
  font-size: 0.94rem;
  font-weight: 700;
  color: var(--ct-theme-text-on-brand);
  background: var(--ct-theme-gradient-action);
  cursor: pointer;
  box-shadow: var(--ct-shadow-soft);
  transition:
    transform var(--ct-duration-fast) var(--ct-ease-standard),
    box-shadow var(--ct-duration-fast) var(--ct-ease-standard);
}

.ct-login__submit:hover {
  transform: translateY(-1px);
  background: var(--ct-theme-gradient-action-hover);
  box-shadow: var(--ct-shadow-card);
}

.ct-login__status {
  margin: 0;
  border-radius: var(--ct-radius-md);
  padding: 0.58rem 0.66rem;
  font-size: 0.9rem;
  border: 1px solid var(--ct-border-soft);
  background: var(--ct-theme-surface-info);
  color: var(--ct-theme-text-muted);
  min-height: 1.2rem;
}

.ct-login__status[hidden] {
  display: none;
}

.ct-login__status[data-tone='info'] {
  border-color: var(--ct-theme-border-info);
  background: var(--ct-theme-surface-info);
  color: var(--ct-theme-text-body);
}

.ct-login__status[data-tone='error'] {
  border-color: var(--ct-theme-border-danger);
  background: var(--ct-theme-surface-danger);
  color: var(--ct-theme-state-danger);
}

.ct-login__status[data-tone='success'] {
  border-color: var(--ct-theme-border-success);
  background: var(--ct-theme-surface-success);
  color: var(--ct-theme-state-success);
}

.ct-login__dev {
  margin: 0;
  font-size: 0.84rem;
  color: var(--ct-color-ink-soft);
}

.ct-login__dev a {
  font-weight: 700;
}

.ct-login__help {
  margin: 0;
  color: var(--ct-color-ink-soft);
  font-size: 0.82rem;
  line-height: 1.34;
}

.ct-login__back {
  margin: 0;
  color: var(--ct-color-ink-soft);
  font-size: 0.84rem;
  line-height: 1.35;
  padding-top: 0.1rem;
}

.ct-login__back a {
  font-weight: 700;
}

@media (min-width: 900px) {
  .ct-login__card {
    grid-template-columns: 1.05fr 1fr;
  }

  .ct-login__hero {
    padding: var(--ct-space-6);
    min-height: 100%;
    align-content: center;
  }

  .ct-login__form-wrap {
    padding: var(--ct-space-6);
  }
}
`;
