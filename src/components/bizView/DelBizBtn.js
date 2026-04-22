import { useDvaDispatch } from 'src/hooks/useDva';
import { confirmModal } from 'src/components/common/Modal/confirmModal';

function DelBizBtn(props) {
    const { record, children, refresh } = props;
    const dispatch = useDvaDispatch();

    const deleteBizData = () => {
        confirmModal({
            title: "删除",
            content: `确认删除“${record.name}”吗？`,
            onOk: () => {
                dispatch({
                    type: 'common/deleteBizData',
                    payload: {
                        metaName: record.metaName,
                        code: record.code,
                    },
                    callback: () => {
                        setTimeout(() => refresh(), 500);
                    }
                })  
            }
        })
    }

    return (
        <span className="action-biz-delete" onClick={deleteBizData}>
            {children}
        </span>
    )
}
export default DelBizBtn;
