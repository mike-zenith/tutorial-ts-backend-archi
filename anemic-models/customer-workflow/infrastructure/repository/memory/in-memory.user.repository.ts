import { UserRepository } from "../../../domain/repository/user.repository";
import { User } from "../../../domain/user";
import { RecordNotFoundError } from "../../error/recordnotfound.error";

export class InMemoryUserRepository implements UserRepository {
  constructor(private readonly store: Record<string, User> = {}) {}

  getById(id: string): Promise<User> {
    if (this.store[id]) {
      return Promise.resolve(this.store[id]);
    }

    return Promise.reject(RecordNotFoundError.byCriteria("User", "id", id));
  }
}
