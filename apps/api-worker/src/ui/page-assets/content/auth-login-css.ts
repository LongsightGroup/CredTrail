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
  color: #f4fbff;
  background:
    radial-gradient(circle at 8% 8%, rgba(255, 203, 5, 0.25), transparent 38%),
    radial-gradient(circle at 92% 8%, rgba(64, 200, 255, 0.24), transparent 36%),
    linear-gradient(
      145deg,
      var(--ct-color-primary-900) 0%,
      var(--ct-color-primary-700) 70%,
      var(--ct-color-primary-500) 100%
    );
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
  color: #f3f9ff;
}

.ct-login__lede {
  margin: 0;
  color: rgba(236, 248, 255, 0.96);
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
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.ct-login__form-wrap {
  --ct-stack-gap: 0.9rem;
  padding: var(--ct-space-5);
  background: linear-gradient(160deg, var(--ct-surface-base) 0%, var(--ct-surface-soft) 100%);
}

.ct-login__form-title {
  margin: 0;
  font-size: 1.06rem;
  color: var(--ct-color-ink);
}

.ct-login__form-text {
  margin: 0;
  color: var(--ct-color-ink-soft);
}

.ct-login__context {
  margin: 0;
  border: 1px solid rgba(10, 76, 143, 0.2);
  border-radius: var(--ct-radius-md);
  padding: 0.62rem 0.72rem;
  background: linear-gradient(180deg, #eef6ff, #e8f2ff);
  color: var(--ct-color-ink);
  font-size: 0.9rem;
}

.ct-login__form {
  --ct-stack-gap: 0.72rem;
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
  color: #f7fbff;
  background: linear-gradient(
    120deg,
    var(--ct-color-primary-900) 0%,
    var(--ct-color-primary-700) 72%
  );
  cursor: pointer;
  box-shadow: var(--ct-shadow-soft);
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.ct-login__submit:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 22px rgba(8, 45, 86, 0.18);
}

.ct-login__status {
  margin: 0;
  border-radius: var(--ct-radius-md);
  padding: 0.58rem 0.66rem;
  font-size: 0.9rem;
  border: 1px solid var(--ct-border-soft);
  background: #eff6ff;
  color: var(--ct-color-ink-soft);
  min-height: 1.2rem;
}

.ct-login__status[hidden] {
  display: none;
}

.ct-login__status[data-tone='error'] {
  border-color: rgba(139, 31, 18, 0.22);
  background: #fff2f0;
  color: var(--ct-color-danger);
}

.ct-login__status[data-tone='success'] {
  border-color: rgba(20, 99, 62, 0.22);
  background: #edfdf3;
  color: var(--ct-color-success);
}

.ct-login__dev {
  margin: 0;
  font-size: 0.88rem;
  color: var(--ct-color-ink-soft);
}

.ct-login__dev a {
  font-weight: 700;
}

.ct-login__help,
.ct-login__back {
  margin: 0;
  color: var(--ct-color-ink-soft);
  font-size: 0.87rem;
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
