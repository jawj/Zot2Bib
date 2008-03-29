Zotero.Zot2Bib = {

  own_path: Components.classes["@mackerron.com/get_ext_dir;1"].createInstance().wrappedJSObject.get_ext_dir(),

  init: function() {
    // Register the callback in Zotero as an item observer
    var notifierID = Zotero.Notifier.registerObserver(this.notifierCallback, ['item']);

    // Unregister callback when the window closes (important to avoid a memory leak)
    window.addEventListener('unload', function(e) { Zotero.Notifier.unregisterObserver(notifierID); }, false);
  },


  about: function() {
    window.open("chrome://zot2bib/content/about.xul", "zot2bib-about-dialog", "centerscreen,chrome");
  },

  preferences: function() {
    window.openDialog("chrome://zot2bib/content/preferences.xul", "zot2bib-preferences-dialog", "centerscreen,chrome,modal");
  },

  chooseFile: function() {
    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    const nsIPrefService = Components.interfaces.nsIPrefService;

    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(nsIPrefService).getBranch("extensions.z2b.");
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

    fp.init(window, "Choose BibTeX file for auto-export", nsIFilePicker.modeOpen);
    fp.appendFilter("BibTeX", "*.bib");
    var rv = fp.show();

    if (rv == nsIFilePicker.returnOK) {
      var path = fp.file.path;
      prefs.setCharPref('bibfile', path);
    }
  },

  // Callback implementing the notify() method to pass to the Notifier
  notifierCallback: {
    notify: function(event, type, ids, extraData) {
      const nsIPrefService = Components.interfaces.nsIPrefService;
      const nsIFile = Components.interfaces.nsIFile;
      const nsILocalFile = Components.interfaces.nsILocalFile;
      const nsIProcess = Components.interfaces.nsIProcess;

      if (event == 'add') {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(nsIPrefService).getBranch("extensions.z2b.");
        if (! prefs.prefHasUserValue('bibfile')) return;

        var items = Zotero.Items.get(ids);

        for (var i = 0; i < items.length; i ++) {
          var item = items[i];
          if (! item.isRegularItem() || (! item.getCreator(0) && ! item.getField('title'))) continue;

          var file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("TmpD", nsIFile);
          file.append("zotero_item_" + item.id + ".bib");
          file.createUnique(nsIFile.NORMAL_FILE_TYPE, 0666);

          var translator = new Zotero.Translate('export');
          translator.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4'); // BibTeX
          translator.setItems([item]);
          translator.setLocation(file);

          translator.setHandler('done', function() {
            var script_path = Zotero.Zot2Bib.own_path.path + '/zot2bib.scpt';
            var osascript = Components.classes["@mozilla.org/file/local;1"].createInstance(nsILocalFile);
            osascript.initWithPath("/usr/bin/osascript");
            var process = Components.classes["@mozilla.org/process/util;1"].createInstance(nsIProcess);
            process.init(osascript);
            var args = [script_path, prefs.getCharPref('bibfile'), file.path];
            process.run(true, args, args.length); // first param true => calling thread will be blocked until called process terminates
          });

          translator.translate();
        }
      }
    }
  }
};

// Initialize the utility
window.addEventListener('load', function(e) { Zotero.Zot2Bib.init(); }, false);
