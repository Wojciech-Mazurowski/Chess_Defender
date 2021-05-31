import React, {Component} from 'react';
import "./SectionTitle.css";

class SectionTitle extends Component {
    constructor(props) {
        super(props);
        this.title = props.title;
    }

    render() {
        return (
            <div className="SectionTitle">
                <div className="SectionTitle-title">{this.title}</div>
                <div className="SectionTitle-ornament"/>
            </div>
        );
    }

}

export default SectionTitle;