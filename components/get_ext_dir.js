
/* ---------------------------------------------------------------------- */
/* Component specific code.                                               */

const CLASS_ID = Components.ID('{723079F5-F880-40BB-8283-8266DEA93960}');
const CLASS_NAME = 'Extension Directory Component';
const CONTRACT_ID = '@mackerron.com/get_ext_dir;1';

/* ---------------------------------------------------------------------- */
/* Template.  No need to modify the code below.                           */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

function Component() {
    this.wrappedJSObject = this;
}

Component.prototype = {
    QueryInterface: function(aIID) {
        return this;
    },
    getInterfaces: function() {
        return null;
    },
    getHelperForLanguage: function() {
        return null;
    },
    get_ext_dir: function() {
        var componentFile = __LOCATION__;
        var componentsDir = componentFile.parent;
        var extensionDir = componentsDir.parent;
        return extensionDir;
    }
};

var Factory = {
    createInstance: function(aOuter, aIID) {
        if(aOuter != null)
            throw Cr.NS_ERROR_NO_AGGREGATION;
        var component = new Component();
        return component.QueryInterface(aIID);
    }
};

var Module = {
    _firstTime: true,

    registerSelf: function(aCompMgr, aFileSpec, aLocation, aType) {
        if (this._firstTime) {
            this._firstTime = false;
            throw Components.results.NS_ERROR_FACTORY_REGISTER_AGAIN;
        };
        aCompMgr = aCompMgr.QueryInterface(Ci.nsIComponentRegistrar);
        aCompMgr.registerFactoryLocation(
            CLASS_ID, CLASS_NAME, CONTRACT_ID, aFileSpec, aLocation, aType);
    },

    unregisterSelf: function(aCompMgr, aLocation, aType) {
        aCompMgr = aCompMgr.QueryInterface(Ci.nsIComponentRegistrar);
        aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);
    },

    getClassObject: function(aCompMgr, aCID, aIID) {
        if (!aIID.equals(Ci.nsIFactory))
            throw Cr.NS_ERROR_NOT_IMPLEMENTED;

        if (aCID.equals(CLASS_ID))
            return Factory;

        throw Cr.NS_ERROR_NO_INTERFACE;
    },

    canUnload: function(aCompMgr) { return true; }
};

function NSGetModule(aCompMgr, aFileSpec) { return Module; }