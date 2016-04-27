'use strict';

/*global require*/
var defaultValue = require('terriajs-cesium/Source/Core/defaultValue');
var defined = require('terriajs-cesium/Source/Core/defined');
var knockout = require('terriajs-cesium/Source/ThirdParty/knockout');

var CatalogMemberControl = require('./CatalogMemberControl');
var CatalogItemInfoViewModel = require('./CatalogItemInfoViewModel');
var ExplorerTabViewModel = require('./ExplorerTabViewModel');
var inherit = require('../Core/inherit');
var loadView = require('../Core/loadView');
var LegendSectionViewModel = require('./LegendSectionViewModel');
var OpacitySectionViewModel = require('./OpacitySectionViewModel');
var AbsPercentageSectionViewModel = require('./AbsPercentageSectionViewModel');
var ConceptsSectionViewModel = require('./ConceptsSectionViewModel');

var svgArrowDown = require('../SvgPaths/svgArrowDown');
var svgArrowRight = require('../SvgPaths/svgArrowRight');
var svgInfo = require('../SvgPaths/svgInfo');
var svgReorder = require('../SvgPaths/svgReorder');
var svgVisible = require('../SvgPaths/svgVisible');
var svgInvisible = require('../SvgPaths/svgInvisible');

var NowViewingTabViewModel = function(options) {
    ExplorerTabViewModel.call(this, defaultValue(options.name, 'Now Viewing'), defaultValue(options.name, 'NowViewing'));

    this.nowViewing = options.nowViewing;
    this.badgeText = this.nowViewing.items.length === 0 ? undefined : this.nowViewing.items.length;
    this.noDataText = defaultValue(options.noDataText, "Add data using the Data Catalogue tab.");

    this.svgArrowDown = defaultValue(options.svgArrowDown, svgArrowDown);
    this.svgArrowRight = defaultValue(options.svgArrowRight, svgArrowRight);
    this.svgInfo = defaultValue(options.svgInfo, svgInfo);
    this.svgReorder = defaultValue(options.svgReorder, svgReorder);
    this.svgVisible = defaultValue(options.svgVisible, svgVisible);
    this.svgInvisible = defaultValue(options.svgInvisible, svgInvisible);

    this._draggedItem = undefined;
    this._itemDropped = false;
    this._dragPlaceholder = undefined;

    this._lastNumberOfItems = -1;

    var that = this;
    this.panelHasFocus = knockout.observable(false);
    knockout.getObservable(this, 'isActive').subscribe(function(newValue) {
        // Make sure that at least one item is showing its legend when this tab is activated.
        if (newValue) {
            var nowViewingItems = that.nowViewing.items;

            var oneIsOpen = false;
            for (var i = 0; !oneIsOpen && i < nowViewingItems.length; ++i) {
                oneIsOpen = nowViewingItems[i].isLegendVisible;
            }

            if (!oneIsOpen && nowViewingItems.length > 0) {
                nowViewingItems[0].isLegendVisible = true;
            }

            window.setTimeout(function(){
              that.panelHasFocus(true);
          }, 300);
        }
    }, this);

    knockout.getObservable(this.nowViewing, 'items').subscribe(function() {
        this.badgeText = this.nowViewing.items.length === 0 ? undefined : this.nowViewing.items.length;

        if (this.nowViewing.items.length > this._lastNumberOfItems) {
            this.popBadge();
        }

        this._lastNumberOfItems = this.nowViewing.items.length;
    }, this);
};

inherit(ExplorerTabViewModel, NowViewingTabViewModel);

/**
 * Specifies the set up sections that may be shown on the Now Viewing tab.  Only sections that are compatible with the catalog item
 * are shown for that catalog item.  Shown sections appear in the same order that they appear in this array.
 * @type {Array}
 */
NowViewingTabViewModel.sections = [
    OpacitySectionViewModel,
    AbsPercentageSectionViewModel,
    LegendSectionViewModel,
    ConceptsSectionViewModel
];

NowViewingTabViewModel.prototype.show = function(container) {
    loadView(require('../Views/NowViewingTab.html'), container, this);
};

NowViewingTabViewModel.prototype.showInfo = function(item) {
    item.terria.analytics.logEvent('dataSource', 'info', item.name);
    CatalogItemInfoViewModel.open('ui', item);
};

NowViewingTabViewModel.prototype.dragStart = function(viewModel, e) {
    viewModel.terria.analytics.logEvent('dataSource', 'reorder', viewModel.name);

    // The user drags .now-viewing-item-top-row, but really we want to drag the entire .now-viewing-item, its parent.
    if (!e.target || !e.target.parentElement) {
        return;
    }

    this._draggedItem = e.target.parentElement;
    this._itemDropped = false;

    // If the item's legend is open, close it before starting the drag.
    viewModel.isLegendVisible = false;

    this._dragPlaceholder = document.createElement('div');
    this._dragPlaceholder.className = 'now-viewing-drop-target';
    this._dragPlaceholder.style.height = this._draggedItem.clientHeight + 'px';

    var that = this;
    this._dragPlaceholder.addEventListener('drop', function(e) {
        that._itemDropped = true;
        e.preventDefault();
    }, false);

    this._dragPlaceholder.addEventListener('dragenter', function(e) {
        e.preventDefault();
    }, false);

    this._dragPlaceholder.addEventListener('dragover', function(e) {
        e.preventDefault();
    }, false);

    if (defined(e.dataTransfer)) {
        e.dataTransfer.setData('text', 'Dragging a Now Viewing item.');
    } else {
        e.originalEvent.dataTransfer.setData('text', 'Dragging a Now Viewing item.');
    }

    return true;
};

