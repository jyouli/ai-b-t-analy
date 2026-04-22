import React from 'react';
import { Button } from 'antd';

const AIBtn = ({ children, ...restProps }) => {

    return (
        <Button 
            type="primary" 
            {...restProps}
        >
            <i className="icon-aianniu1" />
            {children}
        </Button>
    );
};

export default AIBtn;