import katex from "katex";

interface TexProps {
  children: string;
  display?: boolean;
}

export function Tex({ children, display = false }: TexProps) {
  const html = katex.renderToString(children, {
    throwOnError: false,
    displayMode: display,
    output: "html",
  });
  if (!display) {
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <div className="tex-wrap my-2" dangerouslySetInnerHTML={{ __html: html }} />;
}
