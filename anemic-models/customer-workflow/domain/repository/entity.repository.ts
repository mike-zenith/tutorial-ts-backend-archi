import { Entity, EntityProperties } from "../entity";

export interface EntityRepository {
  findFirstBy(criteria: Partial<EntityProperties>): Promise<Entity | null>;
  insert(entity: Entity): Promise<Entity>;
}
