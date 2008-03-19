Zotero.Zot2Bib = {
  DB: null,

  own_path: Components.classes["@mackerron.com/get_ext_dir;1"].createInstance().wrappedJSObject.get_ext_dir(),

  init: function () {
    // Register the callback in Zotero as an item observer
    var notifierID = Zotero.Notifier.registerObserver(this.notifierCallback, ['item']);

    // Unregister callback when the window closes (important to avoid a memory leak)
    window.addEventListener('unload', function(e) { Zotero.Notifier.unregisterObserver(notifierID); }, false);
  },

  chooseFile: function() {

    var applescript = this.own_path.append('zot2bib.scpt');
    alert(applescript.path);

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
        var item = items[0];
        if (! item.isRegularItem() || (! item.getCreator(0) && ! item.getField('title'))) return;

        var file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("TmpD", nsIFile);
        file.append("zotero_item_" + item.id + ".bib");
        file.createUnique(nsIFile.NORMAL_FILE_TYPE, 0666);

        var translator = new Zotero.Translate('export');
        translator.setTranslator(translator.getTranslators()[2]); // BibTeX
        translator.setItems([item]);
        translator.setLocation(file);



        translator.setHandler('done', function() {
          var scriptsource = 'set theDocFile to POSIX file "' + prefs.getCharPref('bibfile') + '"\nset thePubFile to POSIX file "' + file.path + '"\ntell application "BibDesk"\nactivate\nopen theDocFile\nset theDoc to document (name of (info for theDocFile)) -- note that if a file of the same name is already open, this may not select the right one\ntell theDoc\nset readFile to open for access thePubFile\nset pubData to read readFile as string\nclose access readFile\nset newPub to make new publication at the end of publications\nset BibTeX string of newPub to pubData\nset cite key of newPub to generated cite key of newPub\nshow newPub\nend tell\nend tell';

          var osascript = Components.classes["@mozilla.org/file/local;1"].createInstance(nsILocalFile);
          osascript.initWithPath("/usr/bin/osascript");
          var process = Components.classes["@mozilla.org/process/util;1"].createInstance(nsIProcess);
          process.init(osascript);
          var args = ["-e", scriptsource];
          process.run(false, args, args.length); // first param true => calling thread will be blocked until called process terminates
        });

        translator.translate();
      }
    }
  }
};

// Initialize the utility
window.addEventListener('load', function(e) { Zotero.Zot2Bib.init(); }, false);
