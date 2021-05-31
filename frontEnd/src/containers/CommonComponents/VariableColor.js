import {Component} from "react";
import "./VariableColor.css"

export default class VariableColor extends  Component{
    constructor(props) {
        super(props);
        this.colorStyle={
            'background-color' :props.color
        };
        this.text=props.text;
        this.size={
            'font-size':this.props.fontSize
        };
    }

    render() {

        return (
          <div style={this.size} className='VariableColor'>
              <span style={this.colorStyle}/>
              <h1 className='VariableColor-color'>{this.text}</h1>
          </div>
        );
    }

}