import React from "react";
import {connect} from "react-redux";
import {mapAllStateToProps} from "../../redux/reducers/rootReducer";
import "./SocketStatusWidget.css";
import {Fade, Tooltip} from "react-bootstrap";
const {Component} = require("react");

class SocketStatusWidget extends Component{

    render() {
        return(
            <Tooltip title={this.props.socketStatus.name} id='socket_widget'>
                <div className={`SocketStatus `+this.props.className} style={{'background-color':this.props.socketStatus.color}}/>
            </Tooltip>
        );
    }
}

export default connect(mapAllStateToProps)(SocketStatusWidget);