import { useState } from "react";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import type { LazyOrNot } from "keycloakify/tools/LazyOrNot";
import type { UserProfileFormFieldsProps } from "keycloakify/login/UserProfileFormFieldsProps";
import { getKcClsx } from "keycloakify/login/lib/kcClsx";
import "../main.css";

type RegisterProps = {
  kcContext: Extract<KcContext, { pageId: "register.ftl" }>;
  i18n: I18n;
  UserProfileFormFields: LazyOrNot<(props: UserProfileFormFieldsProps) => React.ReactElement>;
  doMakeUserConfirmPassword: boolean;
};

export default function Register(props: RegisterProps) {
  const {
    kcContext,
    i18n,
    UserProfileFormFields,
    doMakeUserConfirmPassword,
  } = props;
  const { url, isAppInitiatedAction } = kcContext;
  const { msgStr } = i18n;

  const [isFormSubmittable, setIsFormSubmittable] = useState(false);

  const { kcClsx } = getKcClsx({
    doUseDefaultCss: false,
    classes: undefined,
  });

  return (
    <div className="mat-page">
      <div className="mat-card" style={{ maxWidth: 460 }}>
        <div className="mat-header">
          <div className="mat-brand">
            <div className="mat-brand__dot" />
            <span className="mat-brand__name">Mat Tutor</span>
          </div>
          <h1 className="mat-header__title">Opret din konto</h1>
          <p className="mat-header__subtitle">
            Kom i gang med personlig matematiktræning
          </p>
        </div>

        {kcContext.message !== undefined &&
          (kcContext.message.type !== "warning" || !isAppInitiatedAction) && (
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

        <form className="mat-form" action={url.registrationAction} method="post">
          <UserProfileFormFields
            kcContext={kcContext}
            i18n={i18n}
            kcClsx={kcClsx}
            onIsFormSubmittableValueChange={setIsFormSubmittable}
            doMakeUserConfirmPassword={doMakeUserConfirmPassword}
          />

          <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
            {isAppInitiatedAction && (
              <button
                type="submit"
                className="mat-btn mat-btn--secondary"
                name="cancel-aia"
                value="true"
                style={{ flex: 1 }}
              >
                {msgStr("doCancel")}
              </button>
            )}
            <button
              type="submit"
              className="mat-btn mat-btn--primary"
              style={{ flex: 1 }}
              disabled={!isFormSubmittable}
            >
              {msgStr("doRegister")}
            </button>
          </div>
        </form>

        <div className="mat-footer">
          <p className="mat-footer__text">
            Har du allerede en konto?{" "}
            <a href={url.loginUrl} className="mat-footer__link">
              Log ind
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
