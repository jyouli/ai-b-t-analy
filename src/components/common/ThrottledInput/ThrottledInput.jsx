import React, { useState, useEffect, useRef, forwardRef, useCallback } from 'react';
import { Input } from 'antd';

/**
 * 带节流控制的输入框组件
 * @param {Object} props - 组件属性
 * @param {any} props.value - 输入框值
 * @param {Function} props.onChange - 值变化回调函数(节流)
 * @param {number} props.throttleMs - 节流间隔，默认500ms
 */
const ThrottledInput = forwardRef(({ value, onChange, throttleMs = 500, ...props }, ref) => {
  const [internalValue, setInternalValue] = useState(value ?? '');
  const throttledOnChangeRef = useRef(null);
  const lastArgsRef = useRef(null);
  const timerRef = useRef(null);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setInternalValue(value ?? '');
  }, [value]);

  useEffect(() => {
    throttledOnChangeRef.current = (newValue) => {
      lastArgsRef.current = newValue;
      if (timerRef.current) return;
      timerRef.current = setTimeout(() => {
        onChangeRef.current?.(lastArgsRef.current);
        timerRef.current = null;
      }, throttleMs);
    };

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [throttleMs]);

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    throttledOnChangeRef.current?.(newValue);
  }, []);

  const handleBlur = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      onChangeRef.current?.(lastArgsRef.current);
    }
  }, []);

  return (
    <Input
      {...props}
      ref={ref}
      value={internalValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
});

ThrottledInput.displayName = 'ThrottledInput';

export default ThrottledInput;
