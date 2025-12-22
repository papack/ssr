import type { Props } from "./jsx";

export async function fragment(props: Props): Promise<string> {
  const { children } = props;

  if (!children) return "";

  const parts = await Promise.all(children);
  return parts.join("");
}
