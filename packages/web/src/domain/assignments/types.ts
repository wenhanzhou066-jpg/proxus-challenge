export interface Material {
  readonly id: string;
  readonly name: string;
  readonly sizeBytes: number;
  readonly addedAt: string;
  readonly dataUrl: string;
  readonly tags: ReadonlyArray<string>;
}

export interface Assignment {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly createdAt: string;
  readonly materials: ReadonlyArray<Material>;
}
