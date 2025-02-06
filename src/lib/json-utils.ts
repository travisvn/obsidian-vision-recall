export function customStringify(
  value: unknown,
  formatted: boolean = false
): string {
  return JSON.stringify(
    value,
    (_, val) => {
      if (val instanceof Set) {
        return { __type: 'Set', values: [...val] }
      }
      if (val instanceof Map) {
        return { __type: 'Map', entries: [...val.entries()] }
      }
      return val
    },
    formatted ? 2 : 0 // Indent with 2 spaces if formatted is true
  )
}

export function customParse(data: unknown): unknown {
  if (typeof data === 'string') {
    return JSON.parse(data, (_, val) => {
      if (val && typeof val === 'object') {
        if (val.__type === 'Set') {
          return new Set(val.values);
        }
        if (val.__type === 'Map') {
          return new Map(val.entries);
        }
      }
      return val;
    });
  }
  return data; // Return as-is if already an object
}

