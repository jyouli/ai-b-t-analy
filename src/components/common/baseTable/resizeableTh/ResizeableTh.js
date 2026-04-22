import { t } from 'src/utils/i18n';
import { useRef } from 'react';
import './resizeableTh.less';


export default function ResizeableTh(props, tRef) {
    const { children, onResize, className, ...restPorps } = props;
    return (
        <th {...restPorps} className={`${className} cloud-th-resizeable`}>
            <div className='cloud-th-resizeable-content'>{children}</div>
            {(onResize && <ResizeBar tRef={tRef} handResize={onResize} />) || null}
        </th>
    );
}
function ResizeBar(props) {
    const barRef = useRef(null);
    const handleDragStart = event => {
        event.stopPropagation();
        event.preventDefault();
        document.documentElement.style.cursor = 'col-resize';
        const currentElement = barRef.current;
        handleDraging(currentElement, props.tRef, props.handResize);
    };
    return (
        <span className='cloud-th-resize-bar' ref={barRef} title={t('i18n_a28810cc296aca7a')} onMouseDown={handleDragStart}>
            <i></i>
        </span>
    );
}
function handleDraging(currentElement, tRef, handResize) {
    const { left, top } = currentElement.getBoundingClientRect();
    let marginBottom = 20;
    
    // 获取真正的 DOM 节点
    // 当 tRef 挂载在 antd Table 上时，它可能是一个组件实例，DOM 节点在 nativeElement 上
    const tableDomNode = tRef?.current?.nativeElement || tRef?.current;

    if (tableDomNode && typeof tableDomNode.getBoundingClientRect === 'function') {
        let windowHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        const rect = tableDomNode.getBoundingClientRect();
        const container = tableDomNode.querySelector?.('.ant-table-container');
        marginBottom = windowHeight - rect.top - (container ? container.offsetHeight : 0);
    }
    
    let line = document.createElement('div');
    line.className = 'cloud-th-resize-line';
    line.style.cssText = `
            position: fixed; 
            top: ${top}px; 
            bottom: ${marginBottom}px; 
            left: ${left + 2}px;
        `;
    document.body.appendChild(line);
    document.onmousemove = function (event) {
        event.preventDefault();
        line.style.left = event.clientX + 'px';
    };
    document.onmouseup = function (event) {
        const resultWidth = currentElement.parentNode.offsetWidth + event.clientX - left,
            addWidth = event.clientX - left;
        handResize && handResize(resultWidth, addWidth);
        event.preventDefault();
        line.remove();
        document.documentElement.style.cursor = '';
        document.onmousemove = null;
        document.onmouseup = null;
    };
}
