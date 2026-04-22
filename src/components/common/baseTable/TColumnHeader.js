import { Dropdown } from 'antd';
import TheaderFilter from '../tHeaderFilter/TheaderFilter';
import { getSortMap } from './tableUtils';
import { createTheaderMenu } from '../TheaderMenu/TheaderMenu';

const TitleUnit = (fieldInfo) => {
    const unit = fieldInfo?.fieldAttribute?.unit;
    if (unit) {
        return `(${unit})`;
    }
    return '';
};

const isShowUnit = (fieldInfo) => {
    const { type, subType } = fieldInfo;
    if(type == 'Percent' || subType == 'Percent') {
        return false;
    }
     return ['Integer', 'Currency', 'Real', 'Aggregation', 'Expression'].includes(type) && subType !== 'Text';
}

const canSort = ({ type }) => {
    return !['MultiSelect', 'File', 'Image', 'DynamicLookup'].includes(type);
}

export default function ColumnHeader(props) {
    /**
     * 兼容空 label/titleUnit：当未传入时，自动根据 fieldInfo.label 与单位规则补齐，
     * 并将补齐后的值写回 props，确保上游读取 column.title?.props 能获取到 label/titleUnit。
     */
    const {
        label, 
        titleUnit, 
        fieldInfo,
        hasTHeaderFilter = true,
        sorts = [],
        setSorts,
        canToggleFixed = false,
        isPinnedLeft = false,
        onToggleFixed,
    } = props;

    const finalLabel = label ?? fieldInfo?.label ?? '';
    const finalUnit = titleUnit ?? (isShowUnit(fieldInfo) ? TitleUnit(fieldInfo) : '');

    const text = `${finalLabel}${finalUnit}`;

    

    const handleChange = (key) => {
        switch (key) {
            case 'ascend':
                setSorts([{ field: fieldInfo.name, orderType: 1 }]);
                break;
            case 'descend':
                setSorts([{ field: fieldInfo.name, orderType: 0 }]);
                break;
            case 'pinLeft':
                onToggleFixed?.({ fieldName: fieldInfo.name, pinned: true });
                break;
            case 'unpinLeft':
                onToggleFixed?.({ fieldName: fieldInfo.name, pinned: false });
                break;
        }
    }

    const fixedItems = (() => {
        if (!canToggleFixed) return [];
        if (isPinnedLeft) {
            return [{
                key: 'unpinLeft',
                text: '取消锁定',
                selected: false,
                leftIcon: <i className="icon-gudingdaozuoce" style={{ transform: 'rotate(180deg)' }} />,
            }];
        }
        return [{
            key: 'pinLeft',
            text: '锁定到左侧',
            selected: false,
            leftIcon: <i className="icon-gudingdaozuoce" />,
        }];
    })();

    const currentSort = Array.isArray(sorts) ? sorts.find((s) => s?.field === fieldInfo?.name) : undefined;
    const selectedSortKey = currentSort ? (Number(currentSort.orderType) === 1 ? 'ascend' : 'descend') : '';

    const sortItems = canSort(fieldInfo) ? [{
        key: 'ascend',
        text: getSortMap(fieldInfo).ascend,
        selected: selectedSortKey === 'ascend',
        leftIcon: <i className="icon-zhengxu" />,
    }, {
        key: 'descend',
        text: getSortMap(fieldInfo).descend,
        selected: selectedSortKey === 'descend',
        leftIcon: <i className="icon-daoxu" />,
    }] : [];

    const items = fixedItems.length > 0
        ? [...sortItems, ...(sortItems.length > 0 ? [{ type: 'divider' }] : []), ...fixedItems]
        : sortItems;

    const menu = createTheaderMenu({
        items,
        onClick: ({ key }) => handleChange(key),
    });

    return (
        <span className="base-table-column-header">
            <Dropdown
                trigger='click'
                placement='bottomLeft'
                classNames={{ root: 'base-table-column-dropdown' }}
                menu={menu}
            >
                <span className={`title-column-text${items.length > 0 ? ' is-clickable' : ''}`} title={text}>
                    {text}
                </span>
            </Dropdown>
            {hasTHeaderFilter && <TheaderFilter { ...props } />}
        </span>
    );
}
