import React from 'react';
import "./Dots"
import Dots from "./Dots";

function WhileLoading(Component,Placeholder) {
    return function WhileLoadingComponent({ isLoading, ...props }) {
        if (!isLoading) return <Component {...props} />;

        return (
            <Placeholder>
                Hold on, fetching data <Dots/>
            </Placeholder>
        );
    };
}
export default WhileLoading;