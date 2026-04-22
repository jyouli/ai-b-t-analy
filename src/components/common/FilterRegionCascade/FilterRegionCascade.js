import { useState, useEffect } from 'react';
import { connect } from 'dva';
import { Cascader } from 'antd';
import './FilterRegionCascade.less';

const FilterRegionCascade = props => {
    const { allTree, value, cascadeChange, dispatch } = props;
    const [options, setOptions] = useState([]);

    useEffect(() => {
        if (!!allTree?.length) {
            return;
        }
        dispatch({ type: 'provinceCityDistrict/fetchAreas' });
    }, []);

    useEffect(() => {
        const newOptions = allTree.map(province => {
            return {
                value: province.code,
                label: province.name,
                children: province[province.name].map(city => {
                    return {
                        value: city.code,
                        label: city.name,
                        children: (city[city.name] || []).map(district => {
                            return {
                                value: district.code,
                                label: district.name,
                            };
                        }),
                    };
                }),
            };
        });
        setOptions(newOptions);
    }, [allTree]);

    const filter = (inputValue, path) => {
        return path.some(option => option.label?.includes(inputValue));
    };

    const change = (value, selectedOptions) => {
        const label = (selectedOptions || []).reduce(function (pre, cur) {
            return (pre += cur.label);
        }, '');
        cascadeChange(value, label, selectedOptions);
    };

    return (
        <Cascader
            value={value.expression || []}
            showSearch={{ filter }}
            options={options}
            onChange={change}
            placeholder="请选择"
            style={{ width: '100%' }}
            changeOnSelect
            rootClassName='filter-region-cascade'
        />
    );
};

const mapStateToProps = state => ({
    allTree: state.provinceCityDistrict.allTree
});
export default connect(mapStateToProps)(FilterRegionCascade);
