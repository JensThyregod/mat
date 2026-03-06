import { Suspense, lazy } from "react";
import type { ClassKey } from "keycloakify/login";
import type { KcContext } from "./KcContext";
import { useI18n } from "./i18n";
import DefaultPage from "keycloakify/login/DefaultPage";
import Template from "keycloakify/login/Template";

const UserProfileFormFields = lazy(
  () => import("keycloakify/login/UserProfileFormFields")
);
const LoginPage = lazy(() => import("./pages/Login"));
const RegisterPage = lazy(() => import("./pages/Register"));
const LoginResetPassword = lazy(() => import("./pages/LoginResetPassword"));
const LoginVerifyEmail = lazy(() => import("./pages/LoginVerifyEmail"));
const Info = lazy(() => import("./pages/Info"));

export default function KcPage(props: { kcContext: KcContext }) {
  const { kcContext } = props;
  const { i18n } = useI18n({ kcContext });

  return (
    <Suspense>
      {(() => {
        switch (kcContext.pageId) {
          case "login.ftl":
            return (
              <LoginPage kcContext={kcContext} i18n={i18n} />
            );
          case "register.ftl":
            return (
              <RegisterPage
                kcContext={kcContext}
                i18n={i18n}
                UserProfileFormFields={UserProfileFormFields}
                doMakeUserConfirmPassword={true}
              />
            );
          case "login-reset-password.ftl":
            return (
              <LoginResetPassword kcContext={kcContext} i18n={i18n} />
            );
          case "login-verify-email.ftl":
            return (
              <LoginVerifyEmail kcContext={kcContext} i18n={i18n} />
            );
          case "info.ftl":
            return (
              <Info kcContext={kcContext} i18n={i18n} />
            );
          default:
            return (
              <DefaultPage
                kcContext={kcContext}
                i18n={i18n}
                classes={classes}
                Template={Template}
                doUseDefaultCss={false}
                UserProfileFormFields={UserProfileFormFields}
                doMakeUserConfirmPassword={true}
              />
            );
        }
      })()}
    </Suspense>
  );
}

const classes = {} satisfies { [key in ClassKey]?: string };
