'use strict';

/*global require*/

var CatalogMember = require('./CatalogMember');
var CesiumMath = require('terriajs-cesium/Source/Core/Math');
var clone = require('terriajs-cesium/Source/Core/clone');
var createCatalogMemberFromType = require('./createCatalogMemberFromType');
var Credit = require('terriajs-cesium/Source/Core/Credit');
var defined = require('terriajs-cesium/Source/Core/defined');
var defineProperties = require('terriajs-cesium/Source/Core/defineProperties');
var DeveloperError = require('terriajs-cesium/Source/Core/DeveloperError');
var freezeObject = require('terriajs-cesium/Source/Core/freezeObject');
var inherit = require('../Core/inherit');
var knockout = require('terriajs-cesium/Source/ThirdParty/knockout');
var LegendUrl = require('../Map/LegendUrl');
var Metadata = require('./Metadata');
var raiseErrorOnRejectedPromise = require('./raiseErrorOnRejectedPromise');
var Rectangle = require('terriajs-cesium/Source/Core/Rectangle');
var when = require('terriajs-cesium/Source/ThirdParty/when');

/**
 * A data item in a {@link CatalogGroup}.
 *
 * @alias CatalogItem
 * @constructor
 * @extends CatalogMember
 * @abstract
 *
 * @param {Terria} terria The Terria instance.
 */
