
import { CloseOutlined } from '@ant-design/icons';

function BizListHeader(props) {
    const { selectedRowKeys, setSelectedRowKeys, batchDelete } = props;
    if(selectedRowKeys.length == 0) {
        return null;
    }
    return (
        <div className="biz-list-header">
            <span className="biz-list-header-select">
                已选中<span className="select-number">{selectedRowKeys.length}</span>项
                <CloseOutlined onClick={() => setSelectedRowKeys([])} />
            </span>
            <span className="biz-list-header-actions">
                <a onClick={() => batchDelete(selectedRowKeys)}>批量删除</a>
            </span>
        </div>
    );
}
export default BizListHeader;