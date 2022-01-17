// const METHODS_SUPPORT_CACHING = ['GET', 'HEAD'];
const METHODS_NEED_ETAG = ['PUT', 'DELETE', 'PATCH'];


function findHeader(headers, name) {
  // Регистронезависимый поиск значения HTTP заголовка в указанном объекте.
  const key = Object.keys(headers).find(elem => {
    return elem.toLowerCase() === name;
  });
  return headers[key];
}


function makeUniqueKey(url, params) {
  // Используя URL и параметры запроса, возвращает однозначно идентифицирующую строку.
  return JSON.stringify([
    url,
    Object.entries(params).sort()
  ]);
}


const cacheVuexModule = {
  namespaced: true,

  state: {
    cache: {},
  },

  mutations: {
    save(state, { key, etag }) {
      state.cache[key] = etag;
    }
  },

  actions: {
    save({ commit }, payload) {
      // Adds or updates ETag by unique key.
      commit('save', payload);
    },
  },
};


export default {
  install(Vue, { store, $axios }) {
    if (!store) {
      throw new Error('You need provide Vuex store.');
    }

    if (!$axios) {
      throw new Error('You need provide $axios.');
    }

    store.registerModule('etag', cacheVuexModule);

    $axios.interceptors.request.use(config => {
      const method = config.method.toUpperCase();

      const getLatestEtag = () => {
        const cache = store.state.etag.cache;
        const key = makeUniqueKey(config.url, config.params);
        return key in cache ? cache[key] : undefined;
      };

      // if (METHODS_SUPPORT_CACHING.includes(method)) {
      //   if (!findHeader(config.headers, 'If-None-Match')) {
      //     const latestEtag = getLatestEtag();
      //     if (latestEtag) {
      //       config.headers['If-None-Match'] = latestEtag;
      //     }
      //   }
      // }

      if (METHODS_NEED_ETAG.includes(method)) {
        if (!findHeader(config.headers, 'If-Match')) {
          const latestEtag = getLatestEtag();
          if (latestEtag) {
            config.headers['If-Match'] = latestEtag;
          }
        }
      }

      return config;
    });

    $axios.interceptors.response.use(resp => {
      const etag = findHeader(resp.headers, 'etag');

      if (etag) {
        const key = makeUniqueKey(resp.config.url, resp.config.params);
        store.dispatch('etag/save', {key, etag});
      }

      return resp;
    });
  },
};
