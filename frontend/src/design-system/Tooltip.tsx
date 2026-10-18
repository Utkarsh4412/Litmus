import { ReactNode, useState } from "react";

type Props = {
  label: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
};

export default function Tooltip({ label, children, side = "top" }: Props) {
  const [show, setShow] = useState(false);

  const sideClasses: Record<string, string> = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
  };

  return (
    <div className="relative inline-flex items-center">
      <div
        onKeyDown={(event) => { if (event.key === "Escape") setShow(false); }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {show && (
        <div
          role="tooltip"
          className={`glass-l3 absolute z-30 px-2.5 py-1.5 rounded-2xl text-xs font-medium text-white whitespace-nowrap pointer-events-none ${sideClasses[side]}`}
        >
          {label}
        </div>
      )}
    </div>
  );
}
