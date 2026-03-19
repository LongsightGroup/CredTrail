export const AUTH_LOGIN_CSS = `
.ct-login {
  --ct-stack-gap: var(--ct-space-4);
  width: min(100%, 72rem);
  margin-inline: auto;
}

.ct-login__card {
  position: relative;
  gap: 0;
  border: 1px solid var(--ct-theme-border-soft);
  border-radius: clamp(1.2rem, 2vw, 1.6rem);
  overflow: hidden;
  box-shadow: var(--ct-theme-shadow-soft);
  background: linear-gradient(
    180deg,
    var(--ct-theme-surface-card-strong) 0%,
    var(--ct-theme-surface-soft) 100%
  );
}

.ct-login__hero {
  position: relative;
  --ct-stack-gap: 1rem;
  padding: clamp(1.5rem, 3vw, 2.6rem);
  color: var(--ct-theme-text-on-brand);
  background:
    radial-gradient(
      circle at 14% 14%,
      color-mix(in srgb, var(--ct-theme-accent-glow-1) 58%, transparent),
      transparent 38%
    ),
    radial-gradient(
      circle at 86% 16%,
      color-mix(in srgb, var(--ct-theme-accent-glow-3) 62%, transparent),
      transparent 32%
    ),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 30%),
    var(--ct-theme-gradient-hero);
}

.ct-login__hero::after {
  content: '';
  position: absolute;
  inset: auto -18% -58% auto;
  width: 16rem;
  height: 16rem;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.12), transparent 68%);
  pointer-events: none;
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
  font-size: clamp(1.9rem, 4vw, 3rem);
  line-height: 1.05;
  color: var(--ct-theme-text-on-brand);
  text-wrap: balance;
}

.ct-login__lede {
  margin: 0;
  color: var(--ct-theme-text-inverse);
  max-width: 30rem;
  font-size: clamp(1rem, 1.8vw, 1.16rem);
  line-height: 1.55;
}

.ct-login__steps {
  display: grid;
  gap: 0;
  margin: 0.35rem 0 0 0;
  padding: 0;
  list-style: none;
  counter-reset: login-steps;
}

.ct-login__step {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.85rem;
  align-items: start;
  padding: 0.85rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.16);
  color: var(--ct-theme-text-inverse);
  line-height: 1.45;
}

.ct-login__step:first-child {
  padding-top: 0.15rem;
  border-top: none;
}

.ct-login__step:last-child {
  padding-bottom: 0;
}

.ct-login__step::before {
  counter-increment: login-steps;
  content: counter(login-steps);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.12);
  color: var(--ct-theme-text-on-brand);
  font-size: 0.82rem;
  font-weight: 700;
}

.ct-login__step-copy {
  display: grid;
  gap: 0.22rem;
  min-width: 0;
}

.ct-login__step-copy span {
  color: color-mix(in srgb, var(--ct-theme-text-inverse) 88%, transparent);
}

.ct-login__step strong {
  display: block;
  color: var(--ct-theme-text-on-brand);
}

.ct-login__form-wrap {
  --ct-stack-gap: 0.95rem;
  padding: clamp(1.35rem, 2.8vw, 2.3rem);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--ct-theme-surface-card-strong) 96%, var(--ct-theme-surface-soft)) 0%,
    var(--ct-theme-surface-soft) 100%
  );
  align-content: start;
}

.ct-login__form-wrap > section {
  display: grid;
  gap: 0.78rem;
}

.ct-login__form-wrap > section + section {
  margin-top: 0.15rem;
  padding-top: 1rem;
  border-top: 1px solid var(--ct-theme-border-soft);
}

.ct-login__form-title {
  margin: 0;
  font-size: 1.08rem;
  line-height: 1.2;
  color: var(--ct-theme-text-title);
}

.ct-login__form-text {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--ct-theme-text-muted);
  max-width: 33rem;
}

.ct-login__context {
  margin: 0;
  border: 1px solid var(--ct-theme-border-info);
  border-radius: 0.95rem;
  padding: 0.72rem 0.8rem;
  background: color-mix(in srgb, var(--ct-theme-surface-info) 88%, var(--ct-theme-surface-card-strong));
  color: var(--ct-theme-text-body);
  font-size: 0.9rem;
  line-height: 1.45;
}

.ct-login__form {
  --ct-stack-gap: 0.72rem;
}

.ct-login__field {
  --ct-stack-gap: 0.38rem;
}

.ct-login__field span {
  font-size: 0.86rem;
  color: var(--ct-theme-text-title);
  font-weight: 700;
}

.ct-login__field-help {
  font-size: 0.8rem;
  line-height: 1.35;
  color: var(--ct-theme-text-muted);
  font-weight: 500;
}

.ct-login__field input {
  border: 1px solid var(--ct-theme-border-soft);
  border-radius: 0.9rem;
  min-height: 3rem;
  padding: 0.78rem 0.9rem;
  font-size: 0.94rem;
  color: var(--ct-theme-text-body);
  background: color-mix(
    in srgb,
    var(--ct-theme-surface-card-strong) 94%,
    var(--ct-theme-surface-soft)
  );
  transition:
    border-color var(--ct-duration-fast) var(--ct-ease-standard),
    box-shadow var(--ct-duration-fast) var(--ct-ease-standard),
    background-color var(--ct-duration-fast) var(--ct-ease-standard);
}

.ct-login__field input:hover {
  border-color: var(--ct-theme-border-default);
}

.ct-login__field input:focus {
  outline: none;
  border-color: var(--ct-theme-border-strong);
  box-shadow: var(--ct-focus-ring);
}

.ct-login__submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0.9rem;
  min-height: 3rem;
  padding: 0.78rem 1.05rem;
  font-size: 0.94rem;
  font-weight: 700;
  color: var(--ct-theme-text-on-brand);
  background: var(--ct-theme-gradient-action);
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(13, 60, 116, 0.14);
  text-decoration: none;
  transition:
    transform var(--ct-duration-fast) var(--ct-ease-standard),
    box-shadow var(--ct-duration-fast) var(--ct-ease-standard),
    background var(--ct-duration-fast) var(--ct-ease-standard);
}

.ct-login__submit:hover {
  transform: translateY(-1px);
  background: var(--ct-theme-gradient-action-hover);
  box-shadow: var(--ct-theme-shadow-soft);
}

.ct-login__submit:focus-visible {
  outline: none;
  box-shadow:
    var(--ct-focus-ring),
    0 10px 22px rgba(13, 60, 116, 0.14);
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
  color: var(--ct-theme-text-muted);
}

.ct-login__dev a {
  font-weight: 700;
}

.ct-login__help {
  margin: 0;
  color: var(--ct-theme-text-muted);
  font-size: 0.84rem;
  line-height: 1.4;
}

.ct-login__back {
  margin: 0;
  color: var(--ct-theme-text-muted);
  font-size: 0.84rem;
  line-height: 1.35;
  padding-top: 0.35rem;
}

.ct-login__back a {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  padding: 0.25rem 0.1rem;
  font-weight: 700;
}

.ct-login__organization-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.8rem;
}

.ct-login__organization-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.95rem 1rem;
  border: 1px solid var(--ct-theme-border-soft);
  border-radius: 1rem;
  background: color-mix(
    in srgb,
    var(--ct-theme-surface-card-strong) 94%,
    var(--ct-theme-surface-soft)
  );
}

.ct-login__organization-copy {
  display: grid;
  gap: 0.22rem;
}

.ct-login__organization-name {
  margin: 0;
  color: var(--ct-theme-text-title);
  font-weight: 700;
}

.ct-login__organization-current {
  display: inline-flex;
  align-items: center;
  margin-left: 0.45rem;
  padding: 0.16rem 0.5rem;
  border-radius: 999px;
  background: var(--ct-theme-surface-info);
  color: var(--ct-theme-link);
  font-size: 0.76rem;
  font-weight: 700;
  vertical-align: middle;
}

.ct-login__organization-meta {
  margin: 0;
  color: var(--ct-theme-text-muted);
  font-size: 0.86rem;
  line-height: 1.4;
}

@media (min-width: 900px) {
  .ct-login__card {
    grid-template-columns: minmax(0, 0.94fr) minmax(0, 1.06fr);
  }

  .ct-login__hero {
    padding: clamp(1.9rem, 3vw, 3rem);
    min-height: 100%;
    align-content: start;
  }

  .ct-login__form-wrap {
    padding: clamp(1.8rem, 3vw, 2.8rem);
  }
}
`;
