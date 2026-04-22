import React, { forwardRef, useMemo } from 'react';
import { Select } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import './RequiredEchoSelect.less';

/**
 * 基于 antd Select：下拉项使用纯文本 label，不在列表中带星号；
 * 选中回显与占位符可自动追加红色必填星号（可关）。
 * 单选默认显示左侧对钩（antd 单选默认无对钩）；下拉项字重为常规。
 * 除 echoStar / placeholderStar / starClassName 外，其余 props 均透传至 Select。
 */
const RequiredEchoSelect = forwardRef(function RequiredEchoSelect(props, ref) {
  const {
    labelRender,
    placeholder,
    echoStar = true,
    placeholderStar = true,
    className,
    starClassName = 'required-echo-select__star',
    menuItemSelectedIcon = <CheckOutlined />,
    classNames: userClassNames,
    popupClassName,
    ...rest
  } = props;

  const mergedClassNames = useMemo(
    () => ({
      ...(userClassNames || {}),
      popup: {
        ...(userClassNames?.popup || {}),
        root: classNames(
          'required-echo-select__dropdown',
          userClassNames?.popup?.root,
          popupClassName
        ),
      },
    }),
    [userClassNames, popupClassName]
  );

  const mergedPlaceholder = useMemo(() => {
    if (placeholder == null) return undefined;
    if (!placeholderStar) return placeholder;
    return (
      <span>
        {placeholder}
        <span className={starClassName} aria-hidden>
          *
        </span>
      </span>
    );
  }, [placeholder, placeholderStar, starClassName]);

  const resolvedLabelRender = useMemo(() => {
    if (labelRender) return labelRender;
    if (!echoStar) return undefined;
    return ({ label }) => (
      <span>
        {label}
        <span className={starClassName} aria-hidden>
          *
        </span>
      </span>
    );
  }, [labelRender, echoStar, starClassName]);

  return (
    <Select
      ref={ref}
      className={classNames('required-echo-select', className)}
      {...rest}
      classNames={mergedClassNames}
      menuItemSelectedIcon={menuItemSelectedIcon}
      placeholder={mergedPlaceholder}
      labelRender={resolvedLabelRender}
    />
  );
});

RequiredEchoSelect.displayName = 'RequiredEchoSelect';

export default RequiredEchoSelect;
