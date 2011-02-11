Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
function GetExtDir() { 
  this.wrappedJSObject = this;
}
GetExtDir.prototype = {
  classDescription: "Extension directory component",
  classID:          Components.ID("{723079F5-F880-40BB-8283-8266DEA93960}"),
  contractID:       "@mackerron.com/getExtDir;1",
  QueryInterface:   XPCOMUtils.generateQI(),
  getExtDir:        function() {
    var componentFile = __LOCATION__;
    var componentsDir = componentFile.parent;
    var extensionDir  = componentsDir.parent;
    return extensionDir;
  }
};
var components = [GetExtDir];
if (XPCOMUtils.generateNSGetFactory) 
  var NSGetFactory = XPCOMUtils.generateNSGetFactory(components); // FF4, Gecko 2
else 
  var NSGetModule = XPCOMUtils.generateNSGetModule(components); // FF3, Gecko 1.9
