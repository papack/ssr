declare global {
  namespace JSX {
    type Element = string | Promise<string>;
    interface IntrinsicElements {
      [tag: string]: any;
    }
  }
}
type Primitive = string | number | boolean | null | undefined;

type Child = Primitive | Child[] | Promise<Primitive | Child[]>;

export type Props = {
  [key: string]: any;
  children?: Child[];
};

export async function jsx(
  tag: string | ((props: any) => string | Promise<string>),
  props: Props | null,
  ...children: Child[]
): Promise<string> {
  if (typeof tag === "function") {
    return await tag({ ...(props ?? {}), children });
  }

  let html = `<${tag}`;

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === "children") continue;
      if (value == null || value === false) continue;

      if (value === true) {
        html += ` ${key}`;
      } else {
        html += ` ${key}="${String(value)}"`;
      }
    }
  }

  html += ">";

  for (const c of children) {
    html += await renderChild(c);
  }

  html += `</${tag}>`;

  return html;
}

async function renderChild(child: Child): Promise<string> {
  if (child == null || child === false || child === true) return "";

  if (child instanceof Promise) {
    return renderChild(await child);
  }

  if (Array.isArray(child)) {
    const parts = await Promise.all(child.map(renderChild));
    return parts.join("");
  }

  return String(child);
}
