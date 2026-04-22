export default function FilterContent(props) {
    const { errorMsg, contentConfig, ...restProps } = props;

    const useConfig = !!contentConfig && !!contentConfig.component;
    
    const header = useConfig ? (contentConfig.header || '') : '';

    const ContentComponent = useConfig ? contentConfig.component : null;

    return (
        <div className="filter-content-row" onClick={e => e.stopPropagation()}>
            <div className="item-content-wrap">
                {!!header && <div key="header" className="header-wrap">{header}</div>}
                <div key="content" className="value-wrap">
                    {ContentComponent ? <ContentComponent {...restProps} /> : null}
                </div>
            </div>
            {errorMsg && <span className="errMsg">{errorMsg}</span>}
        </div>
    );
}
