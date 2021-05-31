import React, {Component} from 'react';
import "./Section.css";

class Section extends Component {
    constructor(props) {
        super(props);
        this.sectionID = props.section;
    }

    render() {
        return (
            <section
                id={this.sectionID}
                className="Section"
            >
                <div className="content">
                    {this.props.children}
                </div>
            </section>
        );
    }

}

export default Section;
