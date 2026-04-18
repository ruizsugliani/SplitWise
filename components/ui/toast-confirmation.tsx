"use client"

import { Check } from "lucide-react";

export default function ToastConfirm({toastMessage} : {toastMessage? : string}) {
    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-70 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-zinc-100 text-black px-6 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            {toastMessage}
          </div>
        </div>
    )
}