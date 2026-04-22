import { Checkbox, Button } from 'antd';
import BlankOpe from './BlankOpe';
import { ExtraOpeShowType, ExtraOpType, DirectlyExtraOp } from '../dic/consts';

/**
 * 筛选器底部组件
 * 包含清除筛选、确认筛选按钮以及空值/包含下级数据等选项
 */
const FilterFooter = ({
    config = {},
    showClear = true,
    clear,
    confirm,

    extraOp,
    changeExtraOpe,
    useExtraOpe,
    multiTabUuid,
}) => {
    const handleChangeExtraOpe = op => {
        if (op === '') {
            changeExtraOpe('clear');
        } else if (DirectlyExtraOp.includes(op)) {
            changeExtraOpe(op);
        } else {
            changeExtraOpe(op ? ExtraOpType.blank : '');
        }
    };
    return <>
        <div className='button-row'>
            <div className='button-row-left'>
                {config.searchIsNull && (useExtraOpe === true || useExtraOpe === 'only') && (
                    <Checkbox checked={extraOp === ExtraOpType.blank} onChange={e => handleChangeExtraOpe(e.target.checked)}>
                        <span>空白项</span>
                    </Checkbox>
                )}
                {config.searchIsNull && (useExtraOpe === true || useExtraOpe === 'onlyDirectly' || useExtraOpe === ExtraOpeShowType.Show) && (
                    <BlankOpe
                        multiTabUuid={multiTabUuid}
                        op={extraOp}
                        useExtraOpe={useExtraOpe}
                        onChange={handleChangeExtraOpe} />
                )}
            </div>
            <div>
                <Button className={`clear-filter ${showClear ? 'show' : ''}`} onClick={clear}>
                    清空条件
                </Button>
                <Button className='ok' type='primary' size='small' onClick={confirm}>
                    确定
                </Button>
            </div>
        </div>
    </>;
};

export default FilterFooter;
