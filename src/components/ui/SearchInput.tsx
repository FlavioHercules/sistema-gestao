import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string;
}

export function SearchInput({
  placeholder = "Buscar...",
  className = "",
  ...props
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
      />
      <input
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 text-sm text-[#172033] placeholder:text-[#64748B] transition-all focus:border-[#00469F] focus:outline-none focus:ring-2 focus:ring-[#00469F]/20"
        {...props}
      />
    </div>
  );
}