var CatalogItem = function(terria) {
    CatalogMember.call(this, terria);

    this._enabledDate = undefined;
    this._shownDate = undefined;
    this._loadForEnablePromise = undefined;
    this._lastLoadInfluencingValues = undefined;

    // The catalog item to show in the Now Viewing when this item is enabled, instead of this item.
    // If undefined, this item itself is shown.
    this.nowViewingCatalogItem = undefined;

    // The catalog item that created this one.  Usually this is undefined, but may be defined if
    // the {@see CatalogItem} in the catalog acts like a factory to produce a different catalog item for the
    // {@see NowViewing}, rather than being added to the {@see NowViewing} itself.  In that scenario, this
    // property on the item in the now viewing would be a reference to the item in the catalog.
    // @type {CatalogItem}
    this.creatorCatalogItem = undefined;

    /**
     * The index of the item in the Now Viewing list.  Setting this property does not automatically change the order.
     * This property is used intenally to save/restore the Now Viewing order and is not intended for general use.
     * @private
     * @type {Number}
     */
    this.nowViewingIndex = undefined;

    /**
     * Gets or sets the geographic rectangle (extent or bounding box) containing this data item.  This property is observable.
     * @type {Rectangle}
     */
    this.rectangle = undefined;

    /**
     * Gets or sets the URL of the legend for this data item, or undefined if this data item does not have a legend.
     * This property is observable.
     * @type {LegendUrl}
     */
    this.legendUrl = undefined;

    /**
     * Gets or sets the URL of this data.  This property is observable.
     * @type {String}
     */
    this.url = undefined;

    /**
     * Gets or sets a description of the custodian of this data item.
     * This property is an HTML string that must be sanitized before display to the user.
     * This property is observable.
     * @type {String}
     */
    this.dataCustodian = undefined;

    /**
     * Gets or sets an attribution displayed on the map when this catalog item is enabled.
     * This property is observable.
     * @type {Credit}
     */
    this.attribution = undefined;

    /**
     * Gets or sets the URL from which this data item's metadata description can be retrieved, or undefined if
     * metadata is not available for this data item.  The format of the metadata depends on the type of data item.
     * For example, Web Map Service (WMS) data items provide their metadata via their GetCapabilities document.
     * This property is observable.
     * @type {String}
     */
    this.metadataUrl = undefined;

    /**
     * Gets or sets a value indicating whether this data item is enabled.  An enabled data item appears in the
     * "Now Viewing" pane, but is not necessarily shown on the map.  This property is observable.
     * @type {Boolean}
     */
    this.isEnabled = false;

    /**
     * Gets or sets a value indicating whether this data item is currently shown on the map.  In order to be shown,
     * the item must also be enabled.  This property is observable.
     * @type {Boolean}
     */
    this.isShown = false;

    /**
     * Gets or sets a value indicating whether the legend for this data item is currently visible.
     * This property is observable.
     * @type {Boolean}
     */
    this.isLegendVisible = true;

    /**
     * Gets or sets the clock parameters for this data item.  If this property is undefined, this data item
     * does not have any time-varying data.  This property is observable.
     * @type {DataSourceClock}
     */
    this.clock = undefined;

    /**
     * Gets or sets a value indicating whether this data source can be enabled via a checkbox in the Data Catalog Tab.
     * This property is observable.
     * @type {Boolean}
     */
    this.isEnableable = true;

    /**
     * Gets or sets a value indicating whether this data source is mappable and should therefore include a Zoom To button.
     * This property is observable.
     * @type {Boolean}
     */
    this.isMappable = true;

    /**
     * Gets or sets a value indicating whether this data source should show an info icon. This property is observable.
     * @type {Boolean}
     */
    this.showsInfo = true;

    /**
     * Gets or sets a message to show when this item is enabled for the first time in order to call attention to the Now Viewing panel.
     * @type {String}
     */
    this.nowViewingMessage = undefined;

    /**
     * Gets or sets a template to display message in a info box.
     * May be a string or an object with template, name and/or partials properties.
     * @type {String|Object}
     */
    this.featureInfoTemplate = undefined;

    /**
     * The maximum number of features whose information can be shown at one time in the FeatureInfoPanelViewModel, from this item.
     * Defaults to terria.configParameters.defaultMaximumShownFeatureInfos
     * @type {Number}
     */
    this.maximumShownFeatureInfos = terria.configParameters.defaultMaximumShownFeatureInfos;

    this.dateFormat = {};

    this._legendUrl = undefined;
    this._legendUrls = [];
    this._dataUrl = undefined;
    this._dataUrlType = undefined;

    knockout.track(this, ['rectangle', 'legendUrl', 'dataCustodian', 'attribution',
        'metadataUrl', 'isEnabled', 'isShown', 'isLegendVisible', 'clock', 'isMappable', 'isEnableable', 'showsInfo', 'nowViewingMessage',
        'url', '_legendUrl', '_legendUrls', '_dataUrl', '_dataUrlType', 'nowViewingCatalogItem']);

    var evaluatingLegendUrl = false;

    knockout.defineProperty(this, 'legendUrls', {
        get: function() {
            if (!defined(this._legendUrls) || this._legendUrls.length === 0) {
                var legendUrl = evaluatingLegendUrl ? undefined : this.legendUrl;
                if (defined(legendUrl) && defined(legendUrl.url) && legendUrl.url.length > 0) {
                    return [legendUrl];
                }
            }
            return this._legendUrls;
        },
        set: function(value) {
            this._legendUrls = value;
            this._legendUrl = undefined;
        }
    });

    knockout.defineProperty(this, 'legendUrl', {
        get: function() {
            evaluatingLegendUrl = true;
            try {
                if (defined(this._legendUrl)) {
                    return this._legendUrl;
                } else {
                    return this.legendUrls[0];
                }
            } finally {
                evaluatingLegendUrl = false;
            }
        },
        set: function(value) {
            this._legendUrl = value;
            this._legendUrls = undefined;
        }
    });

    /**
     * Gets or sets the URL from which this data item's raw data can be retrieved, or undefined if raw data for
     * this data item is not available.  This property is observable.
     * @member {String} dataUrl
     * @memberOf CatalogItem.prototype
     */
    knockout.defineProperty(this, 'dataUrl', {
        get : function() {
            // dataUrl is derived from url if not explicitly specified.
            if (defined(this._dataUrl)) {
                return this._dataUrl;
            }

            return this.url;
        },
        set : function(value) {
            this._dataUrl = value;
        }
    });

    /**
     * Gets or sets the type of the {@link CatalogItem#dataUrl}, or undefined if raw data for this data
     * source is not available.  This property is observable.
     * Valid values are:
     *  * `direct` - A direct link to the data.
     *  * `wfs` - A Web Feature Service (WFS) base URL.  If {@link CatalogItem#dataUrl} is not
     *            specified, the base URL will be this data item's URL.
     *  * `wfs-complete` - A complete, ready-to-use link to download features from a WFS server.
     *  * `none` - There is no data link.
     * @member {String} dataUrlType
     * @memberOf CatalogItem.prototype
     */
    knockout.defineProperty(this, 'dataUrlType', {
        get : function() {
            if (defined(this._dataUrlType)) {
                return this._dataUrlType;
            } else {
                return 'direct';
            }
        },
        set : function(value) {
            this._dataUrlType = value;
        }
    });

    knockout.getObservable(this, 'isEnabled').subscribe(function(newValue) {
        isEnabledChanged(this);
    }, this);

    knockout.getObservable(this, 'isShown').subscribe(function(newValue) {
        isShownChanged(this);
    }, this);
};

inherit(CatalogMember, CatalogItem);

