"use client";

import { track } from "@vercel/analytics";

/** Link real (funciona sin JS); el onClick solo mide y no frena la navegación. */
export default function JoinGroupLink({ href }: { href: string }) {
  return (
    <a href={href} rel="noopener" onClick={() => track("grupo_join_click")} className="brot-pill no-underline">
      Unirme al grupo
    </a>
  );
}
