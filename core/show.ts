type ShowProps = {
  when: boolean;
  children: any;
};

export async function Show(p: ShowProps): Promise<string> {
  if (p.when !== true) return "";
  if (!p.children || p.children.length === 0) return "";

  const parts = await Promise.all(p.children);
  return parts.join("");
}