defineProperties(CatalogItem.prototype, {
    /**
     * Gets a value indicating whether this data item, when enabled, can be reordered with respect to other data items.
     * Data items that cannot be reordered are typically displayed above reorderable data items.
     * @memberOf CatalogItem.prototype
     * @type {Boolean}
     */
    supportsReordering : {
        get : function() {
            return false;
        }
    },

    /**
     * Gets a value indicating whether the visibility of this data item can be toggled.
     * @memberOf CatalogItem.prototype
     * @type {Boolean}
     */
    supportsToggleShown : {
        get : function() {
            return true;
        }
    },

    /**
     * Gets a value indicating whether the opacity of this data item can be changed.
     * @memberOf CatalogItem.prototype
     * @type {Boolean}
     */
    supportsOpacity : {
        get : function() {
            return false;
        }
    },

    /**
     * Gets a value indicating whether this data item has a legend.
     * @memberOf CatalogItem.prototype
     * @type {Boolean}
     */
    hasLegend: {
        get: function() {
            return defined(this.legendUrl);
        }
    },

    /**
     * Gets the metadata associated with this data item and the server that provided it, if applicable.
     * @memberOf CatalogItem.prototype
     * @type {Metadata}
     */
    metadata : {
        get : function() {
            return CatalogItem.defaultMetadata;
        }
    },

    /**
     * Gets the set of functions used to update individual properties in {@link CatalogMember#updateFromJson}.
     * When a property name in the returned object literal matches the name of a property on this instance, the value
     * will be called as a function and passed a reference to this instance, a reference to the source JSON object
     * literal, and the name of the property.
     * @memberOf CatalogItem.prototype
     * @type {Object}
     */
    updaters : {
        get : function() {
            return CatalogItem.defaultUpdaters;
        }
    },

    /**
     * Gets the set of functions used to serialize individual properties in {@link CatalogMember#serializeToJson}.
     * When a property name on the model matches the name of a property in the serializers object lieral,
     * the value will be called as a function and passed a reference to the model, a reference to the destination
     * JSON object literal, and the name of the property.
     * @memberOf CatalogItem.prototype
     * @type {Object}
     */
    serializers : {
        get : function() {
            return CatalogItem.defaultSerializers;
        }
    },

    /**
     * Gets the set of names of the properties to be serialized for this object for a share link.
     * @memberOf CatalogItem.prototype
     * @type {String[]}
     */
    propertiesForSharing : {
        get : function() {
            return CatalogItem.defaultPropertiesForSharing;
        }
    }
});

/**
 * Gets or sets the default metadata to use for data items that don't provide anything better from their
 * {@link CatalogItem#metadata} property.  The default simply indicates that no metadata is available.
 * @type {Metadata}
 */
CatalogItem.defaultMetadata = new Metadata();
CatalogItem.defaultMetadata.isLoading = false;
CatalogItem.defaultMetadata.dataSourceErrorMessage = 'This data item does not have any details available.';
CatalogItem.defaultMetadata.serviceErrorMessage = 'This service does not have any details available.';

freezeObject(CatalogItem.defaultMetadata);

/**
 * Gets or sets the set of default updater functions to use in {@link CatalogMember#updateFromJson}.  Types derived from this type
 * should expose this instance - cloned and modified if necesary - through their {@link CatalogMember#updaters} property.
 * @type {Object}
 */
CatalogItem.defaultUpdaters = clone(CatalogMember.defaultUpdaters);
CatalogItem.defaultUpdaters.rectangle = function(catalogItem, json, propertyName) {
    if (defined(json.rectangle)) {
        catalogItem.rectangle = Rectangle.fromDegrees(json.rectangle[0], json.rectangle[1], json.rectangle[2], json.rectangle[3]);
    } else {
        catalogItem.rectangle = Rectangle.MAX_VALUE;
    }
};

CatalogItem.defaultUpdaters.attribution = function(catalogItem, json, prototypeName) {
    if(defined(json.attribution)){
        if((typeof json.attribution === 'object' && json.attribution.text) && json.attribution.link ){
            catalogItem.attribution = new Credit(json.attribution.text, undefined, json.attribution.link);
        }else if(typeof json.attribution === 'string'){
            catalogItem.attribution = new Credit(json.attribution, undefined, undefined);
        }
    }
};

CatalogItem.defaultUpdaters.legendUrl = function(catalogItem, json, prototypeName) {
    if (defined(json.legendUrl)) {
        var url, mimeType;

        if (typeof json.legendUrl === 'string') {
            url = json.legendUrl;
        } else {
            url = json.legendUrl.url;
            mimeType = json.legendUrl.mimeType;
        }

        catalogItem.legendUrl = new LegendUrl(url, mimeType);
    }
};

