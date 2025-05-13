declare module 'epub-gen' {
  interface EpubOptions {
    title: string;
    author: string;
    publisher?: string;
    cover?: string | Buffer;
    content: Array<{
      title: string;
      data: string;
      beforeToc?: boolean;
    }>;
    [key: string]: any;
  }

  class EPub {
    constructor(options: EpubOptions, output: string);
    on(event: 'end' | 'error', callback: (...args: any[]) => void): void;
    render(): void;
  }

  export default EPub;
}