NowViewingTabViewModel.prototype.dragEnd = function(viewModel, e) {
    if (this._itemDropped) {
        var draggedItemIndex = this._draggedItem.getAttribute('nowViewingIndex') | 0;
        var placeholderIndex = this._dragPlaceholder.getAttribute('nowViewingIndex') | 0;

        if (placeholderIndex >= draggedItemIndex) {
            --placeholderIndex;
        }

        while (draggedItemIndex > placeholderIndex) {
            this.nowViewing.raise(viewModel);
            --draggedItemIndex;
        }
        while (draggedItemIndex < placeholderIndex) {
            this.nowViewing.lower(viewModel);
            ++draggedItemIndex;
        }

        // Reordering will trigger a badge pop because we remove/re-add items.
        // Cancel the pop.
        this.unpopBadge();
    }

    if (defined(this._draggedItem)) {
        this._draggedItem.style.display = 'block';
    }

    if (defined(this._dragPlaceholder)) {
        if (this._dragPlaceholder.parentElement) {
            this._dragPlaceholder.parentElement.removeChild(this._dragPlaceholder);
        }
        this._dragPlaceholder = undefined;
    }
};

NowViewingTabViewModel.prototype.dragEnter = function(viewModel, e) {
    if (!defined(this._draggedItem)) {
        return;
    }

    if (defined(e.dataTransfer)) {
        e.dataTransfer.dropEffect = 'move';
    } else {
        e.originalEvent.dataTransfer.dropEffect = 'move';
    }

    this._draggedItem.style.display = 'none';

    // Add the placeholder above the entered element.
    // If the placeholder is already above the entered element, move it below.
    // TODO: this logic is imperfect, but good enough for now.
    var placeholderIndex;
    var targetIndex;

    var parent = e.currentTarget.parentElement;
    var siblings = parent.childNodes;
    for (var i = 0; i < siblings.length; ++i) {
        if (siblings[i] === this._dragPlaceholder) {
            placeholderIndex = i;
        }
        if (siblings[i] === e.currentTarget) {
            targetIndex = i;
        }
    }

    var insertBefore = true;
    if (placeholderIndex === targetIndex - 1) {
        var placeholderRect = this._dragPlaceholder.getBoundingClientRect();
        var placeholderHeight = placeholderRect.bottom - placeholderRect.top;

        var targetRect = e.currentTarget.getBoundingClientRect();
        var currentY = e.clientY;

        if (currentY > targetRect.bottom - placeholderHeight) {
            insertBefore = false;
        }
    }

    var doInsert = false;
    var nodeToInsertBefore;
    if (insertBefore && placeholderIndex !== targetIndex - 1) {
        nodeToInsertBefore = e.currentTarget;
        this._dragPlaceholder.setAttribute('nowViewingIndex', nodeToInsertBefore.getAttribute('nowViewingIndex'));
        doInsert = true;
    } else if (!insertBefore && placeholderIndex !== targetIndex + 1) {
        nodeToInsertBefore = siblings[targetIndex + 1];

        // IE doesn't like to insert before undefined, but null is fine.
        if (!nodeToInsertBefore || !defined(nodeToInsertBefore.getAttribute)) {
            nodeToInsertBefore = null;
            this._dragPlaceholder.setAttribute('nowViewingIndex', this.nowViewing.items.length);
        } else {
            this._dragPlaceholder.setAttribute('nowViewingIndex', nodeToInsertBefore.getAttribute('nowViewingIndex'));
        }
        doInsert = true;
    }

    if (doInsert) {
        if (this._dragPlaceholder.parentElement) {
            this._dragPlaceholder.parentElement.removeChild(this._dragPlaceholder);
        }

        e.currentTarget.parentElement.insertBefore(this._dragPlaceholder, nodeToInsertBefore);
    }

    e.preventDefault();
};

NowViewingTabViewModel.prototype.selectStart = function(viewModel, e) {
    // This function works around problems in IE9 where block divs are not draggable even when draggable="true".
    if (!viewModel.supportsReordering || !e || !e.currentTarget || !e.currentTarget.dragDrop) {
        return;
    }

    e.currentTarget.dragDrop();
    return false;
};

NowViewingTabViewModel.prototype.getItemControls = function(item) {
    var right = CatalogMemberControl.rightSideMemberControls(item);
    var left = CatalogMemberControl.leftSideMemberControls(item);
    left.push.apply(left, right);
    return left;
};

NowViewingTabViewModel.prototype.getSections = function(item) {
    var result = [];
    for (var i = 0; i < NowViewingTabViewModel.sections.length; ++i) {
        var section = NowViewingTabViewModel.sections[i].createForCatalogMember(this, item);
        if (defined(section)) {
            result.push(section);
        }
    }
    return result;
};

module.exports = NowViewingTabViewModel;
