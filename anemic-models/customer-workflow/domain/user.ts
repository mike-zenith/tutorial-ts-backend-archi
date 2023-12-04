export class User {
  // this could be done in multiple ways, without context, anything could be good enough
  public constructor(
    public readonly id: string,
    public readonly active: boolean
  ) {}
}
