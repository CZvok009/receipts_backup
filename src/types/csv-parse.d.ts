declare module 'csv-parse' {
  export function parse(input: string | Buffer, options: any, callback: (err: unknown, output: unknown) => void): void;
}


