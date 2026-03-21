import { BarChart3, TrendingUp, Users } from "lucide-react";
import { motion } from "motion/react";

export function DashboardMockup() {
  return (
    <div className="relative">
      <div className="border-2 border-black bg-white p-4 lg:p-3 xl:p-5">
        <div className="mb-3 border-b-2 border-black pb-3 xl:mb-4 xl:pb-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold">ACTIVE CAMPAIGNS</div>
            <div className="bg-black px-2 py-1 text-xs text-white">LIVE</div>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 xl:mb-4 xl:gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="border-2 border-black p-2 xl:p-3"
          >
            <TrendingUp className="mb-1 h-4 w-4 xl:h-5 xl:w-5" />
            <div className="text-xs opacity-60">Views</div>
            <div className="text-base font-bold xl:text-lg">2.4M</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="border-2 border-black p-2 xl:p-3"
          >
            <Users className="mb-1 h-4 w-4 xl:h-5 xl:w-5" />
            <div className="text-xs opacity-60">Subscribers</div>
            <div className="text-base font-bold xl:text-lg">+8.2K</div>
          </motion.div>
        </div>

        <div className="border-2 border-black bg-black/5 p-3 xl:p-4">
          <div className="flex h-16 items-end justify-between gap-1 xl:h-20">
            {[40, 65, 45, 80, 55, 90, 70].map((height, index) => (
              <motion.div
                key={index}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                className="flex-1 bg-black"
              />
            ))}
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute -top-4 -right-2 border-2 border-black bg-white px-3 py-2.5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] lg:-top-3 lg:-right-2 xl:-top-6 xl:-right-6 xl:px-4 xl:py-3"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          <span className="font-semibold">+234% ROI</span>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="absolute -bottom-4 -left-2 border-2 border-black bg-black px-3 py-2.5 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] lg:-bottom-3 lg:-left-2 xl:-bottom-6 xl:-left-6 xl:px-4 xl:py-3"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <span className="font-semibold">AI Powered</span>
        </div>
      </motion.div>
    </div>
  );
}
