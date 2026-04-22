import { Form, Input } from 'antd';

function FieldItem(props) {
    const { disabled = false, item, required = false } = props;
    return (
        <Form.Item disabled={disabled} required={required} colon={false} key={item.name} name={item.name} label={item.label}>
            <Input />
        </Form.Item>
    );
}

export default FieldItem;