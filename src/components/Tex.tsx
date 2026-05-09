import katex from "katex";

interface TexProps {
  children: string;
  display?: boolean;
  wrap?: boolean;
}

export function Tex({ children, display = false, wrap = false }: TexProps) {
  const html = katex.renderToString(children, {
    throwOnError: false,
    displayMode: display,
    output: "html",
  });
  if (!display) {
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  }
  const cls = wrap
    ? "tex-wrap my-2"
    : "my-2 overflow-x-auto";
  return <div className={cls} dangerouslySetInnerHTML={{ __html: html }} />;
}
