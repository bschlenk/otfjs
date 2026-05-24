export type PrimitiveType =
  | 'u8' | 'i8' | 'u16' | 'i16' | 'u24' | 'u32' | 'i32' | 'i64'
  | 'f2dot14' | 'f16dot16' | 'tag' | 'Date'

export interface PrimitiveDef {
  kind: 'primitive'
  type: PrimitiveType
  doc?: string
}

export interface ReservedDef {
  kind: 'reserved'
  bytes: number
}

export interface FixedDef {
  kind: 'fixed'
  type: PrimitiveType
  value: number | bigint | string
}

export interface BytesDef {
  kind: 'bytes'
  count: number
  doc?: string
}

export interface FlagsDef {
  kind: 'flags'
  name: string
  type: PrimitiveType
  bits: Record<string, number>
}

export interface StructDef {
  kind: 'struct'
  name: string
  fields: Record<string, FieldDef>
}

export interface VersionedVariant {
  version: number
  struct: StructDef
}

export interface VersionedDef {
  kind: 'versioned'
  name: string
  versionType: PrimitiveType
  variants: VersionedVariant[]
}

export interface ArrayDef {
  kind: 'array'
  countField: string
  element: PrimitiveDef | FlagsDef | StructDef
}

export interface AdditiveTier {
  minVersion: number
  fields: Record<string, FieldDef>
}

export interface AdditiveDef {
  kind: 'additive'
  name: string
  versionType: PrimitiveType
  tiers: AdditiveTier[]
}

export type FieldDef = PrimitiveDef | ReservedDef | FixedDef | BytesDef | FlagsDef | StructDef | ArrayDef

function prim(type: PrimitiveType) {
  return (doc?: string): PrimitiveDef => ({ kind: 'primitive', type, doc })
}

export const s = {
  u8:       prim('u8'),
  i8:       prim('i8'),
  u16:      prim('u16'),
  i16:      prim('i16'),
  u24:      prim('u24'),
  u32:      prim('u32'),
  i32:      prim('i32'),
  i64:      prim('i64'),
  f2dot14:  prim('f2dot14'),
  f16dot16: prim('f16dot16'),
  tag:      prim('tag'),
  date:     prim('Date'),

  bytes(count: number, doc?: string): BytesDef {
    return { kind: 'bytes', count, doc }
  },

  reserved(bytes: number): ReservedDef {
    return { kind: 'reserved', bytes }
  },

  fixed(type: PrimitiveDef, value: number | bigint | string): FixedDef {
    return { kind: 'fixed', type: type.type, value }
  },

  struct(name: string, fields: Record<string, FieldDef>): StructDef {
    return { kind: 'struct', name, fields }
  },

  flags(name: string, type: PrimitiveDef, bits: Record<string, number>): FlagsDef {
    return { kind: 'flags', name, type: type.type, bits }
  },

  array(countField: string, element: PrimitiveDef | FlagsDef | StructDef): ArrayDef {
    return { kind: 'array', countField, element }
  },

  versioned(name: string, type: PrimitiveDef, variants: Record<number, StructDef>): VersionedDef {
    return {
      kind: 'versioned',
      name,
      versionType: type.type,
      variants: Object.entries(variants).map(([k, struct]) => ({
        version: Number(k),
        struct,
      })),
    }
  },

  additive(name: string, type: PrimitiveDef, tiers: Record<number, Record<string, FieldDef>>): AdditiveDef {
    return {
      kind: 'additive',
      name,
      versionType: type.type,
      tiers: Object.entries(tiers)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([minVersion, fields]) => ({ minVersion: Number(minVersion), fields })),
    }
  },
}
