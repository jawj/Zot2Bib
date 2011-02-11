Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
function GetExtDir() { this.wrappedJSObject = this; }
GetExtDir.prototype = {
  classDescription: "Extension Directory Component",
  classID:          Components.ID("{723079F5-F880-40BB-8283-8266DEA93960}"),
  contractID:       "@mackerron.com/get_ext_dir;1",
  QueryInterface:   function() { return this; },
  get_ext_dir:      function() {
    var componentFile = __LOCATION__;
    var componentsDir = componentFile.parent;
    var extensionDir  = componentsDir.parent;
    return extensionDir;
  }
};
var components = [GetExtDir];
function NSGetModule(compMgr, fileSpec) { return XPCOMUtils.generateModule(components); } // FF3
const NSGetFactory = XPCOMUtils.generateNSGetFactory(components); // FF4
