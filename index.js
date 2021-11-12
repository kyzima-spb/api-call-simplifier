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

    request(config) {
      return $axios.$request(config);
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

    list: apiCall(route, 'get', ctx => id => {
      const config = ctx.makeConfig();

      if (id) {
        config.route.params = id;
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
  }
  const allowedMethods = Object.keys(methods);

  if (actions) {
    actions = new Set(actions);
    actions = allowedMethods.filter(i => actions.has(i));
  } else {
    actions = allowedMethods;
  }

  return Object.fromEntries(
    Array.from(actions, method => [method, methods[method]])
  );
}


module.exports = $axios => ({
  apiCall: createApiCall($axios),
  repository: createRepository($axios),
});