CatalogItem.defaultUpdaters.legendUrls = function(catalogItem, json, prototypeName) {
    if (defined(json.legendUrls)) {
        catalogItem.legendUrls = json.legendUrls.map(function(legendUrl) {
            var url, mimeType;

            if (typeof legendUrl === 'string') {
                url = legendUrl;
            } else {
                url = legendUrl.url;
                mimeType = legendUrl.mimeType;
            }

            return new LegendUrl(url, mimeType);
        });
    }
};

CatalogItem.defaultUpdaters.nowViewingCatalogItem = function(catalogItem, json, prototypeName, options) {
    if (defined(json.nowViewingCatalogItem)) {
        return when(catalogItem.load()).then(function() {
            if (!defined(catalogItem.nowViewingCatalogItem)) {
                catalogItem.nowViewingCatalogItem = createCatalogMemberFromType(json.nowViewingCatalogItem.type, catalogItem.terria);
            }
            return catalogItem.nowViewingCatalogItem.updateFromJson(json.nowViewingCatalogItem, options);
        });
    }
};

freezeObject(CatalogItem.defaultUpdaters);

/**
 * Gets or sets the set of default serializer functions to use in {@link CatalogMember#serializeToJson}.  Types derived from this type
 * should expose this instance - cloned and modified if necesary - through their {@link CatalogMember#serializers} property.
 * @type {Object}
 */
CatalogItem.defaultSerializers = clone(CatalogMember.defaultSerializers);
CatalogItem.defaultSerializers.rectangle = function(catalogItem, json, propertyName) {
    if (defined(catalogItem.rectangle)) {
        json.rectangle = [
            CesiumMath.toDegrees(catalogItem.rectangle.west),
            CesiumMath.toDegrees(catalogItem.rectangle.south),
            CesiumMath.toDegrees(catalogItem.rectangle.east),
            CesiumMath.toDegrees(catalogItem.rectangle.north)
        ];
    }
};

// Serialize the underlying properties instead of the public views of them.
CatalogItem.defaultSerializers.legendUrl = function(catalogItem, json, propertyName) {
    if (defined(catalogItem._legendUrl)) {
        json.legendUrl = catalogItem._legendUrl;
    }
};

CatalogItem.defaultSerializers.legendUrls = function(catalogItem, json, propertyName) {
    if (defined(catalogItem._legendUrls) && catalogItem._legendUrls.length > 0) {
        json.legendUrls = catalogItem._legendUrls;
    }
};

CatalogItem.defaultSerializers.attribution = function(catalogItem, json, propertyName) {
    if (defined(catalogItem.attribution)) {
        if (defined(catalogItem.attribution.link)) {
            json.attribution = {
                text: catalogItem.attribution.text,
                link: catalogItem.attribution.link
            };
        } else {
            json.attribution = catalogItem.attribution.text;
        }
    }
};

CatalogItem.defaultSerializers.dataUrl = function(catalogItem, json, prototypeName) {
    if(defined(catalogItem._dataUrl)){
           json.dataUrl = catalogItem._dataUrl;
        }
};

CatalogItem.defaultSerializers.dataUrlType = function(catalogItem, json, prototypeName) {
    if(defined(catalogItem._dataUrlType)){
           json.dataUrlType = catalogItem._dataUrlType;
        }
};

CatalogItem.defaultSerializers.nowViewingCatalogItem = function(catalogItem, json, prototypeName, options) {
    if (catalogItem.isEnabled && defined(catalogItem.nowViewingCatalogItem)) {
        json.nowViewingCatalogItem = catalogItem.nowViewingCatalogItem.serializeToJson(options);
    }
};

freezeObject(CatalogItem.defaultSerializers);

/**
 * Gets or sets the default set of properties that are serialized when serializing a {@link CatalogItem}-derived object
 * for a share link.
 * @type {String[]}
 */
CatalogItem.defaultPropertiesForSharing = clone(CatalogMember.defaultPropertiesForSharing);
CatalogItem.defaultPropertiesForSharing.push('isEnabled');
CatalogItem.defaultPropertiesForSharing.push('isShown');
CatalogItem.defaultPropertiesForSharing.push('isLegendVisible');
CatalogItem.defaultPropertiesForSharing.push('nowViewingIndex');
CatalogItem.defaultPropertiesForSharing.push('nowViewingCatalogItem');

freezeObject(CatalogItem.defaultPropertiesForSharing);

