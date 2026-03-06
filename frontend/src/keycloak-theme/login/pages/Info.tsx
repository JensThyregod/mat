import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import "../main.css";

type InfoProps = {
  kcContext: Extract<KcContext, { pageId: "info.ftl" }>;
  i18n: I18n;
};

export default function Info(props: InfoProps) {
  const { kcContext } = props;

  return (
    <div className="mat-page">
      <div className="mat-card">
        <div className="mat-header">
          <div className="mat-brand">
            <div className="mat-brand__dot" />
            <span className="mat-brand__name">Mat Tutor</span>
          </div>
          <h1 className="mat-header__title">Information</h1>
        </div>

        <div className="mat-info">
          <p
            className="mat-info__message"
            dangerouslySetInnerHTML={{
              __html: kcContext.message?.summary ?? "",
            }}
          />

          {kcContext.skipLink !== true && (
            <>
              {kcContext.pageRedirectUri !== undefined ? (
                <a
                  href={kcContext.pageRedirectUri}
                  className="mat-btn mat-btn--primary"
                  style={{ display: "inline-flex", textDecoration: "none" }}
                >
                  Tilbage til applikationen
                </a>
              ) : kcContext.actionUri !== undefined ? (
                <a
                  href={kcContext.actionUri}
                  className="mat-btn mat-btn--primary"
                  style={{ display: "inline-flex", textDecoration: "none" }}
                >
                  Fortsæt
                </a>
              ) : kcContext.client?.baseUrl !== undefined ? (
                <a
                  href={kcContext.client.baseUrl}
                  className="mat-btn mat-btn--primary"
                  style={{ display: "inline-flex", textDecoration: "none" }}
                >
                  Tilbage til applikationen
                </a>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
