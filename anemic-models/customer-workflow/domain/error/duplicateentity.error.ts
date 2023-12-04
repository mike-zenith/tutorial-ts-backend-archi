import { DomainError } from "./domain.error";

export class DuplicateEntity extends DomainError {
  private constructor(message: string) {
    super(message);
  }
  static fromEntity(entityName: string): DuplicateEntity {
    return new DuplicateEntity(`Duplicate record found: ${entityName}`);
  }
}
