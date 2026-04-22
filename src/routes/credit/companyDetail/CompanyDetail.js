import React, { useState } from 'react';
import { Tabs } from 'antd';
import CompanyBaseInfo from './CompanyBaseInfo';
import RelativeList from './RelativeList';
import './companyDetail.less';

function CompanyDetail(props) {
	const { currentCompany, metaInfo } = props;
	const [activeTab, setActiveTab] = useState('aibidCompanyQualification');

	const tabConfig = [
		{ key: 'aibidCompanyQualification', label: '公司资质' },
		{ key: 'aibidPerson', label: '人员信息' },
		{ key: 'aibidPersonCertificate', label: '人员证件' },
		{ key: 'aibidProjectPerformance', label: '项目业绩' },
		{ key: 'aibidFinancialCredit', label: '财务信誉' },
		{ key: 'CustomObject1', label: '测试' },
	];

	const tabItems = tabConfig.map(({ key, label }) => ({
		key,
		label,
		children: <RelativeList currentCompany={currentCompany} metaName={key} />,
	}));

	return (
		<div className="company-detail-container">
			<CompanyBaseInfo metaInfo={metaInfo} currentCompany={currentCompany} />
			<div className="company-relative-content">
				<Tabs 
					activeKey={activeTab} 
					onChange={setActiveTab}
					items={tabItems}
				/>
			</div>
		</div>
	);
}

export default CompanyDetail;
