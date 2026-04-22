import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import './DraggableModal.less';

/**
 * 可拖动弹窗包装器，用于 antd Modal 的 modalRender
 * 通过拖拽 header 移动弹窗，双击 header 重置位置
 */
function DraggableModal({ children }) {
  const [bounds, setBounds] = useState({ left: 0, top: 0, bottom: 0, right: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const draggableRef = useRef(null);

  const onStart = (_event, uiData) => {
    const { clientWidth, clientHeight } = document.documentElement;
    const targetRect = draggableRef.current?.getBoundingClientRect();
    if (targetRect) {
      setBounds({
        left: -targetRect.left + uiData.x,
        right: clientWidth - (targetRect.right - uiData.x),
        top: -targetRect.top + uiData.y,
        bottom: clientHeight - (targetRect.bottom - uiData.y),
      });
    }
  };

  const onStop = (_event, uiData) => {
    setPosition({ x: uiData.x, y: uiData.y });
  };

  const onHeaderDoubleClick = () => {
    setPosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    const el = draggableRef.current;
    if (!el) return;
    const header = el.querySelector('.ant-modal-header');
    if (header) {
      header.addEventListener('dblclick', onHeaderDoubleClick);
      return () => header.removeEventListener('dblclick', onHeaderDoubleClick);
    }
  }, []);

  return (
    <Draggable
      handle=".ant-modal-header"
      bounds={bounds}
      onStart={onStart}
      onStop={onStop}
      position={position}
      defaultClassName="react-draggable-modal"
    >
      <div ref={draggableRef} className="draggable-modal-wrapper">
        {children}
      </div>
    </Draggable>
  );
}

export default DraggableModal;
