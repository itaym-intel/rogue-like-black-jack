import type { ReactNode } from "react";
import "./Table.css";

interface TableProps {
  children: ReactNode;
}

export function Table({ children }: TableProps) {
  return (
    <div className="table">
      <div className="table__felt">{children}</div>
    </div>
  );
}
