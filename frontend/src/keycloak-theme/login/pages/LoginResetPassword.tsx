import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import "../main.css";

type LoginResetPasswordProps = {
  kcContext: Extract<KcContext, { pageId: "login-reset-password.ftl" }>;
  i18n: I18n;
};

export default function LoginResetPassword(props: LoginResetPasswordProps) {
  const { kcContext } = props;
  const { url } = kcContext;

  return (
    <div className="mat-page">
      <div className="mat-card">
        <div className="mat-header">
          <div className="mat-brand">
            <div className="mat-brand__dot" />
            <span className="mat-brand__name">Mat Tutor</span>
          </div>
          <h1 className="mat-header__title">Nulstil adgangskode</h1>
          <p className="mat-header__subtitle">
            Indtast din e-mail, så sender vi dig et link til at nulstille din adgangskode
          </p>
        </div>

        {kcContext.message !== undefined && (
          <div
            className={`mat-alert mat-alert--${kcContext.message.type === "warning" ? "info" : kcContext.message.type}`}
            style={{ marginBottom: "var(--space-5)" }}
          >
            <span
              dangerouslySetInnerHTML={{
                __html: kcContext.message.summary,
              }}
            />
          </div>
        )}

        <form className="mat-form" action={url.loginAction} method="post">
          <div className="mat-field">
            <label className="mat-field__label" htmlFor="username">
              E-mail
            </label>
            <input
              id="username"
              name="username"
              type="email"
              autoFocus
              autoComplete="email"
              placeholder="din@email.dk"
              className="mat-field__input"
            />
          </div>

          <button
            type="submit"
            className="mat-btn mat-btn--primary"
          >
            Send nulstillingslink
          </button>
        </form>

        <div className="mat-footer">
          <p className="mat-footer__text">
            Husker du din adgangskode?{" "}
            <a href={url.loginUrl} className="mat-footer__link">
              Tilbage til log ind
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
