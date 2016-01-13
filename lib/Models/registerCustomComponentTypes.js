'use strict';

/*global require*/

var CustomComponents = require('./CustomComponents');
var CustomComponentType = require('./CustomComponentType');
var CollapsibleViewModel = require('../ViewModels/CollapsibleViewModel');

/**
 * Registers custom component types.
 * 
 * @param  {Object} [options] Options.
 */
var registerCustomComponentTypes = function(options) {

	// You can also pass a 'customSetup' property.
    var collapsibleComponentType = new CustomComponentType({
        name: 'collapsible',
        render: function(element) {
            var collapsibleViewModel = new CollapsibleViewModel(element.attributes.name, element.attributes.open);
            collapsibleViewModel.show(document.getElementById(element.containerId));
        }
    });
    CustomComponents.register(collapsibleComponentType);

};

module.exports = registerCustomComponentTypes;

// TODO: Think about this comment:
// This logic will be pretty much the same for all components, right? Wouldn't something like this be sufficient?
//     customComponents.register('collapsible', CollapsibleViewModel);
// The render would always just pass element.attributes to the constructor.


// Note for charts it currently looks like this:

// -    var chartComponentType = new CustomComponentType({
// -        name: 'chart',
// -        customSetup: function(customComponentElement) {
// -            extractTitleFromTable(customComponentElement);
// -            // assume all charts shown as custom components are expandable and downloadable
// -            customComponentElement.attributes.canExpand = true;
// -            customComponentElement.attributes.canDownload = true;
// -        },
// -        render: function(element) {
// -            var chartViewModel = new ChartViewModel(options.chartPanelViewModel, element.owner, element.attributes.srcPreview || element.attributes.src, element.attributes);
// -            chartViewModel.show(document.getElementById(element.containerId));
// -        }
// -    });
// -    customComponents.register(chartComponentType);
