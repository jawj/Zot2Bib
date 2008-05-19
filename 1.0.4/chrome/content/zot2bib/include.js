// Only create main object once
if (!Zotero.Zot2Bib) {
  const loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
          .getService(Components.interfaces.mozIJSSubScriptLoader);
  loader.loadSubScript("chrome://zot2bib/content/zot2bib.js");
}
