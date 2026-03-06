import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import "../main.css";

type LoginVerifyEmailProps = {
  kcContext: Extract<KcContext, { pageId: "login-verify-email.ftl" }>;
  i18n: I18n;
};

export default function LoginVerifyEmail(props: LoginVerifyEmailProps) {
  const { kcContext, i18n } = props;
  const { url, user } = kcContext;
  const { msg } = i18n;

  return (
    <div className="mat-page">
      <div className="mat-card">
        <div className="mat-header">
          <div className="mat-brand">
            <div className="mat-brand__dot" />
            <span className="mat-brand__name">Mat Tutor</span>
          </div>
          <h1 className="mat-header__title">Bekræft din e-mail</h1>
        </div>

        <div className="mat-info">
          <span className="mat-info__icon">✉️</span>
          <p className="mat-info__message">
            {msg("emailVerifyInstruction1", user?.email ?? "")}
          </p>
          <p className="mat-info__message">
            {msg("emailVerifyInstruction2")}
            <br />
            <a href={url.loginAction}>
              {msg("doClickHere")}
            </a>{" "}
            {msg("emailVerifyInstruction3")}
          </p>
        </div>
      </div>
    </div>
  );
}
