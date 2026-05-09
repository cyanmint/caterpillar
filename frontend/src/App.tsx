import { useEffect, useState } from "react";
import { MedicationsView } from "./features/pills/MedicationsView";
import { ScheduleView } from "./features/schedule/ScheduleView";
import { PetView } from "./features/pet/PetView";
import { InventoryView } from "./features/inventory/InventoryView";
import { useMedStore } from "./stores/useMedStore";
import { usePetStore } from "./stores/usePetStore";

type TabId = "schedule" | "pills" | "inventory" | "pet";

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: "schedule", label: "Schedule", icon: "📅" },
  { id: "pills", label: "Pills", icon: "💊" },
  { id: "inventory", label: "Inventory", icon: "📦" },
  { id: "pet", label: "Pet", icon: "🐛" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("schedule");
  const loadAll = useMedStore((s) => s.loadAll);
  const loadTodayLogs = useMedStore((s) => s.loadTodayLogs);
  const loadPet = usePetStore((s) => s.loadPet);

  useEffect(() => {
    void loadAll();
    void loadTodayLogs();
    void loadPet();
  }, [loadAll, loadTodayLogs, loadPet]);

  return (
    <div className="min-h-dvh bg-slate-100 flex flex-col">
      {/* Main content area — scrollable, leaves room for tab bar */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === "schedule" && <ScheduleView />}
        {activeTab === "pills" && <MedicationsView />}
        {activeTab === "inventory" && <InventoryView />}
        {activeTab === "pet" && <PetView />}
      </div>

      {/* Fixed bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "text-slate-900 bg-slate-100"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
