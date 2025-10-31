"use client";

import { useState } from "react";

export default function NewProjectDialog({ clientId }: { clientId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <button
      className="prodify-button-primary gap-2 inline-flex items-center text-sm"
      onClick={() => setIsOpen(true)}
    >
      פרויקט חדש
    </button>
  );
}
