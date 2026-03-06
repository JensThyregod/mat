import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { KcPage } from "./kc.gen";

// Uncomment to test a specific page in dev mode:
// import { getKcContextMock } from "./login/KcPageStory";
// if (import.meta.env.DEV) {
//     window.kcContext = getKcContextMock({
//         pageId: "login.ftl",
//         overrides: {}
//     });
// }

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {!window.kcContext ? (
      <h1>No Keycloak Context</h1>
    ) : (
      <KcPage kcContext={window.kcContext} />
    )}
  </StrictMode>
);