/**
 * Loads this catalog item, if it's not already loaded.  It is safe to
 * call this method multiple times.  The {@link CatalogItem#isLoading} flag will be set while the load is in progress.
 * Derived classes should implement {@link CatalogItem#_load} to perform the actual loading for the item.
 * Derived classes may optionally implement {@link CatalogItem#_getValuesThatInfluenceLoad} to provide an array containing
 * the current value of all properties that influence this item's load process.  Each time that {@link CatalogItem#load}
 * is invoked, these values are checked against the list of values returned last time, and {@link CatalogItem#_load} is
 * invoked again if they are different.  If {@link CatalogItem#_getValuesThatInfluenceLoad} is undefined or returns an
 * empty array, {@link CatalogItem#_load} will only be invoked once, no matter how many times
 * {@link CatalogItem#load} is invoked.
 *
 * @returns {Promise} A promise that resolves when the load is complete, or undefined if the item is already loaded.
 *
 */
CatalogItem.prototype.load = function() {
    var parentPromise = CatalogMember.prototype.load.call(this);

    if (parentPromise) {
        return parentPromise.then(function(loadResult) {
            if (loadResult instanceof CatalogItem) {
                this.nowViewingCatalogItem = loadResult;
                loadResult.creatorCatalogItem = this;
            }
            this.terria.currentViewer.notifyRepaintRequired();
        }.bind(this)).otherwise(function(e) {
            this.isEnabled = false;
            throw e; // keep throwing this so we can chain more otherwises.
        }.bind(this));
    }
};

/**
 * When implemented in a derived class, this method loads the item.  The base class implementation does nothing.
 * This method should not be called directly; call {@link CatalogItem#load} instead.
 * @return {Promise} A promise that resolves when the load is complete.
 * @protected
 */
CatalogItem.prototype._load = function() {
    return when();
};

var emptyArray = freezeObject([]);

/**
 * When implemented in a derived class, gets an array containing the current value of all properties that
 * influence this item's load process.  See {@link CatalogItem#load} for more information on when and
 * how this is used.  The base class implementation returns an empty array.
 * @return {Array} The array of values that influence the load process.
 * @protected
 */
CatalogItem.prototype._getValuesThatInfluenceLoad = function() {
    // In the future, we can implement auto-reloading when any of these properties change.  Just create a knockout
    // computed property that calls this method and subscribe to change notifications on that computed property.
    // (Will need to use the rateLimit extender, presumably).
    return emptyArray;
};

/**
 * Toggles the {@link CatalogItem#isEnabled} property of this item.  If it is enabled, calling this method
 * will disable it.  If it is disabled, calling this method will enable it.
 *
 * @returns {Boolean} true if the item is now enabled, false if it is now disabled.
 */
 CatalogItem.prototype.toggleEnabled = function() {
    this.isEnabled = !this.isEnabled;
    return this.isEnabled;
};

/**
 * Toggles the {@link CatalogItem#isShown} property of this item.  If it is shown, calling this method
 * will hide it.  If it is hidden, calling this method will show it.
 *
 * @returns {Boolean} true if the item is now shown, false if it is now hidden.
 */
 CatalogItem.prototype.toggleShown = function() {
    this.isShown = !this.isShown;
    return this.isShown;
};

/**
 * Toggles the {@link CatalogItem#isLegendVisible} property of this item.  If it is visible, calling this
 * method will hide it.  If it is hidden, calling this method will make it visible.
 * @return {Boolean} true if the legend is now visible, false if it is now hidden.
 */
CatalogItem.prototype.toggleLegendVisible = function() {
    this.isLegendVisible = !this.isLegendVisible;
    return this.isLegendVisible;
};

var scratchRectangle = new Rectangle();

/**
 * Moves the camera so that the item's bounding rectangle is visible.  If {@link CatalogItem#rectangle} is
 * undefined or covers more than about half the world in the longitude direction, or if the data item is not enabled
 * or not shown, this method does nothing.  Because the zoom may happen asynchronously (for example, if the item's
 * rectangle is not yet known), this method returns a Promise that resolves when the zoom animation starts.
 * @returns {Promise} A promise that resolves when the zoom animation starts.
 */
 CatalogItem.prototype.zoomTo = function() {
    var that = this;
    return when(this.load(), function() {
        if (defined(that.nowViewingCatalogItem)) {
            return that.nowViewingCatalogItem.zoomTo();
        }

        if (!defined(that.rectangle)) {
            return;
        }

        var rect = Rectangle.clone(that.rectangle, scratchRectangle);

        if (rect.east - rect.west > 3.14) {
            rect = Rectangle.clone( that.terria.homeView.rectangle, scratchRectangle);
            console.log('Extent is wider than world so using homeView.');
        }

        var terria =  that.terria;
        terria.analytics.logEvent('dataSource', 'zoomTo', that.name);

        var epsilon = CesiumMath.EPSILON3;

        if (rect.east === rect.west) {
            rect.east += epsilon;
            rect.west -= epsilon;
        }

        if (rect.north === rect.south) {
            rect.north += epsilon;
            rect.south -= epsilon;
        }
        return terria.currentViewer.zoomTo(rect);
    });
};

