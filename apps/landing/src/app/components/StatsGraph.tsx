import { motion } from "motion/react";

export function StatsGraph() {
  const bars = [
    { height: 40, label: "Manual" },
    { height: 35, label: "Search" },
    { height: 50, label: "Negotiate" },
    { height: 30, label: "Track" },
    { height: 45, label: "Verify" },
  ];

  return (
    <div className="mx-auto mb-16 max-w-md">
      <div className="border-2 border-black bg-white p-8">
        <div className="mb-6 text-center text-sm font-bold">
          TIME SPENT ON MANUAL TASKS
        </div>
        <div className="mb-4 flex h-32 items-end justify-between gap-3">
          {bars.map((bar, index) => (
            <div
              key={index}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <motion.div
                initial={{ height: 0 }}
                whileInView={{ height: `${bar.height}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="w-full bg-black"
              />
              <div className="text-xs font-bold">{bar.label}</div>
            </div>
          ))}
        </div>
        <div className="border-t-2 border-black pt-3 text-center">
          <div className="text-xs opacity-60">Hours wasted per campaign</div>
        </div>
      </div>
    </div>
  );
}
