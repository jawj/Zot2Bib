
function listAction(e) {

  const nsIFilePicker = Components.interfaces.nsIFilePicker;
  const nsIPrefService = Components.interfaces.nsIPrefService;

  var listbox = gebi('z2b-listbox');
  var addbtn = gebi('z2b-add');
  var removebtn = gebi('z2b-remove');
  var upbtn = gebi('z2b-move-up');
  var downbtn = gebi('z2b-move-down');

  if (e && e.type == 'command' ) {

  var olditem, newitem;

  if (e.target == addbtn) {
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, "Choose BibTeX file", nsIFilePicker.modeOpen);
    fp.appendFilter("BibTeX", "*.bib");
    var rv = fp.show();
    if (rv == nsIFilePicker.returnOK) {
      var path = fp.file.path;
      for (var i = 0; i < listbox.getRowCount(); i ++) {
        olditem = listbox.getItemAtIndex(i);
        if (olditem.label == path) {
          newitem = olditem;
          break;
        }
      }
      if (! newitem) newitem = listbox.appendItem(path);
    }

  } else if (e.target == removebtn) {
    listbox.removeItemAt(listbox.selectedIndex);

  } else if (e.target == upbtn || e.target == downbtn) {
    olditem = listbox.selectedItem;
    newitem = listbox.getItemAt(listbox.selectedIndex + ( e.target == upbtn ? -1 : 1 ));
    [olditem.label, newitem.label] = [newitem.label, olditem.label];
  }

  if (newitem) {
    listbox.selectItem(newitem);
    listbox.ensureElementIsVisible(newitem);
  }
  copyListToPrefs();
  }

  removebtn.disabled = ! listbox.selectedItem;
  upbtn.disabled = ! listbox.selectedItem || listbox.selectedIndex == 0;
  downbtn.disabled = ! listbox.selectedItem || listbox.selectedIndex == listbox.getRowCount() - 1;
}

function copyPrefsToList() {

}
function copyListToPrefs() {

}

function gebi(id) { return document.getElementById(id); }

window.onload = function() {
  copyPrefsToList();
  listAction();
}