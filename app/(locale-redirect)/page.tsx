import { LOCALE_PREFERENCE_KEY, routing } from "@/i18n/routing"

// The static export has no server to read `Accept-Language`, so the browser
// picks the locale: the saved preference, then the browser languages, then the
// default. `/` lands on the landing page. Netlify also serves this page for
// any other path without a locale, such as old links and the installed app's
// `/map/` (`public/_redirects`), which keep their path, query and hash.
const script = `(function () {
  var locales = ${JSON.stringify(routing.locales)};
  var locale = null;
  try {
    var saved = localStorage.getItem(${JSON.stringify(LOCALE_PREFERENCE_KEY)});
    if (locales.indexOf(saved) >= 0) locale = saved;
  } catch (error) {}
  var languages = navigator.languages || [navigator.language];
  for (var i = 0; !locale && i < languages.length; i++) {
    var language = String(languages[i]).toLowerCase().split("-")[0];
    if (locales.indexOf(language) >= 0) locale = language;
  }
  location.replace(
    "/" + (locale || ${JSON.stringify(routing.defaultLocale)}) + location.pathname + location.search + location.hash
  );
})()`

export default function LocaleRedirectPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: script }} />
      <noscript>
        <a href={`/${routing.defaultLocale}/`}>ShareYourGarden</a>
      </noscript>
    </>
  )
}
