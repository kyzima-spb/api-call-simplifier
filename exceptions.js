class ApiError extends Error {
  constructor({ message, status, resp }) {
    super(resp.data.message || message);
    this.status = status || resp.status;
    this.resp = resp;
  }

  get detail() {
    // Возвращает дополнительную информацию об ошибке.
    return this.resp.data.detail;
  }

  get path() {
    // Возвращает URI запрошенного ресурса.
    return this.resp.data.path;
  }

  get timestamp() {
    // Возвращает серверное время, в которое возникла ошибка.
    let dt = this.resp.data.timestamp;
    if (dt) {
      return new Date(this.resp.data.timestamp);
    }
  }
}


class ValidationError extends Error {
  get errors() {
    // Возвращает массив ошибок валидации.
    return this.detail ? this.detail.errors : undefined;
  }
}


module.exports = { ApiError, ValidationError };
