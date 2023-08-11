class ApiError extends Error {
  constructor(axiosError) {
    super(axiosError.response.data.message ?? axiosError.toString());
    this.original = axiosError;
  }

  /**
   * Возвращает дополнительную информацию об ошибке.
   */
  get detail() {
    return this.response.data.detail;
  }

  get isApiError() {
    return true;
  }

  /**
   * Возвращает URI запрошенного ресурса.
   */
  get path() {
    return this.response.data.path;
  }

  /**
   * Возвращает объект ответа.
   */
  get response() {
    return this.original.response;
  }

  /**
   * Возвращает HTTP код ответа.
   */
  get status() {
    return this.response.status;
  }

  /**
   * Возвращает серверное время, в которое возникла ошибка.
   */
  get timestamp() {
    const dt = this.response.data.timestamp;
    return dt ? new Date(dt) : undefined;
  }
}


class PreconditionRequiredError extends ApiError {}
class PreconditionFailedError extends ApiError {}


class ValidationError extends ApiError {
  /**
   * Возвращает массив ошибок валидации.
   */
  get errors() {
    return this.detail ? this.detail.errors : [];
  }
}


class ExceptionFactory extends Map {
  constructor(entries) {
    super(entries ?? [
      [412, PreconditionFailedError],
      [428, PreconditionRequiredError],
      [422, ValidationError],
      ['default', ApiError],
    ]);
  }

  create(key, err) {
    const klass = this.get(key) ?? this.get('default');
    return new klass(err);
  }
}


module.exports = {
  ExceptionFactory,
  ApiError,
  PreconditionRequiredError,
  PreconditionFailedError,
  ValidationError,
};
