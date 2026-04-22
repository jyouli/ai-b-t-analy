import * as common from '../services/commom';

export default {
    namespace: 'provinceCityDistrict',
    state: {
        allTree: [],
    },
    effects: {
        *fetchAreas(_, { call, put }) {
            const { data } = yield call(common.fetchAreas, JSON.stringify({}));
            if (data) {
                yield window.put(arguments[0].multiTabUuid, put,{ type: 'setAllTree', payload: data.all });
            }
        },
    },
    reducers: {
        setAllTree(state, { payload }) {
            return { ...state, allTree: payload };
        },
    }
};
