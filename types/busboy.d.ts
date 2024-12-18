declare module 'busboy' {
  import { Readable } from 'stream';

  export interface BusboyConfig {
    headers: { [key: string]: string };
    highWaterMark?: number;
    fileHwm?: number;
    defCharset?: string;
    preservePath?: boolean;
    limits?: {
      fieldNameSize?: number;
      fieldSize?: number;
      fields?: number;
      fileSize?: number;
      files?: number;
      parts?: number;
      headerPairs?: number;
    };
  }

  export interface Busboy extends Readable {
    on(
      event: 'file',
      listener: (
        fieldname: string,
        file: NodeJS.ReadableStream,
        filename: string,
        encoding: string,
        mimetype: string
      ) => void
    ): this;
    on(event: 'field', listener: (fieldname: string, val: string) => void): this;
    on(event: 'finish', listener: () => void): this;
    on(event: 'close', listener: () => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
    end(buffer?: Buffer): void; // Add this line to include the `end()` method
  }

  export default function Busboy(config: BusboyConfig): Busboy;
}
