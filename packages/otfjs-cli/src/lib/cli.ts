export function eat(args: string[], opt: string, orElse: string): string {
  let positionalArgCount = 0

  for (let i = 0; i < opt.length; ++i) {
    if (args[i] === opt) {
      return args.splice(i, 2)[1]
    }

    if (args[i].startsWith('-')) {
      positionalArgCount = 0
    } else if (++positionalArgCount == 2) {
      break
    }
  }

  return orElse
}
