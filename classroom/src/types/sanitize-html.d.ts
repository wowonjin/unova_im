declare module "sanitize-html" {
  type Attributes = Record<string, string | string[]>;

  export type IOptions = {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    allowedStyles?: Record<string, Record<string, Array<RegExp | string>>>;
    allowedSchemes?: string[];
    allowedSchemesByTag?: Record<string, string[]>;
    allowProtocolRelative?: boolean;
    transformTags?: Record<
      string,
      | string
      | ((tagName: string, attribs: Attributes) => { tagName: string; attribs?: Attributes; text?: string })
    >;
  };

  export default function sanitizeHtml(dirty: string, options?: IOptions): string;
}


