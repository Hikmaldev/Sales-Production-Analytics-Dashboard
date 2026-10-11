import type { ReactNode } from "react";

interface PageHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  aside?: ReactNode;
}

export function PageHeading({
  eyebrow,
  title,
  description,
  aside,
}: PageHeadingProps) {
  return (
    <section className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p className="page-intro">{description}</p> : null}
      </div>
      {aside}
    </section>
  );
}
