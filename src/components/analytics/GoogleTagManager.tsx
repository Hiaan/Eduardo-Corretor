import Script from 'next/script'

/** Google Tag Manager container. Override with NEXT_PUBLIC_GTM_ID if it ever changes. */
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-NW5VDM5X'

/**
 * Loads Google Tag Manager on the public site only (mounted in the public
 * layout, so admin activity is never tracked). Page views on client-side
 * navigation are picked up in GTM with a "History Change" trigger.
 */
export function GoogleTagManager() {
  if (!GTM_ID) return null

  return (
    <>
      <Script id="google-tag-manager" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    </>
  )
}
