import { useState } from 'react';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import ThrottledInput from 'src/components/common/ThrottledInput/ThrottledInput';
import EditBtn from 'src/components/bizView/newBizBtn/NewBizBtn';
import DelBizBtn from 'src/components/bizView/DelBizBtn';
import AiCreateBusinessBtn from 'src/components/bizView/newBizBtn/AiCreateBusinessBtn';
import './companyList.less';

function CompanyList(props) {
	const { companyList, currentCompany, onChange, metaInfo, refresh } = props;
	const [ searchText, setSearchText ] = useState('');

	// 过滤列表
	const filteredList = companyList.filter(item => 
		!searchText || item.name.toLowerCase().includes(searchText.toLowerCase())
	);

	return (
		<div className="company-list-container">
			<div className="company-list-header">
				<div className="company-list-header-actions">
					<AiCreateBusinessBtn metaInfo={metaInfo} refresh={refresh}>新建企业</AiCreateBusinessBtn>
					<EditBtn metaInfo={metaInfo} label="新建" />
				</div>
				<div className="company-search">
					<ThrottledInput 
						prefix={<i className="iconfont icon-sousuo ai-b-t-search-prefix-icon" aria-hidden />} 
						placeholder="搜索" 
						value={searchText}
						onChange={(val) => setSearchText(val)}
						allowClear
					/>
				</div>
			</div>
			<div className="company-list-content">
				{filteredList.map((item) => {
					const isActive = currentCompany?.code === item.code;
					return (
						<div 
							className={`company-item ${isActive ? 'active' : ''}`} 
							key={item.code}
							onClick={() => onChange(item)}
						>
							<div className="company-item-icon">{item.name.charAt(0)}</div>
							<div className="company-item-name" title={item.name}>{item.name}</div>	
							{isActive && (
								<div className="company-item-actions">
									<EditBtn metaInfo={metaInfo} record={item}>
										<EditOutlined className="action-icon" />
									</EditBtn>
									<DelBizBtn record={item} refresh={refresh}>
										<DeleteOutlined className="action-icon" />
									</DelBizBtn>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
export default CompanyList;
