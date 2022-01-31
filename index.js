const exceptions = require('./exceptions');
const exceptionsMap = new Map([
  [412, exceptions.PreconditionFailedError],
  [428, exceptions.PreconditionRequiredError],
  [422, exceptions.ValidationError],
]);


function makeItemRoute(collectionRoute, lookup) {
  // Возвращает маршрут с именем параметра, уникально идентифицирующим ресурс.
  collectionRoute = collectionRoute.replace(/\/$/, '');
  lookup = lookup || 'id';
  return `${collectionRoute}/<${lookup}>`;
}


function makeUrl(route, params) {
  // Возвращает URL, построенный из маршрута и параметров.
  if (typeof params !== 'object' && !Array.isArray(params)) {
    params = [params];
  }
  let currentIndex = 0;

  return route.replace(/<(\w+)>/g, (match, name) => {
    return Array.isArray(params) ? params[currentIndex++] : params[name]
  });
}


const createApiCall = $axios => (route, method, callback) => {
  /**
   * Возвращает функцию, которая вызывает один из методов API.
   *
   * route: маршрут, может содержать именованные параметры.
   * method: HTTP метод, используемый при вызове API, по-умолчанию GET.
   * callback: если указан, то должен вернуть функцию, упрощающую работу с API.
   *     Принимает в качестве аргумента объект контекста, который содеражщит:
   *     makeConfig() - создает и возвращает новый экземпляр конфигурации Axios.
   *     request(config) - выполняет HTTP запрос.
   */
  const context = {
    makeConfig() {
      return {
        method: method || 'get',
        params: {},
        data: {},
        route: {
          value: route,
          params: {},
        },

        get url() {
          return makeUrl(this.route.value, this.route.params);
        },
      };
    },

    async request(config) {
      try {
        return await $axios.request(config);
      } catch (err) {
        if (err.response) {
          const resp = err.response;
          const ExceptionClass = exceptionsMap.get(resp.status) || exceptions.ApiError;
          return Promise.reject(
            new ExceptionClass({message: err.message, resp})
          );
        }
        return Promise.reject(err);
      }
    },

    $request(config) {
      return this.request(config).then(resp => resp.data);
    },
  };

  if (callback) {
    return callback(context);
  }

  return () => context.request(context.makeConfig());
}


const createRepository = $axios => (route, {lookup, actions}={}) => {
  /**
   * Создает и возвращае объект для работы с ресурсами REST API.
   *
   * route: маршрут, может содержать именованные параметры.
   * config:
   *     lookup: имя/имена параметров, уникально идентифицирующих ресурс.
   *     actions: массив с именами разрешенных над ресурсом действий.
   *         По-умолчанию разрешены все действия.
   *         Доступные значения: create, delete, get, list, update.
   */
  const apiCall = createApiCall($axios);
  const itemRoute = makeItemRoute(route, lookup);
  const methods = {
    create: apiCall(route, 'post', ctx => (id, payload) => {
      const config = ctx.makeConfig();

      if (typeof payload === 'undefined') {
        config.data = id;
      } else {
        config.route.params = id;
        config.data = payload;
      }

      return ctx.request(config);
    }),

    delete: apiCall(route, 'delete', ctx => id => {
      const config = ctx.makeConfig();
      config.route.value = itemRoute;
      config.route.params = id;
      return ctx.request(config);
    }),

    get: apiCall(route, 'get', ctx => id => {
      const config = ctx.makeConfig();
      config.route.value = itemRoute;
      config.route.params = id;
      return ctx.request(config);
    }),

    list: apiCall(route, 'get', ctx => ({ id, params }={}) => {
      const config = ctx.makeConfig();

      if (id) {
        config.route.params = id;
      }

      if (params) {
        config.params = params;
      }

      return ctx.request(config);
    }),

    update: apiCall(route, 'put', ctx => (id, payload) => {
      const config = ctx.makeConfig();
      config.route.value = itemRoute;
      config.route.params = id;
      config.data = payload;
      return ctx.request(config);
    }),
  };

  actions = actions || Object.keys(methods);

  for (let [name, method] of Object.entries(methods)) {
    methods['$' + name] = (...args) => method(...args).then(resp => resp.data);
  }

  const allowedMethods = {};

  for (let name of actions) {
    if (name in methods) {
      allowedMethods[name] = methods[name];
      allowedMethods['$' + name] = methods['$' + name];
    }
  }

  return allowedMethods;
}


module.exports = $axios => ({
  apiCall: createApiCall($axios),
  repository: createRepository($axios),
});
