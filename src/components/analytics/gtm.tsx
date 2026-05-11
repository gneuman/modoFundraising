import Script from "next/script";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID ?? "";

export function GTMScript() {
  if (!GA4_ID) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA4_ID}', { send_page_view: true });`,
        }}
      />
    </>
  );
}

// No noscript needed for GA4
export function GTMNoScript() {
  return null;
}
