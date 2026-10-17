import "@fontsource/cinzel/600.css";
import "@fontsource/cinzel/700.css";
import "@fontsource/cinzel-decorative/700.css";
import "@fontsource/eb-garamond/400.css";
import "@fontsource/eb-garamond/400-italic.css";
import "@fontsource/eb-garamond/600.css";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { ServiceWorker } from "@/components/ServiceWorker";
import { ToastProvider } from "@/components/ui/Toasts";
import { translator } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n-client";
import { PrefsProvider } from "@/lib/prefs";
import { currentLocale } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = translator(await currentLocale());
  return {
    title: { default: "TextRPG", template: "%s · TextRPG" },
    description: t("meta.description"),
    applicationName: "TextRPG",
    appleWebApp: { capable: true, title: "TextRPG", statusBarStyle: "black-translucent" },
    icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const PREFS_BOOT = `try{var p=JSON.parse(localStorage.getItem("textrpg.prefs")||"{}");var r=document.documentElement;if(p.contrast)r.dataset.contrast=p.contrast;if(p.text)r.dataset.text=p.text;if(p.motion)r.dataset.motion=p.motion}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await currentLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Apply reading preferences before the first paint: no flash. */}
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT }} />
      </head>
      <body>
        <I18nProvider locale={locale}>
          <PrefsProvider>
            <ToastProvider>{children}</ToastProvider>
          </PrefsProvider>
        </I18nProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
