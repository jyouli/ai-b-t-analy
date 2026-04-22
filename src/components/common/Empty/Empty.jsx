import { Empty as AntdEmpty } from 'antd';
import emptyImg from '../../../assets/img/empty.png';

const Empty = (props) => {
    const { description = '暂无数据', ...restProps } = props;

    return (
        <AntdEmpty
            image={emptyImg}
            description={description}
            {...restProps}
        />
    );
};

export default Empty;
