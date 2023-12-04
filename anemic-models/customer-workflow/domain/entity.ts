export type EntityProperties = {
  id: string;
  ownerUserId: string;
  name: string;
  purpose: string;
  createdAt: Date;
};

export class Entity {
  // this could be done in multiple ways, without context, anything could be good enough
  constructor(public readonly properties: EntityProperties) {}
}
