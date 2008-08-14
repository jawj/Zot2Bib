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

  numDests: function() {
    return this.loadList('destfiles').length + (this.prefs.getBoolPref('keepinzotero') ? 1 : 0) + (this.prefs.getBoolPref('addtoempty') ? 1 : 0);
  },

  removeDestFile: function(f) {
    var fs = this.loadList('destfiles');
    for (var i = fs.length - 1; i >= 0 ; i --) if (fs[i] == f) {
      fs.splice(i, 1);
      this.saveList('destfiles', fs);
    }
  },

  saveList: function(pref, a) {
    var b = [];
    for (var i = 0; i < a.length; i ++) b[i] = escape(a[i]);
    this.prefs.setCharPref(pref, b.join(','));
  },

  loadList: function(pref) {
    var s = this.prefs.getCharPref(pref);
    if (s.length == 0) return []; // weirdly, splitting an empty string appears to produce an Array with one empty string element, not an empty Array
    else {
      var a = s.split(',');
      for (var i = 0; i < a.length; i ++) a[i] = unescape(a[i]);
      return a;
    }
  },

  // Callback implementing the notify() method to pass to the Notifier
  notifierCallback: {
    notify: function(event, type, ids, extraData) {
      if (event == 'add') {
        var prefs = Zotero.Zot2Bib.prefs;
        var items = Zotero.Items.get(ids);

        for (var i = 0; i < items.length; i ++) {
          var item = items[i];
          if (! item.isRegularItem() || ((item.numCreators() > 0 ? 1 : 0) + (item.getField('title') ? 1 : 0) + (item.getField('date') ? 1 : 0) < 2)) continue; // require at least two of: authors, title, date

          var file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("TmpD", Components.interfaces.nsIFile);
          file.append("zotero_item_" + item.id + ".bib");
          file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);

          var script_path = Zotero.Zot2Bib.own_path.path + '/zot2bib.scpt';
          var osascript = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
          osascript.initWithPath('/usr/bin/osascript');
          var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
          process.init(osascript);

          var destfiles = Zotero.Zot2Bib.loadList('destfiles');
          if (prefs.getBoolPref('addtoempty')) destfiles.push('');
          var openpub = prefs.getBoolPref('openpub') ? 'true' : 'false';
          var bringtofront = prefs.getBoolPref('bringtofront') ? 'true' : 'false';
          var extrabraces = prefs.getBoolPref('extrabraces') ? 'true' : 'false';

          var translator = new Zotero.Translate('export');
          translator.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4'); // BibTeX
          translator.setItems([item]);
          translator.setLocation(file);

          translator.setHandler('done', function() {
            if (Zotero.Zot2Bib.numDests() < 1) {
              var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);              prompts.alert(null, "No destination for new publications is selected in Zot2Bib", "Use the Zot2Bib status bar menu to select a destination, then try again.");
            }
	    for (var j = 0; j < destfiles.length; j ++) {
              var args = [script_path, destfiles[j], file.path, openpub, bringtofront, extrabraces];
              process.run(true, args, args.length); // first param true => calling thread will be blocked until called process terminates
            }
            // if (! prefs.getBoolPref('keepinzotero')) Zotero.Items.erase([item.id], false); // second param true => delete item's children too
            if (! prefs.getBoolPref('keepinzotero')) {
              Zotero.Zot2Bib.deleteQueue.push(item.id);
              setTimeout(Zotero.Zot2Bib.deleteNext, 5000);
            }
          });
          translator.translate();
        }

      }
    }
  },

  deleteQueue: [],
  deleteNext: function () {
    var dq = Zotero.Zot2Bib.deleteQueue;
    if (dq.length < 1) return;
    var itemId = dq.shift();
    if (itemId && Zotero.Items.get(itemId)) Zotero.Items.erase([itemId], true);
  }

};

window.addEventListener('load', function(e) { Zotero.Zot2Bib.init(); }, false); // Initialize the utility
