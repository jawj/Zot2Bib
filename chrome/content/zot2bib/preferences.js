const nsIFilePicker = Components.interfaces.nsIFilePicker;
var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);

var listbox, addbtn, removebtn, upbtn, downbtn, manydests;

function listAction(e) {

  var bw = wm.getMostRecentWindow("navigator:browser");

  if (e && e.type == 'command' ) {

    var olditem, newitem;

    if (e.target == addbtn) {
      var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
      fp.init(window, "Choose BibTeX file", nsIFilePicker.modeOpen);
      fp.appendFilter("BibTeX", "*.bib");
      var rv = fp.show();
      if (rv == nsIFilePicker.returnOK) {
        var path = fp.file.path;
        var rc = listbox.getRowCount()
        for (var i = 0; i < rc; i ++) {
          olditem = listbox.getItemAtIndex(i);
          if (olditem.label == path) {
            newitem = olditem;
            break;
          }
        }
        if (! newitem) newitem = listbox.appendItem(path);
      }

    } else if (e.target == removebtn) {
      var l = listbox.selectedItem.label;
      var si = listbox.selectedIndex;
      listbox.removeItemAt(si);
      bw.Zotero.Zot2Bib.removeDestFile(l);
      if (listbox.getRowCount() > 0) newitem = listbox.getItemAtIndex(Math.min(si, listbox.getRowCount() - 1));      

    } else if (e.target == upbtn || e.target == downbtn) {
      olditem = listbox.selectedItem;
      newitem = e.target == upbtn ? olditem.previousSibling : olditem.nextSibling;
      [olditem.label, newitem.label] = [newitem.label, olditem.label];
    
   } else if (e.target == manydests && ! e.target.checked) {
      if (bw.Zotero.Zot2Bib.numDests() > 1) {
        e.target.checked = true;
        var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);        prompts.alert(null, "You cannot uncheck this option while multiple destination files are selected", "Ensure only one destination is selected using the Zot2Bib status bar menu, then try again.");
      } 
    }

    if (newitem) {
      listbox.ensureElementIsVisible(newitem);
      listbox.selectItem(newitem);
    }
  }

  removebtn.disabled = ! listbox.selectedItem;
  upbtn.disabled = ! listbox.selectedItem || ! listbox.selectedItem.previousSibling;
  downbtn.disabled = ! listbox.selectedItem || ! listbox.selectedItem.nextSibling;
}

function copyPrefsToList() {
  var bw = wm.getMostRecentWindow("navigator:browser");
  var a = bw.Zotero.Zot2Bib.loadList('bibfiles');
  while (listbox.getRowCount() > 0) listbox.removeItemAt(0);
  while (a.length) listbox.appendItem(a.shift());
}

function copyListToPrefs() {
  var bw = wm.getMostRecentWindow("navigator:browser"); 
  var a = new Array();
  var rc = listbox.getRowCount();
  for (var i = 0; i < rc; i ++) a.push(listbox.getItemAtIndex(i).label);
  bw.Zotero.Zot2Bib.saveList('bibfiles', a);
}

function gebi(id) { return document.getElementById(id); }

onload = function() {
  listbox = gebi('z2b-listbox');
  addbtn = gebi('z2b-add');
  removebtn = gebi('z2b-remove');
  upbtn = gebi('z2b-move-up');
  downbtn = gebi('z2b-move-down');
  manydests = gebi('z2b-many-dests');

  copyPrefsToList();
  listAction();
}

onblur = onunload = function () {
  copyListToPrefs();
}