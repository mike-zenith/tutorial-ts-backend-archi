import { EmailService } from "../domain/email/email.service";
import { Entity } from "../domain/entity";
import { BadRequestError } from "../domain/error/badrequest.error";
import { DuplicateEntity } from "../domain/error/duplicateentity.error";
import { EntityRepository } from "../domain/repository/entity.repository";
import { UserRepository } from "../domain/repository/user.repository";
import { RecordNotFoundError } from "../infrastructure/error/recordnotfound.error";

export type AddNewEntityRequest = {
  requestedByUserId: string;
  entityName: string;
  entityPurpose: string;
};

export class AddNewEntity {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly entityRepository: EntityRepository
  ) {}

  async onRequest(request: AddNewEntityRequest): Promise<Entity> {
    try {
      // start transaction

      const OwnerUser = await this.userRepository.getById(
        request.requestedByUserId
      );
      if (!OwnerUser.active) {
        // this could be something more specific
        throw BadRequestError.whenValidating(
          "requestedByUserId",
          "User is inactive"
        );
      }
      const existingEntity = await this.entityRepository.findFirstBy({
        name: request.entityName,
        ownerUserId: OwnerUser.id,
      });

      if (existingEntity != null) {
        throw DuplicateEntity.fromEntity(existingEntity.constructor.name);
      }

      const entity = await this.entityRepository.insert(
        new Entity({
          createdAt: new Date(),
          id: "uuidhere",
          name: request.entityName,
          purpose: request.entityPurpose,
          ownerUserId: OwnerUser.id,
        })
      );
      // commit transaction
      return entity;
    } catch (e) {
      // rollback
      if (e instanceof RecordNotFoundError) {
        throw BadRequestError.whenValidating(e.recordName, "Not found");
      }
      throw e;
    }
  }
}
