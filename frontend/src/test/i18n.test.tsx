import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider, useI18n } from "../i18n";

function Probe() {
  const { lang, t } = useI18n();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="dashboard">{t("Dashboard")}</span>
      <span data-testid="interp">{t("Page {page} of {totalPages}", { page: 2, totalPages: 5 })}</span>
      <span data-testid="unknown">{t("Completely unknown key")}</span>
    </div>
  );
}

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("i18n", () => {
  it("falls back to English when no provider is mounted", () => {
    render(<Probe />);
    expect(screen.getByTestId("lang")).toHaveTextContent("en");
    expect(screen.getByTestId("dashboard")).toHaveTextContent("Dashboard");
  });

  it("translates labels and interpolates placeholders in Chinese", () => {
    window.localStorage.setItem("cf_lang", "zh");
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId("lang")).toHaveTextContent("zh");
    expect(screen.getByTestId("dashboard")).toHaveTextContent("仪表盘");
    expect(screen.getByTestId("interp")).toHaveTextContent("第 2 / 5 页");
  });

  it("honours a ?lang=zh deep link and keeps unknown keys readable", () => {
    window.history.replaceState(null, "", "/?lang=zh");
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId("dashboard")).toHaveTextContent("仪表盘");
    expect(screen.getByTestId("unknown")).toHaveTextContent("Completely unknown key");
  });
});
