const { ExceptionFactory } = require('./exceptions');


/**
 * Возвращает маршрут с именем параметра, уникально идентифицирующим ресурс.
 */
function makeItemRoute(collectionRoute, lookup) {
  collectionRoute = collectionRoute.replace(/\/$/, '');
  return lookup ? `${collectionRoute}/<${lookup}>` : collectionRoute;
}


/**
 * Возвращает URL, построенный из маршрута и параметров.
 */
function makeUrl(route, params) {
  if (typeof params !== 'object' && !Array.isArray(params)) {
    params = [params];
  }
  let currentIndex = 0;

  return route.replace(/<(\w+)>/g, (match, name) => {
    return Array.isArray(params) ? params[currentIndex++] : params[name]
  });
}


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
const createApiCall = $axios => (route, method, callback) => {
  const makeConfig = () => ({
    method: method || 'get',
    params: {},
    data: {},
    route: {value: route, params: {}},
    get url() {
      return makeUrl(this.route.value, this.route.params);
    },
  });

  const context = {
    makeConfig,
    request: $axios.request,
    $request(config) {
      return this.request(config).then(resp => resp.data);
    }
  };

  if (callback) {
    return callback(context);
  }

  return () => context.request(context.makeConfig());
}


/**
 * Создает и возвращае объект для работы с ресурсами REST API.
 *
 * route: маршрут, может содержать именованные параметры.
 * config:
 *   lookup: имя/имена параметров, уникально идентифицирующих ресурс.
 *   actions:
 *     массив с именами разрешенных над ресурсом действий.
 *     По-умолчанию разрешены все действия.
 *     Доступные значения: create, delete, get, list, update.
 */
const createResource = apiCall => (route, {lookup='id', actions}={}) => {
  const itemRoute = makeItemRoute(route, lookup);
  const prepareLookup = id => {
    if (!!lookup && !id) {
      throw new Error('Resource lookup is required argument.');
    }
    return id;
  };
  const methods = {
    create: apiCall(route, 'post', ctx => (id, payload) => {
      const config = ctx.makeConfig();

      if (id && payload) {
        config.route.params[lookup] = id;
        config.data = payload;
      } else {
        config.data = id;
      }

      return ctx.request(config);
    }),

    delete: apiCall(route, 'delete', ctx => id => {
      const config = ctx.makeConfig();
      config.route.value = itemRoute;
      config.route.params[lookup] = prepareLookup(id);
      return ctx.request(config);
    }),

    get: apiCall(route, 'get', ctx => id => {
      const config = ctx.makeConfig();
      config.route.value = itemRoute;
      config.route.params[lookup] = prepareLookup(id);
      return ctx.request(config);
    }),

    list: apiCall(route, 'get', ctx => ({ id, params }={}) => {
      const config = ctx.makeConfig();

      if (id) {
        config.route.params[lookup] = id;
      }

      if (params) {
        config.params = params;
      }

      return ctx.request(config);
    }),

    update: apiCall(route, 'put', ctx => (id, payload) => {
      const config = ctx.makeConfig();
      config.route.value = itemRoute;
      config.route.params[lookup] = prepareLookup(id);
      config.data = lookup ? payload : id;
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


function createErrorResponseInterceptor(
  instance,
  {
    cb,
    exceptionFactory=new ExceptionFactory(),
  }={}
) {
  instance.interceptors.response.use(
    response => response,
    err => {
      const response = err.response;

      if (response) {
        err = exceptionFactory.create(response.status, err);
      }

      return cb ? cb(err) : Promise.reject(err);
    }
  );
}


function main(
  $axios,
  {
    errorResponseInterceptor,
    exceptionFactory,
  }={}
) {
  createErrorResponseInterceptor($axios, {
    cb: errorResponseInterceptor,
    exceptionFactory,
  });

  const apiCall = createApiCall($axios);

  return {
    apiCall,
    resource: createResource(apiCall),
  };
}


module.exports = main;
