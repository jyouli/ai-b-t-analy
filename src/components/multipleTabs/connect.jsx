import React, { createContext, useContext } from 'react';
import { connect as dvaConnect } from 'dva';

export const MicroAppContext = React.createContext({});

export const connect = (mapStateToProps) => (WrappedComponent) => {
  const Connected = dvaConnect(mapStateToProps)(WrappedComponent);
  return (props) => {
    const context = useContext(MicroAppContext);
    const dispatch = props.dispatch || context.dispatch || (() => {});
    const history = props.history || context.masterHistory || context.history;
    return (
      <Connected
        {...props}
        dispatch={dispatch}
        history={history}
        multiTabUuid={props.multiTabUuid || context.name || 'ai-b-t-manage'}
      />
    );
  };
};
