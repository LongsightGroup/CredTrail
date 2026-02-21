export const AUTH_LOGIN_CSS = `
.ct-login {
  --ct-login-ink: #08243f;
  --ct-login-ink-soft: #345d84;
  --ct-login-surface: #f8fbff;
  --ct-login-border: rgba(8, 45, 86, 0.14);
  --ct-login-shadow: 0 24px 40px rgba(8, 38, 74, 0.19);
  display: grid;
  gap: 1rem;
}

.ct-login__card {
  display: grid;
  gap: 0;
  border: 1px solid var(--ct-login-border);
  border-radius: 1.1rem;
  overflow: hidden;
  box-shadow: var(--ct-login-shadow);
  background: #ffffff;
}

.ct-login__hero {
  display: grid;
  gap: 0.85rem;
  padding: 1.2rem;
  color: #f4fbff;
  background:
    radial-gradient(circle at 8% 8%, rgba(255, 203, 5, 0.25), transparent 38%),
    radial-gradient(circle at 92% 8%, rgba(64, 200, 255, 0.24), transparent 36%),
    linear-gradient(145deg, #00274c 0%, #0a4c8f 70%, #0f6fb0 100%);
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
}

.ct-login__lede {
  margin: 0;
  color: rgba(236, 248, 255, 0.96);
}

.ct-login__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.42rem;
}

.ct-login__chip {
  display: inline-flex;
  align-items: center;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.ct-login__form-wrap {
  display: grid;
  gap: 0.9rem;
  padding: 1.15rem;
  background: linear-gradient(160deg, #ffffff 0%, var(--ct-login-surface) 100%);
}

.ct-login__form-title {
  margin: 0;
  font-size: 1.06rem;
  color: var(--ct-login-ink);
}

.ct-login__form-text {
  margin: 0;
  color: var(--ct-login-ink-soft);
}

.ct-login__form {
  display: grid;
  gap: 0.72rem;
}

.ct-login__field {
  display: grid;
  gap: 0.32rem;
}

.ct-login__field span {
  font-size: 0.86rem;
  color: var(--ct-login-ink);
  font-weight: 700;
}

.ct-login__field input {
  border: 1px solid rgba(10, 45, 84, 0.2);
  border-radius: 0.72rem;
  padding: 0.58rem 0.68rem;
  font-size: 0.94rem;
  color: #0f2f4f;
  background: #ffffff;
}

.ct-login__field input:focus {
  outline: 2px solid rgba(5, 99, 191, 0.22);
  outline-offset: 1px;
  border-color: rgba(5, 99, 191, 0.62);
}

.ct-login__submit {
  border: none;
  border-radius: 0.76rem;
  padding: 0.6rem 0.86rem;
  font-size: 0.94rem;
  font-weight: 700;
  color: #f7fbff;
  background: linear-gradient(120deg, #00274c 0%, #0a4c8f 72%);
  cursor: pointer;
  box-shadow: 0 10px 18px rgba(8, 45, 86, 0.25);
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.ct-login__submit:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 20px rgba(8, 45, 86, 0.3);
}

.ct-login__status {
  margin: 0;
  border-radius: 0.72rem;
  padding: 0.58rem 0.66rem;
  font-size: 0.9rem;
  border: 1px solid rgba(8, 45, 86, 0.14);
  background: #eff6ff;
  color: #1f4970;
  min-height: 1.2rem;
}

.ct-login__status[data-tone='error'] {
  border-color: rgba(139, 31, 18, 0.2);
  background: #fff2f0;
  color: #8b1f12;
}

.ct-login__status[data-tone='success'] {
  border-color: rgba(20, 99, 62, 0.2);
  background: #edfdf3;
  color: #14633e;
}

.ct-login__dev {
  margin: 0;
  font-size: 0.88rem;
  color: #255077;
}

.ct-login__dev a {
  font-weight: 700;
}

@media (min-width: 900px) {
  .ct-login__card {
    grid-template-columns: 1.05fr 1fr;
  }

  .ct-login__hero {
    padding: 1.45rem;
    min-height: 100%;
    align-content: center;
  }

  .ct-login__form-wrap {
    padding: 1.45rem;
  }
}
`;
