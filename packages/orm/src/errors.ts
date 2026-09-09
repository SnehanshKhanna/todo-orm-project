export class OrmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends OrmError {
  constructor(message: string) {
    super(message);
  }
}

export class NotFoundError extends OrmError {
  constructor(message: string) {
    super(message);
  }
}
