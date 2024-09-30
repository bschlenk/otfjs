declare module 'svgo' {
  export function optimize(
    svg: string,
    options: { path: string; multipass: boolean },
  ): { data: string }
}