/**
 * Uses the {@link CatalogItem#clock} settings from this data item.  If this data item
 * has no clock settings, this method does nothing.  Because the clock update may happen asynchronously
 * (for example, if the item's clock parameters are not yet known), this method returns a Promise that
 * resolves when the clock has been updated.
 * @returns {Promise} A promise that resolves when the clock has been updated.
 */
CatalogItem.prototype.useClock = function() {
    var that = this;
    return when(this.load(), function() {
        if (defined(that.nowViewingCatalogItem)) {
            return that.nowViewingCatalogItem.useClock();
        }

        if (defined(that.clock)) {
            if (that.isEnabled && that.isShown) {
                that.terria.timeSeriesStack.addLayerToTop(that);
            } else {
                that.terria.timeSeriesStack.removeLayer(that);
            }
        }
    });
};

/**
 * Moves the camera so that the data item's bounding rectangle is visible, and updates the TerriaJS clock according to this
 * data item's clock settings.  This method simply calls {@link CatalogItem#zoomTo} and
 * {@link CatalogItem#useClock}.  Because the zoom and clock update may happen asynchronously (for example, if the item's
 * rectangle is not yet known), this method returns a Promise that resolves when the zoom animation starts and the clock
 * has been updated.
 * @returns {Promise} A promise that resolves when the clock has been updated and the zoom animation has started.
 */
CatalogItem.prototype.zoomToAndUseClock = function() {
    return when.all([this.zoomTo(), this.useClock()]);
};

/**
 * Enables this data item on the globe or map.  This method:
 * * Should not be called directly.  Instead, set the {@link CatalogItem#isEnabled} property to true.
 * * Will not necessarily be called immediately when {@link CatalogItem#isEnabled} is set to true; it will be deferred until
 *   {@link CatalogItem#isLoading} is false.
 * * Should NOT also show the data item on the globe/map (see {@link CatalogItem#_show}), so in some cases it may not do
 *   anything at all.
 * * Calls {@link CatalogItem#_enableInCesium} or {@link CatalogItem#_enableInLeaflet} in the base-class implementation,
 *   depending on which viewer is active.  Derived classes that have identical enable logic for both viewers may override
 *   this method instead of the viewer-specific ones.
 * @protected
 */
CatalogItem.prototype._enable = function() {
    if (defined(this.nowViewingCatalogItem)) {
        this.nowViewingCatalogItem.isEnabled = true;
        return;
    }

    var terria =  this.terria;

    if (defined(terria.cesium)) {
        terria.cesium.stoppedRendering = true;
        this._enableInCesium();
    }

    if (defined(terria.leaflet)) {
        this._enableInLeaflet();
    }
};

/**
 * Disables this data item on the globe or map.  This method:
 * * Should not be called directly.  Instead, set the {@link CatalogItem#isEnabled} property to false.
 * * Will not be called if {@link CatalogItem#_enable} was not called (for example, because the previous call was deferred
 *   while the data item loaded, and the user disabled the data item before the load completed).
 * * Will only be called after {@link CatalogItem#_hide} when a shown data item is disabled.
 * * Calls {@link CatalogItem#_disableInCesium} or {@link CatalogItem#_disableInLeaflet} in the base-class implementation,
 *   depending on which viewer is active.  Derived classes that have identical disable logic for both viewers may override
 *   this method instead of the viewer-specific ones.
 * @protected
 */
CatalogItem.prototype._disable = function() {
    if (defined(this.nowViewingCatalogItem)) {
        this.nowViewingCatalogItem.isEnabled = false;
        return;
    }

    var terria =  this.terria;

    if (defined(terria.cesium)) {
        this._disableInCesium();
    }

    if (defined(terria.leaflet)) {
        this._disableInLeaflet();
    }
};

/**
 * Shows this data item on the globe or map.  This method:
 * * Should not be called directly.  Instead, set the {@link CatalogItem#isShown} property to true.
 * * Will only be called after {@link CatalogItem#_enable}; you can count on that method having been called first.
 * * Will not necessarily be called immediately when {@link CatalogItem#isShown} is set to true; it will be deferred until
 *   {@link CatalogItem#isLoading} is false.
 * * Calls {@link CatalogItem#_showInCesium} or {@link CatalogItem#_showInLeaflet} in the base-class implementation,
 *   depending on which viewer is active.  Derived classes that have identical show logic for both viewers
 *    may override this method instead of the viewer-specific ones.
 * @protected
 */
