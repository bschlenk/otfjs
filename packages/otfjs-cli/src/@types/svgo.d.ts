declare module 'svgo' {
  export function optimize(
    svg: string,
    options: { path: string; multipass: boolean; plugins: any[] },
  ): { data: string }
}
