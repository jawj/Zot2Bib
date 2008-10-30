
Components.utils.import('resource://zot2bib/zot2bib.js');
alert(test);

if (!Zotero.Zot2Bib) { // Only create main object once
  const loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
          .getService(Components.interfaces.mozIJSSubScriptLoader);
  loader.loadSubScript("chrome://zot2bib/content/zot2bib.js");
}