CatalogItem.prototype._show = function() {
    if (defined(this.nowViewingCatalogItem)) {
        this.nowViewingCatalogItem.isShown = true;
        return;
    }

    var terria =  this.terria;

    if (defined(terria.cesium)) {
        this._showInCesium();
    }

    if (defined(terria.leaflet)) {
        this._showInLeaflet();
    }
};

/**
 * Hides this data item on the globe or map.  This method:
 * * Should not be called directly.  Instead, set the {@link CatalogItem#isShown} property to false.
 * * Will not be called if {@link CatalogItem#_show} was not called (for example, because the previous call was deferred
 *   while the data item loaded, and the user hid the data item before the load completed).
 * * Calls {@link CatalogItem#_hideInCesium} or {@link CatalogItem#_hideInLeaflet} in the base-class implementation,
 *   depending on which viewer is active.  Derived classes that have identical hide logic for both viewers may override
 *   this method instead of the viewer-specific ones.
 * @protected
 */
CatalogItem.prototype._hide = function() {
    if (defined(this.nowViewingCatalogItem)) {
        this.nowViewingCatalogItem.isShown = false;
        return;
    }

    var terria =  this.terria;

    if (defined(terria.cesium)) {
        this._hideInCesium();
    }

    if (defined(terria.leaflet)) {
        this._hideInLeaflet();
    }
};

/**
 * When implemented in a derived class, enables this data item on the Cesium globe.  You should not call this
 * directly, but instead set the {@link CatalogItem#isEnabled} property to true.  See
 * {@link CatalogItem#_enable} for more information.
 * @abstract
 * @protected
 */
CatalogItem.prototype._enableInCesium = function() {
    throw new DeveloperError('_enableInCesium must be implemented in the derived class.');
};

/**
 * When implemented in a derived class, disables this data item on the Cesium globe.  You should not call this
 * directly, but instead set the {@link CatalogItem#isEnabled} property to false.  See
 * {@link CatalogItem#_disable} for more information.
 * @abstract
 * @protected
 */
CatalogItem.prototype._disableInCesium = function() {
    throw new DeveloperError('_disableInCesium must be implemented in the derived class.');
};

/**
 * When implemented in a derived class, shows this data item on the Cesium globe.  You should not call this
 * directly, but instead set the {@link CatalogItem#isShown} property to true.  See
 * {@link CatalogItem#_show} for more information.
 * @abstract
 * @protected
 */
CatalogItem.prototype._showInCesium = function() {
    throw new DeveloperError('_showInCesium must be implemented in the derived class.');
};

/**
 * When implemented in a derived class, hides this data item on the Cesium globe.  You should not call this
 * directly, but instead set the {@link CatalogItem#isShown} property to false.  See
 * {@link CatalogItem#_hide} for more information.
 * @abstract
 * @protected
 */
CatalogItem.prototype._hideInCesium = function() {
    throw new DeveloperError('_hideInCesium must be implemented in the derived class.');
};

/**
 * When implemented in a derived class, enables this data item on the Leaflet map.  You should not call this
 * directly, but instead set the {@link CatalogItem#isEnabled} property to true.  See
 * {@link CatalogItem#_enable} for more information.
 * @abstract
 * @protected
 */
CatalogItem.prototype._enableInLeaflet = function() {
    throw new DeveloperError('enableInLeaflet must be implemented in the derived class.');
};

/**
 * When implemented in a derived class, disables this data item on the Leaflet map.  You should not call this
 * directly, but instead set the {@link CatalogItem#isEnabled} property to false.  See
 * {@link CatalogItem#_disable} for more information.
 * @abstract
 * @protected
 */
CatalogItem.prototype._disableInLeaflet = function() {
    throw new DeveloperError('disableInLeaflet must be implemented in the derived class.');
};

/**
 * When implemented in a derived class, shows this data item on the Leaflet map.  You should not call this
 * directly, but instead set the {@link CatalogItem#isShown} property to true.  See
 * {@link CatalogItem#_show} for more information.
 * @abstract
 * @protected
 */
CatalogItem.prototype._showInLeaflet = function() {
    throw new DeveloperError('_showInLeaflet must be implemented in the derived class.');
};

/**
 * When implemented in a derived class, hides this data item on the Leaflet map.  You should not call this
 * directly, but instead set the {@link CatalogItem#isShown} property to false.  See
 * {@link CatalogItem#_hide} for more information.
 * @abstract
 * @protected
 */
