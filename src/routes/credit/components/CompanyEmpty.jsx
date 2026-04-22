import { Button } from 'antd';
import EmptyContent from 'src/components/common/Empty/Empty';
import './companyEmpty.less';

export default function CompanyEmpty() {
    return (
        <div className="company-empty">
            <EmptyContent />
            <Button type="primary" style={{ marginTop: 24 }} size="large">
                创建企业
            </Button>
        </div>
    );
}
