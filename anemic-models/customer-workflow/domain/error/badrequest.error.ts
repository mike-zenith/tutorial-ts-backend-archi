import { DomainError } from "./domain.error";

export class BadRequestError extends DomainError {
  private constructor(message: string) {
    super(message);
  }

  static whenValidatingRequest(): BadRequestError {
    return new BadRequestError("Bad request received");
  }

  static whenValidating(prop: string, reason: string): BadRequestError {
    return new BadRequestError(
      `Bad request received while validating "${prop}": ${reason}`
    );
  }
}
