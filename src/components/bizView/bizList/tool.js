function getPercentColumnWidth (field) {
	if (!!field?.fieldAttribute?.progressBarShow) {
		return 130;
	}
	return 110;
}

export function getShowFields(metaInfo) {
    const listLayout = metaInfo?.listLayout;
    const fieldList = metaInfo?.fieldList || [];
    if (!listLayout) {
        return [];
    }
    const toFieldInfoList = (fields) => {
        if (!Array.isArray(fields)) return [];
        return fields
            .map((name) => fieldList.find((i) => i?.name === name))
            .filter(Boolean);
    };
    const defaultFields = listLayout?.[0]?.defaultFields;
    if (Array.isArray(defaultFields)) {
        return toFieldInfoList(defaultFields);
    }
    if (typeof defaultFields === 'string') {
        try {
            const parsed = JSON.parse(defaultFields);
            return toFieldInfoList(parsed);
        } catch (e) {
            return [];
        }
    }
    return [];
}

const widthMap = [
    { type: ['File', 'Boolean'], width: 95 },
    { type: ['Select'], width: 115 },
    { type: ['Image'],  width: 286 },
    { type: 'Lookup', subType: ['Org'], width: 130 },
    { type: 'Lookup', subType: ['User'], width: 130 },
    { type: ['AutoCode'], width: 150 },
    { type: ['Lookup', 'MainDetail', 'SelfLookup'], width: 175 },
    { type: ['BizType'], width: 120 },
    { type: ['Integer', 'Real', 'Currency', 'Aggregation', 'TopAggregation'], width: 110 },
    { type: 'MultiLookup', subType: ['User'], width: 130 },
    { type: ['District'], width: 190 },
    { type: 'Time', width: 172 },
    { type: 'Date', width: 142 },
    { type: 'Expression', subType: ['Number', 'Currency'], width: 110 },
    { type: 'Expression', subType: ['Time'], width: 172 },
    { type: 'Expression', subType: ['Percent'], width: 110, customWidth: getPercentColumnWidth },
    { type: 'Expression', subType: ['Date'], width: 142 },
    { type: 'Expression', subType: ['Text'], width: 175 },
    { type: 'Text', subType: ['Text', 'Long'], width: 250 },
    { type: 'Text', subType: ['Email'], width: 190 },
    { type: 'Text', subType: ['Phone','Short'], width: 175 },
];

export default function getInitColumnWidthFun(field) {
    if (!field) return 110;

    let width = undefined;
    for (const config of widthMap) {
        const typeMatch = Array.isArray(config.type) ? config.type.includes(field.type) : config.type === field.type;
        if (!typeMatch) continue;
        if (config.subType && !config.subType.includes(field.subType)) continue;

        width = config.customWidth ? (config.customWidth(field) ?? config.width) : config.width;
        break;
    }

    return width || 110;
}
