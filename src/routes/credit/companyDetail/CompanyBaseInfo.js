import React, { useState, useEffect } from 'react';
import {  Spin } from 'antd';
import Image from 'src/components/common/Image/Image';
import { useDvaDispatch } from 'src/hooks/useDva';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import AiCreateBtn from 'src/components/bizView/newBizBtn/AiCreateBtn';
import renderValue from 'src/components/bizView/renderValue';
import BizDetail from 'src/components/bizView/bizDetail/BizDetail';

function CompanyBaseInfo({ metaInfo, currentCompany }) {

    const dispatch = useDvaDispatch();

    const [expanded, setExpanded] = useState(false);

    const [ loading, setLoading ] = useState(false);
    const [ bizDetail, setBizDetail ] = useState();

    const getBizDetail = () => {
        setLoading(true);
        dispatch({
            type: 'common/getBizDetail',
            payload: { 
                code: currentCompany.code,
                metaName: currentCompany.metaName,
            },
            callback: (detail) => {
                setBizDetail(detail);
                setLoading(false);
            }
        });
    }

    useEffect(() => {
        getBizDetail();
    }, [currentCompany]);

    const bizData = { ...currentCompany, ...(bizDetail || {}) };

    const registrationStatusField = metaInfo?.fieldList?.find(item => item.name === 'registrationStatus') || {};
    const businessLicense = bizData?.businessLicense?.[0];
    
    return (
        <Spin className="company-base-info" spinning={loading}>
            <div className="base-info-header">
                <div className="base-info-left">
                    <div className="company-logo">
                        <Image 
                            width={60} 
                            height={60} 
                            src={businessLicense.url}
                            alt={businessLicense.name}
                        />
                    </div>
                    <div className="company-title-wrap">
                        <div className="company-name">{currentCompany.name}</div>
                        <div className="company-tags">
                            {renderValue({ fieldInfo: registrationStatusField, value: bizData.registrationStatus })}
                        </div>
                    </div>
                </div>
                <div className="base-info-right">
                    <AiCreateBtn>AI录入公司资料</AiCreateBtn>
                </div>
            </div>
            <div className={expanded ? 'base-info-details' : 'base-info-details hidden'}>
                <BizDetail bizData={bizData} metaInfo={metaInfo}></BizDetail>
                <div className="expand-btn" onClick={() => setExpanded(!expanded)}>
                    {expanded ? <span>收起<UpOutlined /></span> : <span>展开<DownOutlined /></span>}
                </div>
            </div>
        </Spin>
    );
}

export default CompanyBaseInfo;
