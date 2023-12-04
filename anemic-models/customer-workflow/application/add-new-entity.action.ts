import { BadRequestError } from "../domain/error/badrequest.error";
import { DomainError } from "../domain/error/domain.error";
import { InMemoryEntityRepository } from "../infrastructure/repository/memory/in-memory.entity.repository";
import { InMemoryUserRepository } from "../infrastructure/repository/memory/in-memory.user.repository";
import { AddNewEntity } from "../use-cases/add-new-entity";

// this is a dummy validator
export function validate(request: Request): object {
  try {
    const body = JSON.parse(request.body);
    return body;
  } catch (e) {
    throw BadRequestError.whenValidatingRequest();
  }
}

export async function AddNewEntityAction(
  req: Request,
  res: Response
): Promise<void> {
  // validate request inputs
  // call use-case
  // catch errors
  // build and send response

  try {
    const validRequest = validate(request);
    const useCase = new AddNewEntity(
      new InMemoryUserRepository(),
      new InMemoryEntityRepository()
    );

    const savedEntity = await useCase.onRequest({
      entityName: validRequest.name,
      entityPurpose: validRequest.purpose,
      requestedByUserId: validRequest.userId,
    });
    res.status(201).send({ id: savedEntity.properties.id });
  } catch (e) {
    if (e instanceof DomainError) {
      res.status(400).send({ message: e.message });
      return;
    }
    res.status(500).send();
  }
}
