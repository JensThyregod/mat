import { useState } from "react";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import "../main.css";

type LoginProps = {
  kcContext: Extract<KcContext, { pageId: "login.ftl" }>;
  i18n: I18n;
};

export default function Login(props: LoginProps) {
  const { kcContext } = props;
  const { social, realm, url, usernameHidden, login, messagesPerField } =
    kcContext;

  const [isLoginButtonDisabled, setIsLoginButtonDisabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="mat-page">
      <div className="mat-card">
        <div className="mat-header">
          <div className="mat-brand">
            <div className="mat-brand__dot" />
            <span className="mat-brand__name">Mat Tutor</span>
          </div>
          <h1 className="mat-header__title">Log ind</h1>
          <p className="mat-header__subtitle">
            Log ind for at fortsætte til din læring
          </p>
        </div>

        {kcContext.message !== undefined &&
          (kcContext.message.type !== "warning" || !kcContext.isAppInitiatedAction) && (
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

        {social?.providers !== undefined && social.providers.length > 0 && (
          <>
            <div className="mat-social-providers">
              {social.providers.map((p) => (
                <a
                  key={p.alias}
                  href={p.loginUrl}
                  className="mat-social-btn"
                >
                  {p.iconClasses && (
                    <i className={p.iconClasses} aria-hidden="true" />
                  )}
                  <span>{p.displayName}</span>
                </a>
              ))}
            </div>
            <div className="mat-divider">
              <span className="mat-divider__text">eller</span>
            </div>
          </>
        )}

        <form
          className="mat-form"
          onSubmit={() => {
            setIsLoginButtonDisabled(true);
            return true;
          }}
          action={url.loginAction}
          method="post"
        >
          {!usernameHidden && (
            <div className="mat-field">
              <label className="mat-field__label" htmlFor="username">
                E-mail
              </label>
              <input
                id="username"
                name="username"
                defaultValue={login.username ?? ""}
                type="email"
                autoFocus
                autoComplete="email"
                placeholder="din@email.dk"
                className={`mat-field__input ${
                  messagesPerField.existsError("username", "password")
                    ? "mat-field__input--error"
                    : ""
                }`}
                aria-invalid={messagesPerField.existsError(
                  "username",
                  "password"
                )}
              />
              {messagesPerField.existsError("username", "password") && (
                <span className="mat-field__error">
                  <span
                    dangerouslySetInnerHTML={{
                      __html: messagesPerField.getFirstError("username", "password"),
                    }}
                  />
                </span>
              )}
            </div>
          )}

          <div className="mat-field">
            <label className="mat-field__label" htmlFor="password">
              Adgangskode
            </label>
            <div className="mat-password-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className={`mat-field__input ${
                  messagesPerField.existsError("username", "password")
                    ? "mat-field__input--error"
                    : ""
                }`}
                aria-invalid={messagesPerField.existsError(
                  "username",
                  "password"
                )}
              />
              <button
                type="button"
                className="mat-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Skjul adgangskode" : "Vis adgangskode"}
              >
                {showPassword ? "◉" : "◎"}
              </button>
            </div>
          </div>

          <div className="mat-form-row">
            {realm.rememberMe && !usernameHidden && (
              <label className="mat-checkbox">
                <input
                  type="checkbox"
                  name="rememberMe"
                  defaultChecked={!!login.rememberMe}
                />
                <span className="mat-checkbox__label">Husk mig</span>
              </label>
            )}
            {realm.resetPasswordAllowed && (
              <a href={url.loginResetCredentialsUrl} className="mat-link">
                Glemt adgangskode?
              </a>
            )}
          </div>

          <button
            type="submit"
            className="mat-btn mat-btn--primary"
            disabled={isLoginButtonDisabled}
            name="login"
            value="Log ind"
          >
            Log ind
          </button>
        </form>

        {realm.registrationAllowed && (
          <div className="mat-footer">
            <p className="mat-footer__text">
              Har du ikke en konto?{" "}
              <a href={url.registrationUrl} className="mat-footer__link">
                Opret konto
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
