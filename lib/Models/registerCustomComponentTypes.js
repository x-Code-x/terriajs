'use strict';

/*global require*/

var CustomComponents = require('./CustomComponents');
var CustomComponentType = require('./CustomComponentType');
var CollapsibleViewModel = require('../ViewModels/CollapsibleViewModel');

/**
 * Registers custom component types.
 * 
 * @param  {Object} [options] Options.
 * @param  {ChartPanelViewModel} [options.chartPanelViewModel] The chartPanelViewModel, if available.
 */
var registerCustomComponentTypes = function(options) {

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
