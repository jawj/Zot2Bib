var EXPORTED_SYMBOLS = ['Zot2Bib'];

var Zotero;
var own_path = Components.classes["@mackerron.com/getExtDir;1"].createInstance().wrappedJSObject.getExtDir();
var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.z2b.");
var about_window_ref, prefs_window_ref, help_window_ref;

var deleteQueue = [];
var deleteCallback = {
  notify: function(t) {
    if (deleteQueue.length < 1) return;
    var itemId = deleteQueue.shift();
    if (itemId && Zotero.Items.get(itemId)) Zotero.Items.erase([itemId], true);
  }
}

var zoteroCallback = {
  notify: function(event, type, ids, extraData) {
    if (event == 'add') {
      var items = Zotero.Items.get(ids);

      for (var i = 0; i < items.length; i ++) {
        var item = items[i];
        if (! item.isRegularItem() || ((item.numCreators() > 0 ? 1 : 0) + (item.getField('title') ? 1 : 0) + (item.getField('date') ? 1 : 0) < 2)) continue; // require at least two of: authors, title, date

        var file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("TmpD", Components.interfaces.nsIFile);
        file.append("zotero_item_" + item.id + ".bib");
        file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);

        var script_path = own_path.path + '/zot2bib.applescript';
        var osascript = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
        osascript.initWithPath('/usr/bin/osascript');
        var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
        process.init(osascript);

        var destfiles = Zot2Bib.loadList('destfiles');
        if (prefs.getBoolPref('addtoempty')) destfiles.push('');
        var openpub = prefs.getBoolPref('openpub') ? 'true' : 'false';
        var bringtofront = prefs.getBoolPref('bringtofront') ? 'true' : 'false';
        var extrabraces = prefs.getBoolPref('extrabraces') ? 'true' : 'false';

        var translator = new Zotero.Translate('export');
        translator.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4'); // BibTeX
        translator.setItems([item]);
        translator.setLocation(file);

        translator.setHandler('done', function() {
          if (Zot2Bib.numDests() < 1) {
            var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
            prompts.alert(null, "No destination for new publications is selected in Zot2Bib", "Use the Zot2Bib status bar menu to select a destination, then try again.");
          }
          for (var j = 0; j < destfiles.length; j ++) {
            var args = [script_path, destfiles[j], file.path, openpub, bringtofront, extrabraces];
            process.run(true, args, args.length); // first param true => calling thread will be blocked until called process terminates
          }
          if (! prefs.getBoolPref('keepinzotero')) {
            deleteQueue.push(item.id);

            // This seems like the right way to do this, but doesn't work!!
            // var timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
            // timer.initWithCallback(deleteCallback, 1000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);

            // This is messy, but seems to work
            var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
            wm.getMostRecentWindow("navigator:browser").setTimeout(deleteCallback.notify, 5000);
          }
        });

        translator.translate();
      }
    }
  }
}

Zot2Bib = {
  initOnce: function(z) {
    if (! Zotero) {
      Zotero = z;
      Zotero.Notifier.registerObserver(zoteroCallback, ['item']);
    }
  },
  about: function(w) {
    if (! about_window_ref || about_window_ref.closed) about_window_ref = w.open("chrome://zot2bib/content/about.xul", "", "centerscreen,chrome,dialog");
    else about_window_ref.focus();
  },
  preferences: function(w) {
    if (! prefs_window_ref || prefs_window_ref.closed) prefs_window_ref = w.open("chrome://zot2bib/content/preferences.xul", "", "centerscreen,chrome,dialog,resizable");
    else prefs_window_ref.focus();
  },
  help: function(w) {
    if (! help_window_ref || help_window_ref.closed) help_window_ref = w.open("chrome://zot2bib/content/help.html");
    else help_window_ref.focus();
  },
  populateMenu: function(m) {
    var a = Zot2Bib.loadList('bibfiles');
    for (var i = m.childNodes.length - 1; i >= 0; i --) {
      var mi = m.childNodes[i];
      if (mi.id == 'z2b-add-zotero' || mi.id == 'z2b-add-empty') mi.setAttribute('type', prefs.getBoolPref('manydests') ? 'checkbox' : 'radio');
      if (mi.id == 'z2b-add-zotero') {
        if (prefs.getBoolPref('keepinzotero')) mi.setAttribute('checked', true);
        else mi.removeAttribute('checked');
      }
      if (mi.id == 'z2b-add-empty') {
        if (prefs.getBoolPref('addtoempty')) mi.setAttribute('checked', true);
        else mi.removeAttribute('checked');
      }
      if (mi.id.match(/^z2b-bibfile-[0-9]+$/)) m.removeChild(mi);
    }
    var ms = m.getElementsByTagName('menuseparator')[0];
    var destfiles = Zot2Bib.loadList('destfiles');
    for (i = 0; i < a.length; i ++) {
      mi = m.ownerDocument.createElement('menuitem');
      mi.id = 'z2b-bibfile-' + i;
      mi.setAttribute('label', a[i].substr(a[i].lastIndexOf('/') + 1));
      mi.setAttribute('type', prefs.getBoolPref('manydests') ? 'checkbox' : 'radio');
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
      if (mi.id == 'z2b-add-zotero') prefs.setBoolPref('keepinzotero', mi.hasAttribute('checked'));
      else if (mi.id == 'z2b-add-empty') prefs.setBoolPref('addtoempty', mi.hasAttribute('checked'));
      else if (mi.id.match(/^z2b-bibfile-[0-9]+$/) && mi.hasAttribute('checked')) a.push(mi.getAttribute('value'));
    }
    Zot2Bib.saveList('destfiles', a);
  },
  numDests: function() {
    return Zot2Bib.loadList('destfiles').length + (prefs.getBoolPref('keepinzotero') ? 1 : 0) + (prefs.getBoolPref('addtoempty') ? 1 : 0);
  },
  removeDestFile: function(f) {
    var fs = Zot2Bib.loadList('destfiles');
    for (var i = fs.length - 1; i >= 0 ; i --) if (fs[i] == f) {
      fs.splice(i, 1);
      Zot2Bib.saveList('destfiles', fs);
    }
  },
  saveList: function(pref, a) {
    var b = [];
    for (var i = 0; i < a.length; i ++) b[i] = escape(a[i]);
    prefs.setCharPref(pref, b.join(','));
  },
  loadList: function(pref) {
    var s = prefs.getCharPref(pref);
    if (s.length == 0) return []; // weirdly, splitting an empty string appears to produce an Array with one empty string element, not an empty Array
    else {
      var a = s.split(',');
      for (var i = 0; i < a.length; i ++) a[i] = unescape(a[i]);
      return a;
    }
  }
}