CatalogItem.prototype._hideInLeaflet = function() {
    throw new DeveloperError('_hideInLeaflet must be implemented in the derived class.');
};

CatalogItem.prototype.enableWithParents = function() {
    this.isEnabled = true;

    if (this.parent) {
        this.parent.enableWithParents();
    }
};

function isEnabledChanged(catalogItem) {
    var terria = catalogItem.terria;

    if (defined(catalogItem.creatorCatalogItem)) {
        catalogItem.creatorCatalogItem.isEnabled = catalogItem.isEnabled;
    }

    if (catalogItem.isEnabled) {
        terria.nowViewing.add(catalogItem);

        // Load this catalog item's data (if we haven't already) when it is enabled.
        // Don't actually enable until the load finishes.
        // Be careful not to call _enable multiple times or to call _enable
        // after the item has already been disabled.
        if (!defined(catalogItem._loadForEnablePromise)) {
            var resolvedOrRejected = false;
            var loadPromise = when.all([catalogItem.load(), catalogItem.waitForDisclaimerIfNeeded()]).then(function() {
                if (catalogItem.isEnabled) {
                    // If there's a separate now viewing item, remove this catalog item from the
                    // now viewing list, if it exists.
                    if (defined(catalogItem.nowViewingCatalogItem)) {
                        catalogItem.terria.nowViewing.items.remove(catalogItem);
                    }

                    catalogItem._enable();
                    catalogItem.terria.currentViewer.notifyRepaintRequired();
                    catalogItem.terria.currentViewer.addAttribution(catalogItem.attribution);
                    if(defined(catalogItem.imageryLayer)){
                      catalogItem.imageryLayer.featureInfoTemplate = catalogItem.featureInfoTemplate;
                    }
                }
            });

            raiseErrorOnRejectedPromise(catalogItem.terria, loadPromise);

            loadPromise.always(function() {
                resolvedOrRejected = true;
                catalogItem._loadForEnablePromise = undefined;
            });

            // Make sure we know about it when the promise already resolved/rejected.
            catalogItem._loadForEnablePromise = resolvedOrRejected ? undefined : loadPromise;
        }

        catalogItem.isShown = true;

        terria.analytics.logEvent('dataSource', 'added', catalogItem.name);
        catalogItem._enabledDate = Date.now();
    } else {
        catalogItem.isShown = false;

        // Disable this data item on the map, but only if the previous request to enable it has
        // actually gone through.
        if (!defined(catalogItem._loadForEnablePromise)) {
            catalogItem._disable();
            catalogItem.terria.currentViewer.removeAttribution(catalogItem.attribution);
        }

        terria.nowViewing.remove(catalogItem);

        var duration;
        if (catalogItem._enabledDate) {
            duration = ((Date.now() - catalogItem._enabledDate) / 1000.0) | 0;
        }
        terria.analytics.logEvent('dataSource', 'removed', catalogItem.name, duration);
    }

    catalogItem.terria.currentViewer.notifyRepaintRequired();
}

function isShownChanged(catalogItem) {
    if (defined(catalogItem.creatorCatalogItem)) {
        catalogItem.creatorCatalogItem.isShown = catalogItem.isShown;
    }

    if (catalogItem.isShown) {
        // If the item is not enabled, do that first.  This way things will work even if isShown is
        // deserialized before isEnabled.
        catalogItem.isEnabled = true;

        // If enabling is waiting on an async load, we need to wait on it, too.
        raiseErrorOnRejectedPromise(catalogItem.terria, when(catalogItem._loadForEnablePromise, function() {
            if (catalogItem.isEnabled && catalogItem.isShown) {
                catalogItem._show();
                catalogItem.useClock();
                catalogItem.terria.currentViewer.notifyRepaintRequired();
            }
        }));

        catalogItem.terria.analytics.logEvent('dataSource', 'shown', catalogItem.name);
        catalogItem._shownDate = Date.now();
    } else {
        // Hide this data item on the map, but only if the previous request to show it has
        // actually gone through.
        if (!defined(catalogItem._loadForEnablePromise)) {
            catalogItem._hide();
            catalogItem.useClock();
        }


        var duration;
        if (defined(catalogItem._shownDate)) {
            duration = ((Date.now() - catalogItem._shownDate) / 1000.0) | 0;
        } else if (catalogItem._enabledDate) {
            duration = ((Date.now() - catalogItem._enabledDate) / 1000.0) | 0;
        }
        catalogItem.terria.analytics.logEvent('dataSource', 'hidden', catalogItem.name, duration);
    }

    catalogItem.terria.currentViewer.notifyRepaintRequired();
}

module.exports = CatalogItem;
