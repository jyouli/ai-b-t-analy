import { useCallback, useEffect, useState } from 'react';
import { connect } from 'dva';
import { useSearchParams } from 'react-router-dom';
import SpinSkeleton from 'src/components/common/SpinSkeleton/SpinSkeleton';
import CompanyEmpty from './components/CompanyEmpty';
import CompanyList from './companyList/CompanyList';
import CompanyInfo from './companyDetail/CompanyDetail';

function CreditContent(props) {

    const { dispatch } = props;
    const [searchParams] = useSearchParams();

    const [ companyList, setCompanyList ] = useState([]);
    const [ currentCompany, setCurrentCompany ] = useState(null);

    const [ metaInfo, setMetaInfo ] = useState(null);

	const [ loading, setLoading ] = useState(false);

    const getMetaInfo = () => {
		dispatch({
			type: 'common/getMetaAllDetail',
			payload: { metaName: 'aibidCompany' },
			callback: (data) => {
				setMetaInfo(data);
			}
		})
	}

	const getCompanyList = useCallback(() => {
		setLoading(true);
		const codeFromUrl = searchParams.get('companyCode');
		dispatch({
			type: 'common/getBizList',
			payload: {
				meta: { metaName: 'aibidCompany' },
				page: { pageNo: 1, pageSize: codeFromUrl ? 100 : 10 },
				sorts: [{ field: 'createdOn', order: 0 }]
			},
			callback: (records, totalCount) => {
				setLoading(false);
				setCompanyList(records);
				if (totalCount > 0) {
					const match = codeFromUrl
						? records.find((r) => String(r.code) === String(codeFromUrl))
						: null;
					setCurrentCompany(match || records[0]);
				}
			}
		})
	}, [dispatch, searchParams]);

	useEffect(() => {
		getMetaInfo();
	}, []);

	useEffect(() => {
		getCompanyList();
	}, [getCompanyList]);

    if (!metaInfo || loading) {
        return <SpinSkeleton size="large" style={{ height: '100%' }} />;
    }

    if(companyList.length == 0) {
        return <CompanyEmpty />;
    }
    return (
        <div className="credit-content">
            <CompanyList 
                companyList={companyList} 
                currentCompany={currentCompany}
                onChange={(item) => setCurrentCompany(item)}
                metaInfo={metaInfo}
                refresh={getCompanyList}
            />
            {!!currentCompany && <CompanyInfo metaInfo={metaInfo} currentCompany={currentCompany} />}
        </div>
    );

}

const mapStateToProps = state => ({
    loading: state.loading.effects['common/getBizList'],
});
export default connect(mapStateToProps)(CreditContent);
