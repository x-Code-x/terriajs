'use strict';

/*global require*/
var defaultValue = require('terriajs-cesium/Source/Core/defaultValue');
var defined = require('terriajs-cesium/Source/Core/defined');
var DeveloperError = require('terriajs-cesium/Source/Core/DeveloperError');
var knockout = require('terriajs-cesium/Source/ThirdParty/knockout');

var loadView = require('../Core/loadView');

var NowViewingAttentionGrabberViewModel = function(options) {
    if (!defined(options) || !defined(options.terria)) {
        throw new DeveloperError('options.terria is required');
    }

    this.terria = options.terria;
    this.defaultMessage = defaultValue(options.defaultMessage, 'Look here for the **legend** and for dataset options.');
    this.message = this.defaultMessage;
    this.isVisible = defaultValue(options.isVisible, false);
    this.onlyShowOncePerKeyAcrossSessions = defaultValue(options.onlyShowOncePerKeyAcrossSessions, true);
    this.nowViewingTabViewModel = options.nowViewingTabViewModel;
    this._shownBefore = {};

    knockout.track(this, ['isVisible', 'message']);

    knockout.getObservable(this.terria.nowViewing, 'items').subscribe(function() {
        if (this.terria.nowViewing.items.length > 0) {
            var topItem = this.terria.nowViewing.items[0];
            var message = this.defaultMessage;
            if (topItem.nowViewingMessage) {
                message = topItem.nowViewingMessage;
            }

            if (!shownBefore(this, message)) {
                this.message = message;
                this.isVisible = true;

                this._shownBefore[message] = true;
                if (this.onlyShowOncePerKeyAcrossSessions) {
                    this.terria.setLocalProperty('NowViewingAttentionGrabberViewModel.' + message, true);
                }
            }
        }
    }, this);

    // Hide the info when the Now Viewing tab is selected.
    if (defined(this.nowViewingTabViewModel)) {
        knockout.getObservable(this.nowViewingTabViewModel, 'isActive').subscribe(function() {
            this.close();
        }, this);
    }
};

NowViewingAttentionGrabberViewModel.prototype.show = function(container) {
    loadView(require('../Views/NowViewingAttentionGrabber.html'), container, this);
};

NowViewingAttentionGrabberViewModel.prototype.close = function() {
    this.isVisible = false;
};

NowViewingAttentionGrabberViewModel.create = function(options) {
    var result = new NowViewingAttentionGrabberViewModel(options);
    result.show(options.container);
    return result;
};

function shownBefore(viewModel, itemKey) {
    if (viewModel.onlyShowOncePerKeyAcrossSessions) {
        return viewModel.terria.getLocalProperty('NowViewingAttentionGrabberViewModel.' + itemKey) ||
            viewModel._shownBefore[itemKey];
    }
}

module.exports = NowViewingAttentionGrabberViewModel;
