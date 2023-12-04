import { Entity, EntityProperties } from "../../../domain/entity";
import { EntityRepository } from "../../../domain/repository/entity.repository";

export class InMemoryEntityRepository implements EntityRepository {
  constructor(private readonly store: Record<string, Entity> = {}) {}

  private static objectIntersects<
    T extends Record<string, string | number | Date>,
    A extends Partial<T>
  >(src: T, against: A): boolean {
    for (const key of Object.keys(against)) {
      if (!src.hasOwnProperty(key) || src[key] !== against[key]) {
        return false;
      }
    }
    return true;
  }

  findFirstBy(criteria: Partial<EntityProperties>): Promise<Entity | null> {
    for (const key in this.store) {
      if (this.store.hasOwnProperty(key)) {
        const entity = this.store[key];
        if (
          InMemoryEntityRepository.objectIntersects(entity.properties, criteria)
        ) {
          return Promise.resolve(entity);
        }
      }
    }
    return Promise.resolve(null);
  }

  insert(entity: Entity): Promise<Entity> {
    this.store[entity.properties.id] = entity;
    return Promise.resolve(entity);
  }
}
