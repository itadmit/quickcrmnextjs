"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

export default function NewClientDialog({ companyId }: { companyId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <button
      className="prodify-button-primary gap-2 inline-flex items-center"
      onClick={() => setIsOpen(true)}
    >
      <Plus className="w-5 h-5" />
      לקוח חדש
    </button>
  );
}

