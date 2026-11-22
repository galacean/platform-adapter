type Package = {
  [key: string]: any,
  name: string,
  version: string,
  main?: string,
  browser?: string,
  umd?: string
}

export default Package;
