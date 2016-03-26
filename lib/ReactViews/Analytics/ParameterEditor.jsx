'use strict';
import React from 'react';
import ObserveModelMixin from '../ObserveModelMixin';
import PointParameterEditor from './PointParameterEditor';
import RegionParameterEditor from './RegionParameterEditor';
import RegionTypeParameterEditor from './RegionTypeParameterEditor';
import RegionDataParameterEditor from './RegionDataParameterEditor';
import BooleanParameterEditor from './BooleanParameterEditor';

const ParameterEditor = React.createClass({
    mixins: [ObserveModelMixin],

    propTypes: {
        parameter: React.PropTypes.object,
        onChange: React.PropTypes.func,
        viewState: React.PropTypes.object,
        parameterValues: React.PropTypes.object,
        previewed: React.PropTypes.object
    },

    fieldId: new Date().getTime(),

    onChange(e) {
        this.props.parameterValues[this.props.parameter.id] = e.target.value;
    },

    renderEditor() {
        switch(this.props.parameter.type) {
        case 'point':
            return <PointParameterEditor previewed={this.props.previewed}
                                         viewState={this.props.viewState}
                                         parameter={this.props.parameter}
                                         parameterValues={this.props.parameterValues}
                    />;
        case 'enumeration':
            return <select className='field'
                           onChange={this.onChange}
                           value={this.props.parameterValues[this.props.parameter.id]}
                    >
                         {this.props.parameter.possibleValues.map((v, i)=>
                            <option value={v} key={i}>{v}</option>)}
                    </select>;
        case 'dateTime':
            return <input className='field'
                          type="datetime-local"
                          placeholder="YYYY-MM-DDTHH:mm:ss.sss"
                          onChange={this.onChange}
                          value={this.props.parameterValues[this.props.parameter.id]}
                    />;
        case 'region':
            return <RegionParameterEditor previewed={this.props.previewed}
                                          parameter={this.props.parameter}
                                          parameterValues={this.props.parameterValues}
                    />;
        case 'regionType':
            return <RegionTypeParameterEditor previewed={this.props.previewed}
                                              parameter={this.props.parameter}
                                              parameterValues={this.props.parameterValues}
                    />;
        case 'regionData':
            return <RegionDataParameterEditor previewed={this.props.previewed}
                                              parameter={this.props.parameter}
                                              parameterValues={this.props.parameterValues}
                    />;
        case 'boolean':
            return <BooleanParameterEditor previewed={this.props.previewed}
                                           parameter={this.props.parameter}
                                           parameterValues={this.props.parameterValues}
                    />;
        default:
            return <input className='field'
                          type="text"
                          onChange={this.onChange}
                          value={this.props.parameterValues[this.props.parameter.id]}
                    />;
        }
    },

    render() {
        return (<form>
                  <label className='label--parameter-editor' htmlFor={this.fieldId + this.props.parameter.type}>{this.props.parameter.name}{this.props.parameter.isRequired && <span>(required)</span>}</label>
                  <div id={this.fieldId + this.props.parameter.type} className='field--parameter-editor'>{this.renderEditor()}</div>
                </form>);
    }
});

module.exports = ParameterEditor;