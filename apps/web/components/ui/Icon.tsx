import type { SVGProps } from "react";

import { ICONS, type IconName } from "@/lib/icons.generated";

export function Icon({ name, ...props }: { name: string } & SVGProps<SVGSVGElement>) {
  const Component = ICONS[name as IconName] ?? ICONS.GiPerspectiveDiceSixFacesRandom;
  return <Component aria-hidden="true" focusable="false" {...props} />;
}
