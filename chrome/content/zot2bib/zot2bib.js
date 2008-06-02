Zotero.Zot2Bib = {

  own_path: Components.classes["@mackerron.com/get_ext_dir;1"].createInstance().wrappedJSObject.get_ext_dir(),
  prefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.z2b."),

  init: function() {
    var notifierID = Zotero.Notifier.registerObserver(this.notifierCallback, ['item']); // register the callback in Zotero as an item observer
    window.addEventListener('unload', function(e) { Zotero.Notifier.unregisterObserver(notifierID); }, false); // unregister callback when the window closes (avoid a memory leak)
  },

  about: function() {
    if (! this.about_window_ref || this.about_window_ref.closed) this.about_window_ref = window.open("chrome://zot2bib/content/about.xul", "", "centerscreen,chrome,dialog");
    else this.about_window_ref.focus();
  },

  preferences: function() {
    if (! this.prefs_window_ref || this.prefs_window_ref.closed) this.prefs_window_ref = window.open("chrome://zot2bib/content/preferences.xul", "", "centerscreen,chrome,dialog,resizable");
    else this.prefs_window_ref.focus();
  },

  help: function() {
    if (! this.help_window_ref || this.help_window_ref.closed) this.help_window_ref = window.open("chrome://zot2bib/content/help.html");
    else this.help_window_ref.focus();
  },

  populateMenu: function(m) {
    var a = this.loadList('bibfiles');
    for (var i = m.childNodes.length - 1; i >= 0; i --) {
      var mi = m.childNodes[i];
      if (mi.id == 'z2b-add-zotero' || mi.id == 'z2b-add-empty') mi.setAttribute('type', this.prefs.getBoolPref('manydests') ? 'checkbox' : 'radio');
      if (mi.id == 'z2b-add-zotero' && this.prefs.getBoolPref('keepinzotero')) mi.setAttribute('checked', true);
      if (mi.id == 'z2b-add-empty' && this.prefs.getBoolPref('addtoempty')) mi.setAttribute('checked', true);
      if (mi.id.match(/^z2b-bibfile-[0-9]+$/)) m.removeChild(mi);
    }
    var ms = m.getElementsByTagName('menuseparator')[0];
    var destfiles = this.loadList('destfiles');
    for (i = 0; i < a.length; i ++) {
      mi = document.createElement('menuitem');
      mi.id = 'z2b-bibfile-' + i;
      mi.setAttribute('label', a[i].substr(a[i].lastIndexOf('/') + 1));
      mi.setAttribute('type', this.prefs.getBoolPref('manydests') ? 'checkbox' : 'radio');
      mi.setAttribute('name', 'z2b-destination');
      mi.setAttribute('crop', 'center');
      mi.setAttribute('tooltiptext', a[i]);
      mi.setAttribute('value', a[i]);
      for (var j = 0; j < destfiles.length; j ++) if (a[i] == destfiles[j]) mi.setAttribute('checked', true);
      m.insertBefore(mi, ms);
    }
  },

  saveMenuChoices: function(m) {
    var a = [];
    for (var i = 0; i < m.childNodes.length; i ++) {
      var mi = m.childNodes[i];
      if (mi.id == 'z2b-add-zotero') this.prefs.setBoolPref('keepinzotero', mi.hasAttribute('checked'));
      else if (mi.id == 'z2b-add-empty') this.prefs.setBoolPref('addtoempty', mi.hasAttribute('checked'));
      else if (mi.id.match(/^z2b-bibfile-[0-9]+$/) && mi.hasAttribute('checked')) a.push(mi.getAttribute('value'));
    }
    this.saveList('destfiles', a);
  },

  selectOneOnly: function() {
    var destfiles = this.loadList('destfiles');
    var n = destfiles.length + (this.prefs.getBoolPref('keepinzotero') ? 1 : 0) + (this.prefs.getBoolPref('addtoempty') ? 1 : 0);
    if (n > 1) {
      this.prefs.setBoolPref('keepinzotero', true);
      this.prefs.setBoolPref('addtoempty', false);
      this.saveList('destfiles', []);
      return true;
    }
  },

  removeDestFile: function(f) {
    var fs = this.loadList('destfiles');
    for (var i = fs.length - 1; i >= 0 ; i --) if (fs[i] == f) {
      fs.splice(i, 1);
      this.saveList('destfiles', fs);
      var n = fs.length + (this.prefs.getBoolPref('keepinzotero') ? 1 : 0) + (this.prefs.getBoolPref('addtoempty') ? 1 : 0);
      if (n == 0) { 
        this.prefs.setBoolPref('keepinzotero', true);
        return true;
      } else return false;
    }
    return false;
  },

  saveList: function(pref, a) {
    var b = [];
    for (var i = 0; i < a.length; i ++) b[i] = escape(a[i]);
    this.prefs.setCharPref(pref, b.join(','));
  },

  loadList: function(pref) {
    var s = this.prefs.getCharPref(pref)
    if (s.length == 0) return []; // weirdly, splitting an empty string appears to produce an Array with one empty string element
    else {
      var a = s.split(',');
      for (var i = 0; i < a.length; i ++) a[i] = unescape(a[i]);
      return a;
    }
  },

  // Callback implementing the notify() method to pass to the Notifier
  notifierCallback: {
    notify: function(event, type, ids, extraData) {
      const nsIFile = Components.interfaces.nsIFile;
      const nsILocalFile = Components.interfaces.nsILocalFile;
      const nsIProcess = Components.interfaces.nsIProcess;

      if (event == 'add') {
        var prefs = Zotero.Zot2Bib.prefs;
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

            var openpub = prefs.prefHasUserValue('openpub') && prefs.getBoolPref('openpub') ? 'true' : 'false';
            var bringtofront = prefs.prefHasUserValue('bringtofront') && prefs.getBoolPref('bringtofront') ? 'true' : 'false';
            var extrabraces = prefs.prefHasUserValue('extrabraces') && prefs.getBoolPref('extrabraces') ? 'true' : 'false';

            var args = [script_path, prefs.getCharPref('bibfile'), file.path, openpub, bringtofront, extrabraces];
            process.run(false, args, args.length); // first param true => calling thread will be blocked until called process terminates

            if (prefs.prefHasUserValue('Zoteroerase') && prefs.getBoolPref('Zoteroerase')) {
              Zotero.Items.erase([item.id], true); // second param true => delete item's children too
            }
          });

          translator.translate();
        }
      }
    }
  }
};

window.addEventListener('load', function(e) { Zotero.Zot2Bib.init(); }, false); // Initialize the utility
