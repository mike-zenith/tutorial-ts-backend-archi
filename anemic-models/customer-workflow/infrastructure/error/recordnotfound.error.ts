import { InfrastructureError } from "./infrastructure.error";

export class RecordNotFoundError extends InfrastructureError {
  private constructor(message: string, public readonly recordName: string) {
    super(message);
  }

  static byCriteria(recordName: string, prop: string, value: string) {
    return new RecordNotFoundError(
      `Record "${recordName}" not found with "${prop}": "${value}"`,
      recordName
    );
  }
}
