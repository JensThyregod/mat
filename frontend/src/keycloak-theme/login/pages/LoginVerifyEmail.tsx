import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import "../main.css";

type LoginVerifyEmailProps = {
  kcContext: Extract<KcContext, { pageId: "login-verify-email.ftl" }>;
  i18n: I18n;
};

export default function LoginVerifyEmail(props: LoginVerifyEmailProps) {
  const { kcContext } = props;
  const { url, user } = kcContext;

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
            Vi har sendt en e-mail til <strong>{user?.email ?? ""}</strong> med et link til at bekræfte din e-mailadresse.
          </p>
          <p className="mat-info__message">
            Har du ikke modtaget e-mailen?
            <br />
            <a href={url.loginAction}>
              Klik her
            </a>{" "}
            for at sende den igen.
          </p>
        </div>
      </div>
    </div>
  );
}
